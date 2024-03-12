import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;
    if (!content) {
        throw new ApiError(400, "Please provide a content");
    }
    const tweet = await Tweet.create({
        content,
        owner: req.user._id,
    });
    if (!tweet) {
        throw new ApiError(400, "Tweet not created");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params;
    if (!userId?.trim()) {
        throw new ApiError(400, "Please provide a userId");
    }
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
    ]);
    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets retrieved successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { tweetId } = req.params;
    if (!tweetId?.trim()) {
        throw new ApiError(400, "Please provide a tweetId");
    }
    const { content } = req.body;
    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        {
            new: true,
        }
    );
    if (!tweet) {
        throw new ApiError(400, "Tweet not found or updated");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;
    if (!tweetId?.trim()) {
        throw new ApiError(400, "Please provide a tweetId");
    }
    const tweet = await Tweet.findByIdAndDelete(tweetId);
    if (!tweet) {
        throw new ApiError(400, "Tweet not deleted");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
