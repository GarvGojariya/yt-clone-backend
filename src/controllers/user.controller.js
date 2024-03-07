import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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
        $or: [{ userName }, { email }]
    });

    if (existedUser) {
        throw new ApiError(
            "Username or Email has already exist please login",
            409
        );
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
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

export { registerUser };
