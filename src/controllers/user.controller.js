import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
    decrypt,
    generateEncryptedVarifyLink,
    sendEmailWithVarifyLink,
} from "../utils/auth.js";
import dayjs from "dayjs";

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, userName, email, password } = req.body;
    try {
        if (
            [fullName, userName, email, password].some(
                (field) => field.trim() === ""
            )
        ) {
            throw new ApiError(400, "any field cannot be empty");
        }

        const existedUser = await User.findOne({
            $or: [{ userName }, { email }],
        });

        if (existedUser && existedUser.isVarified) {
            throw new ApiError(
                409,
                "Username or Email has already exist please login"
            );
        }
        if (!req.files?.avatar) {
            throw new ApiError(422, "Avatar is required");
        }
        const avatarLocalPath = req.files?.avatar[0]?.path;
        let coverImageLocalPath;

        if (
            req.files &&
            Array.isArray(req.files.coverImage) &&
            req.files.coverImage.length > 0
        ) {
            coverImageLocalPath = req.files?.coverImage[0]?.path;
        }

        if (!avatarLocalPath) {
            throw new ApiError(422, "Avatar is required");
        }
        const avatar = await uploadOnCloudinary(avatarLocalPath, "/avatars");
        const coverImage = await uploadOnCloudinary(
            coverImageLocalPath,
            "/coverImages"
        );

        if (!avatar) {
            throw new ApiError(422, "Failed to upload image");
        }

        if (existedUser && !existedUser.isVarified) {
            try {
                // const hashedPassword = await bcrypt.hash(password, 10);
                const user = await User.findOneAndUpdate(
                    { _id: existedUser._id },
                    {
                        $set: {
                            fullName,
                            avatar: avatar.url,
                            coverImage: coverImage
                                ? coverImage.url
                                : existedUser.coverImage,
                            password,
                        },
                    },
                    { new: true }
                ).select("-password -refreshtoken");
                if (!user) {
                    throw new ApiError(400, "User not found");
                }
                if (user) {
                    const token = await generateEncryptedVarifyLink(user);
                    const link = `${process.env.BASE_URL_FOR_WEB}/verify/${token.iv}/${token.encryptedData}`;
                    sendEmailWithVarifyLink(
                        user.email,
                        link,
                        "Click the following link to complete your registration",
                        "Registration Confirmation"
                    );
                } else {
                    return { success: false, message: "Error in sending mail" };
                }
                return res
                    .status(201)
                    .json(
                        new ApiResponse(
                            201,
                            "User registered successfully please varify the user by clicking link from mail.",
                            user
                        )
                    );
            } catch (error) {
                throw new ApiError(500, "existingUser registration failed");
            }
        }
        const user = await User.create({
            userName: userName.toLowerCase(),
            fullName,
            email: email.toLowerCase(),
            password,
            avatar: avatar.url,
            coverImage: coverImage ? coverImage.url : "",
        });

        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        if (!createdUser) {
            throw new ApiError(500, "User registration failed");
        }
        if (createdUser) {
            const token = await generateEncryptedVarifyLink(createdUser);
            const link = `${process.env.BASE_URL_FOR_WEB}/verify/${token.iv}/${token.encryptedData}`;
            sendEmailWithVarifyLink(
                createdUser.email,
                link,
                "Click the following link to complete your registration",
                "Registration Confirmation"
            );
        } else {
            return { success: false, message: "Error in sending mail" };
        }
        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    "User registered successfully",
                    createdUser
                )
            );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Somehing went wrong while registering user"
        );
    }
});

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); //  To bypass the token validation on every request

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Somehing went wrong while creating tokens");
    }
};

const loginUser = asyncHandler(async (req, res) => {
    // req ->  username or email and password
    // validate data
    // username or email
    // find user
    // check password
    // access and refresh token
    // send cookie
    // send response

    const { userName, password, email } = req.body;
    try {
        if (!(userName || email)) {
            throw new ApiError(400, "any field can not be empty");
        }

        const user = await User.findOne({
            $or: [{ email }, { userName }],
        });

        if (!user) {
            throw new ApiError(401, "User does not exist");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid password");
        }

        if (!user.isVarified) {
            throw new ApiError(401, "Please verify your account before login.");
        }
        // create tokens
        const { accessToken, refreshToken } =
            await generateAccessAndRefreshToken(user._id);

        const loggedInUser = await User.findById(user._id).select(
            "-password -refreshToken"
        );

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user: loggedInUser,
                        accessToken,
                        refreshToken,
                    },
                    "Logged in successfully."
                )
            );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Somehing went wrong while login user"
        );
    }
});

