import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

        if (existedUser) {
            throw new ApiError(
                "Username or Email has already exist please login",
                409
            );
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
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if (!avatar) {
            throw new ApiError(422, "Failed to upload image");
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
    //  check password
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

        const isPasswordValid = user.isPasswordCorrect(password);

        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid  password");
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
    const { email, fullName } = req.body;

    try {
        if (!(fullName || email)) {
            throw new ApiError(
                400,
                "Please provide at least one field to be updated."
            );
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    email,
                    fullName,
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

const updateAvatarImage = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    try {
        if (!avatarLocalPath) {
            throw new ApiError(400, "No image provided!");
        }
        const avatar = await uploadOnCloudinary(avatarLocalPath);
        if (!avatar.url) {
            throw new ApiError(400, "Failed to save Image on Cloudinary");
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            { $set: { avatar: avatar.url } },
            { new: true }
        ).select("-password");

        return res
            .status(200)
            .json(new ApiResponse(200, user, "Avatar has been updated!"));
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    try {
        if (!coverImageLocalPath) {
            throw new ApiError(400, "No image provided!");
        }
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        if (!coverImage.url) {
            throw new ApiError(400, "Failed to save Image on Cloudinary");
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            { $set: { coverImage: coverImage.url } },
            { new: true }
        ).select("-password");

        return res
            .status(200)
            .json(new ApiResponse(200, user, "Cover Image has been updated!"));
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
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateProfile,
    updateAvatarImage,
    updateCoverImage,
    getUserChannelProfile,
    getUserWatchHistory,
};
