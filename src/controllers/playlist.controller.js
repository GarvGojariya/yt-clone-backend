import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req?.body;
    //TODO: create user playlists
    try {
        if (!name && !description) {
            throw new ApiError(400, "Please provide a name and description");
        }
        const playlist = await Playlist.create({
            name,
            description,
            owner: req.user._id,
        });
        res.status(201).json(
            new ApiResponse(201, playlist, "Playlist created successfully")
        );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    //TODO: get user playlists
    try {
        if (!userId) {
            throw new ApiError(400, "Please provide a userId");
        }
        const playlists = await Playlist.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                },
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                title: 1,
                                description: 1,
                                thumbnail: 1,
                                videoFile: 1,
                            },
                        },
                    ],
                },
            },
        ]);
        if (!playlists) {
            throw new ApiError(404, "No playlists found");
        }
        res.status(200).json(
            new ApiResponse(200, playlists, "Playlists retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    //TODO: get playlist by id
    try {
        if (!playlistId) {
            throw new ApiError(400, "Please provide a playlistId");
        }
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        res.status(200).json(
            new ApiResponse(200, playlist, "Playlist retrieved successfully")
        );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    // TODO: add video to playlist
    try {
        if (!playlistId) {
            throw new ApiError(400, "Please provide a playlistId");
        }
        if (!videoId) {
            throw new ApiError(400, "Please provide a videoId");
        }
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        if (!(playlist.owner.toString() === req.user?._id.toString())) {
            throw new ApiError(
                400,
                "user has to login by his id of for removing vedio from playlist"
            );
        }
        const isVideoInPlaylist = await playlist.videos.includes(videoId);
        if (isVideoInPlaylist) {
            throw new ApiError(400, "Video already in playlist");
        }
        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(404, "Video not found");
        }
        playlist.videos.push(video);
        await playlist.save();
        res.status(200).json(
            new ApiResponse(
                200,
                playlist,
                "Video added to playlist successfully"
            )
        );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    // TODO: remove video from playlist
    try {
        if (!playlistId) {
            throw new ApiError(400, "Please provide a playlistId");
        }
        if (!videoId) {
            throw new ApiError(400, "Please provide a videoId");
        }
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        if (!(playlist.owner.toString() === req.user?._id.toString())) {
            throw new ApiError(
                400,
                "user has to login by his id of for removing vedio from playlist"
            );
        }
        const isVideoInPlaylist = await playlist.videos.includes(videoId);
        if (!isVideoInPlaylist) {
            throw new ApiError(400, "Video not in playlist");
        }
        const video = await Video.findById(videoId);
        if (!video) {
            throw new ApiError(404, "Video not found");
        }
        playlist.videos.pull(video);
        await playlist.save();
        res.status(200).json(
            new ApiResponse(
                200,
                playlist,
                "Video removed from playlist successfully"
            )
        );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    // TODO: delete playlist
    try {
        if (!playlistId) {
            throw new ApiError(400, "Please provide a playlistId");
        }
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        if (!(playlist.owner.toString() === req.user?._id.toString())) {
            throw new ApiError(
                400,
                "user has to login by his id of for removing vedio from playlist"
            );
        }
        await Playlist.findByIdAndDelete(playlistId);
        res.status(200).json(
            new ApiResponse(200, null, "Playlist deleted successfully")
        );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    //TODO: update playlist
    try {
        if (!playlistId) {
            throw new ApiError(400, "Please provide a playlistId");
        }
        if (!(name || description)) {
            throw new ApiError(400, "Please provide a name and description");
        }
        const playlist = await Playlist.findById(playlistId);
        if (!playlist) {
            throw new ApiError(404, "Playlist not found");
        }
        if (!(playlist.owner.toString() === req.user?._id.toString())) {
            throw new ApiError(
                400,
                "user has to login by his id of for removing vedio from playlist"
            );
        }
        if (name) {
            playlist.name = name;
        }
        if (description) {
            playlist.description = description;
        }
        await playlist.save();
        res.status(200).json(
            new ApiResponse(200, playlist, "Playlist updated successfully")
        );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
