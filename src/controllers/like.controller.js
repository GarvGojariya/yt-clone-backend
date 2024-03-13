import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Comment } from "../models/comment.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: toggle like on video
    if (!videoId) {
        throw new ApiError(400, "Please provide a videoId");
    }
    const video = await Video.findById(videoId);
    if (!(video || video.isPublished)) {
        throw new ApiError(400, "Video not found");
    }
    const alreadyLiked = await Like.find({
        video: videoId,
        likedBy: req.user._id,
    });
    if (alreadyLiked.length > 0 && alreadyLiked) {
        await Like.findOneAndDelete(alreadyLiked, { new: true });
        return res
            .status(200)
            .json(new ApiResponse(200, alreadyLiked, "Disliked"));
    }
    const like = await Like.create({
        video: videoId,
        likedBy: req.user._id,
    });
    if (!like) {
        throw new ApiError(500, "Unable to like video");
    }
    return res.status(200).json(new ApiResponse(200, like, "Liked"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    //TODO: toggle like on comments
    if (!commentId) {
        throw new ApiError(400, "Please provide a commentId");
    }
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(400, "Comment not found");
    }
    const alreadyLiked = await Like.find({
        comment: commentId,
        likedBy: req.user._id,
    });
    if (alreadyLiked.length > 0 && alreadyLiked) {
        await Like.findOneAndDelete(alreadyLiked, { new: true });
        return res.status(200).json(new ApiResponse(200, null, "Disliked"));
    }
    const like = await Like.create({
        comment: commentId,
        likedBy: req.user._id,
    });
    if (!like) {
        throw new ApiError(500, "Unable to like comment");
    }
    return res.status(200).json(new ApiResponse(200, like, "Liked"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    //TODO: toggle like on tweets
    if (!tweetId) {
        throw new ApiError(400, "Please provide a tweetId");
    }
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(400, "Tweet not found");
    }
    const alreadyLiked = await Like.find({
        tweet: tweetId,
        likedBy: req.user._id,
    });
    if (alreadyLiked.length > 0 && alreadyLiked) {
        await Like.findOneAndDelete(alreadyLiked, { new: true });
        return res.status(200).json(new ApiResponse(200, null, "Disliked"));
    }
    const like = await Like.create({
        tweet: tweetId,
        likedBy: req.user._id,
    });
    if (!like) {
        throw new ApiError(500, "Unable to like tweet");
    }
    return res.status(200).json(new ApiResponse(200, like, "Liked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likevideos",
            },
        },
        {
            $unwind: "$likevideos",
        },
        {
            $project: {
                _id: 1,
                likevideos: 1,
                likedBy: 1,
            },
        },
    ]);
    if (!likedVideos) {
        throw new ApiError(500, "Unable to get liked videos");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "Liked Videos"));
});

const getLikedTweets = asyncHandler(async (req, res) => {
    //TODO: get all liked tweets
    const likedTweets = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "tweets",
                localField: "tweet",
                foreignField: "_id",
                as: "liketweets",
            },
        },
        {
            $unwind: "$liketweets",
        },
        {
            $project: {
                _id: 1,
                liketweets: 1,
                likedBy: 1,
            },
        },
    ]);
    if (!likedTweets) {
        throw new ApiError(500, "Unable to get liked tweets");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, likedTweets, "Liked Tweets"));
});

const getVideoLikeCount = asyncHandler(async (req, res) => {
    // TODO: Count likes of video
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Please provide a videoId");
    }
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(400, "Video not found");
    }
    const likeCount = await Like.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $group: {
                _id: "$video",
                likeCount: { $sum: 1 },
            },
        },
    ]);
    if (!likeCount) {
        throw new ApiError(500, "Unable to get video like count");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, likeCount, "Video Like Count"));
});
export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getLikedTweets,
    getVideoLikeCount,
};
