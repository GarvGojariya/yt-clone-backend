import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, userName, email, password } = req.body;
    if (
        [fullName, userName, email, password].some(
            (field) => field.trim() === ""
        )
    ) {
        throw new ApiError("any field cannot be empty", 400);
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
        throw new ApiError("Avatar is required", 422);
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError("Failed to upload image", 422);
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
        throw new ApiError("User registration failed", 500);
    }

    return res
        .status(201)
        .json(
            new ApiResponse(true, "User registered successfully", createdUser)
        );
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
        throw new ApiError("Somehing went wrong while creating tokens", 500);
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
    if (!(userName || email)) {
        throw new ApiError("Invalid credentials", 400);
    }

    const user = await User.findOne({
        $or: [{ email }, { userName }],
    });

    if (!user) {
        throw new ApiError("User does not exist", 401);
    }

    const isPasswordValid = user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError("Invalid  password", 401);
    }

    // create tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

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
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
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
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingToken = req.cookies.refreshToken || req.body.token;
    if (!incomingToken) {
        throw new ApiError(401, "Not authenticated.");
    }

    try {
        const decodedToken = jwt.verify(
            incomingToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = User.findById(decodedToken?._id);

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
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "current user fetch sucessfully"));
});

const updateProfile = asyncHandler(async (req, res) => {
    const { email, fullName } = req.body;

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
});
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateProfile
};
