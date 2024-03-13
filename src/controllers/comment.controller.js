import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    try {
        if (!videoId) {
            throw new ApiError(400, "Please provide a videoId");
        }
        const videoFound = await Video.findById(videoId);
        if (!videoFound) {
            throw new ApiError(400, "Video not found");
        }
        const comments = await Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
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
                $addFields: {
                    owner: {
                        $first: "$owner",
                    },
                },
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "likes",
                },
            },
        ]);
        if (!comments) {
            throw new ApiError(400, "failed to get comments");
        }
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    comments,
                    `Successfully fetched ${comments.length} comments`
                )
            );
    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Server error"
        );
    }
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    try {
        if (!videoId) {
            throw new ApiError(400, "please provide videoId");
        }
        const { comment } = req.body;
        if (!comment) {
            throw new ApiError(400, "please provide comment");
        }
        const newComment = await Comment.create({
            video: videoId,
            content: comment,
            owner: req.user?._id,
        });
        if (!newComment) {
            throw new ApiError(400, "failed to add comment");
        }
        return res
            .status(201)
            .json(
                new ApiResponse(201, newComment, "comment added successfully")
            );
    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Server error"
        );
    }
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    try {
        if (!commentId) {
            throw new ApiError(400, "please provide commentId");
        }
        const { comment } = req.body;
        if (!comment) {
            throw new ApiError(400, "please provide comment");
        }
        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            { content: comment },
            { new: true }
        );
        if (!updatedComment) {
            throw new ApiError(400, "failed to update comment");
        }
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedComment,
                    "comment updated successfully"
                )
            );
    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Server error"
        );
    }
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comments
    const { commentId } = req.params;
    try {
        if (!commentId) {
            throw new ApiError(400, "please provide commentId");
        }
        const deletedComment = await Comment.findByIdAndDelete(commentId);
        if (!deletedComment) {
            throw new ApiError(400, "failed to delete comment");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "comment deleted successfully"));
    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Server error"
        );
    }
});

export { getVideoComments, addComment, updateComment, deleteComment };
