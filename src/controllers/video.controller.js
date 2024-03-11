import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination
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
    //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