const logoutUser = asyncHandler(async (req, res) => {
    try {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unsets: {
                    refreshToken: 1,
                },
            },
            { new: true }
        );

        const options = {
            httpOnly: true,
            secure: true,
        };
        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(new ApiResponse(200, null, "Logged out successfully."));
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Somehing went wrong while logout user"
        );
    }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies.refreshToken || req.body.token;
    if (!incomingToken) {
        throw new ApiError(401, "Not authenticated.");
    }

    try {
        const decodedToken = await jwt.verify(
            incomingToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "The user does not exist anymore.");
        }

        if (incomingToken !== user.refreshToken) {
            throw new ApiError(401, "Invalid token or token is expired.");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access token refreshed sucessfull."
                )
            );
    } catch (error) {
        throw new ApiError(401, error?._message || "Something went wrong");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = await req.body;
    try {
        const user = await User.findById(req.user?._id);
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

        if (!isPasswordCorrect) {
            throw new ApiError(401, "Old password is incorrect.");
        }
        user.password = newPassword;
        await user.save({ validateBeforeSave: false });

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {},
                    "Your current password has been changed successfully."
                )
            );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const getCurrentUser = asyncHandler(async (req, res) => {
    try {
        return res
            .status(200)
            .json(
                new ApiResponse(200, req.user, "current user fetch sucessfully")
            );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, userName } = req.body;
    try {
        const avatarLocalPath = req.files?.avatar && req.files?.avatar[0]?.path;
        const coverImageLocalPath =
            req.files?.coverImage && req.files?.coverImage[0]?.path;
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        const isUserNameExist = await User.find({ userName });
        if (isUserNameExist.length > 0) {
            throw new ApiError(
                400,
                "User name is already taken please try something else."
            );
        }
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName,
                    userName,
                    avatar: avatar ? avatar.url : req.user.avatar,
                    coverImage: coverImage
                        ? coverImage.url
                        : req.user.coverImage,
                },
            },
            { new: true } //return the new updated user object
        ).select("-password -refreshToken");
        if (!user) {
            throw new ApiError(404, "No user found with this id.");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    user,
                    "User account details have been updated!"
                )
            );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    try {
        if (!username?.trim()) {
            throw new ApiError(400, "Username is required!");
        }

        const chennal = await User.aggregate([
            {
                $match: {
                    userName: username?.toLowerCase(),
                },
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers",
                },
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo",
                },
            },
            {
                $addFields: {
                    subscriberCount: {
                        $size: "$subscribers",
                    },
                    channelSubscribedToCount: {
                        $size: "$subscribedTo",
                    },
                    isSubscribed: {
                        $cond: {
                            if: {
                                $in: [req.user._id, "$subscribers.subscriber"],
                            },
                            then: true,
                            else: false,
                        },
                    },
                },
            },
            {
                $project: {
                    fullName: 1,
                    userName: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscriberCount: 1,
                    channelSubscribedToCount: 1,
                    isSubscribed: 1,
                },
            },
        ]);

        if (!chennal?.length) {
            throw new ApiError(400, "Channel not found");
        }
        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    chennal[0],
                    "Successfully fetched the Channel"
                )
            );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
    try {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req?.user?._id),
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            username: 1,
                                            fullName: 1,
                                            avatar: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner",
                                },
                            },
                        },
                    ],
                },
            },
        ]);
        if (!user) {
            throw new ApiError(402, "User not found");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    user[0].watchHistory,
                    "Successfully fetched the user's watch history"
                )
            );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const varifyUser = asyncHandler(async (req, res) => {
    const iv = req.params.iv;
    const encryptedData = req.params.token;
    const token = {
        iv,
        encryptedData,
    };
    let decryptedContent = await decrypt(token);
    let data = JSON.parse(decryptedContent);
    const diffInMinutes = dayjs().diff(data.expireIn, "minute");
    if (data.id && diffInMinutes <= process.env.LINK_EXPIRE_TIME) {
        try {
            const user = await User.findById(data.id);
            if (user) {
                user.isVarified = true;
                await user.save();
                return res
                    .status(200)
                    .json(
                        new ApiResponse(
                            200,
                            {},
                            "Successfully verified the user"
                        )
                    );
            }
            if (!user) {
                throw new ApiError(404, "User not found");
            }
        } catch (error) {
            throw new ApiError(
                error.status || 500,
                error.message || "Varification failed"
            );
        }
    }
});

const getVarificationLink = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "Email is required!");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(400, "User not found!");
    }
    if (user) {
        const token = await generateEncryptedVarifyLink(user);
        const link = `${process.env.BASE_URL_FOR_WEB}/verify/${token.iv}/${token.encryptedData}`;
        sendEmailWithVarifyLink(
            user.email,
            link,
            "Click the following link to complete your registration",
            "Registration Confirmation"
        );
    } else {
        throw new ApiError(400, "Failed to send email!");
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Verification link has been sent to your email"
            )
        );
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "Email is required!");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(400, "User not found!");
    }
    if (user) {
        const token = await generateEncryptedVarifyLink(user);
        const link = `${process.env.BASE_URL_FOR_WEB}/reset-password/${token.iv}/${token.encryptedData}`;
        sendEmailWithVarifyLink(
            user.email,
            link,
            "Click the following link to reset your password",
            "Password Reset"
        );
    } else {
        throw new ApiError(400, "Failed to send email!");
    }
    return res.status(200).json({
        status: 200,
        message: "Password reset link has been sent to your email",
    });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { password, confirmPassword } = req.body;
    const { iv, encryptedData } = req.params;
    if (!password) {
        throw new ApiError(400, "Password is required!");
    }
    if (!password === confirmPassword) {
        throw new ApiError(400, "Passwords do not match!");
    }
    const token = {
        iv,
        encryptedData,
    };
    let decryptedContent = await decrypt(token);
    let data = JSON.parse(decryptedContent);
    const diffInMinutes = dayjs().diff(data.expireIn, "minute");
    if (data.id && diffInMinutes <= process.env.LINK_EXPIRE_TIME) {
        try {
            const user = await User.findOneAndUpdate(
                { _id: data.id },
                { $set: { password } },
                { new: true }
            );
            if (!user) {
                throw new ApiError(404, "User not found");
            }

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        user,
                        "Successfully reset the password"
                    )
                );
        } catch (error) {
            throw new ApiError(
                error.status || 500,
                error.message || "Password reset failed"
            );
        }
    }
});
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateProfile,
    getUserChannelProfile,
    getUserWatchHistory,
    varifyUser,
    getVarificationLink,
    resetPassword,
    forgotPassword,
};
