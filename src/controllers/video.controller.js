import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { paginate } from "../utils/paginate.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination

    if (!userId) {
        throw new ApiError(400, "please provide userId");
    }

    const pipline = [];
    if (userId) {
        await User.findById(userId);
        pipline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        });
    }
    if (query) {
        pipline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                ],
            },
        });
    }
    const sortTypeValue = sortType === "desc" ? -1 : 1;
    if (sortBy) {
        pipline.push({
            $sort: {
                [sortBy]: sortTypeValue,
            },
        });
    }

    const videos = await Video.aggregate(pipline);
    const paginatedVideos = await paginate(page, limit, videos);
    return res
        .status(200)
        .json(
            new ApiResponse(200, paginatedVideos, "Videos fetched successfully")
        );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video
    if ([title, description].some((field) => field.trim() === "")) {
        throw new ApiError(400, "Any field can not be empty");
    }
    const videoLocalPath = req.files?.video[0].path;
    if (!videoLocalPath) {
        throw new ApiError(400, "Please provide a video");
    }
    const thumbnailLocalPath = req.files?.thumbnail[0].path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Please provide a thumbnail");
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail upload failed");
    }
    const video = await uploadOnCloudinary(videoLocalPath);
    if (!video) {
        throw new ApiError(400, "Video upload failed");
    }
    const newVideo = await Video.create({
        title,
        description,
        videoFile: video.url,
        thumbnail: thumbnail.url,
        views: 0,
        duration: video.duration,
        isPublished: false,
        owner: req.user._id,
    });
    if (!newVideo) {
        throw new ApiError(400, "Video creation failed");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, newVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id
    if (!videoId?.trim()) {
        throw new ApiError(400, "Please provide a videoId");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, video, "Successfully fetched the video"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const thumbnailLocalPath = req.file?.path;
    //TODO: update video details like title, description, thumbnail
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!videoId) {
        throw new ApiError(400, "Please provide a videoId");
    }
    const { title, description } = req.body;
    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: thumbnail?.url,
            },
        },
        { new: true }
    );
    if (!video) {
        throw new ApiError(400, "Video not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, video, "Successfully updated the video"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video
    if (!videoId?.trim()) {
        throw new ApiError(400, "Please provide a videoId");
    }

    const deleteVideo = await Video.findById(videoId);

    if (
        !deleteVideo ||
        !(deleteVideo.owner.toString() === req?.user?._id.toString())
    ) {
        throw new ApiError(400, "Video not found");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId, { new: true });

    if (!deletedVideo) {
        throw new ApiError(400, "Video deletion failed");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: toggle publish status
    if (!videoId?.trim()) {
        throw new ApiError(400, "Please provide a videoId");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video not found");
    }
    if (video.isPublished) {
        video.isPublished = false;
    } else {
        video.isPublished = true;
    }
    const updatedVideo = await video.save();
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedVideo,
                "Video publish status toggled successfully"
            )
        );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
