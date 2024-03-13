import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const states = {};
    const videoDetails = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "totalVideos",
            },
        },
        {
            $addFields: {
                totalVideos: "$totalVideos",
            },
        },
        {
            $unwind: "$totalVideos",
        },
        {
            $group: {
                _id: "$_id",
                totalVideos: { $sum: 1 },
                totalViews: {
                    $sum: "$totalVideos.views",
                },
            },
        },
        {
            $project: {
                _id: 1,
                totalVideos: 1,
                totalViews: 1,
            },
        },
    ]);
    if (!(videoDetails || videoDetails.length > 0)) {
        states["videodetails"] = 0;
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscribers",
        },
        {
            $group: {
                _id: "$channel",
                totalSubscribers: {
                    $sum: 1,
                },
            },
        },
    ]);
    if (!(subscribers || subscribers.length > 0)) {
        states["subscribers"] = 0;
    }

    const likes = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "totalvideolikes",
            },
        },
        {
            $group: {
                _id: "$owner",
                totalLikes: {
                    $sum: 1,
                },
            },
        },
    ]);
    if (!(likes || likes.length > 0)) {
        states["likes"] = 0;
    }
    states["totalVideos"] = videoDetails;
    states["totalSubscribers"] = subscribers;
    states["totalLikes"] = likes;
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                states,
                "Successfully fetched the channel stats"
            )
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const videos = await Video.find({
        owner: req.user?._id,
    });
    if (!(videos || videos.length > 0)) {
        throw new ApiError(400, "Videos not found or no published videos");
    }
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videos,
                `Successfully fetched ${videos.length} videos`
            )
        );
});

export { getChannelStats, getChannelVideos };
