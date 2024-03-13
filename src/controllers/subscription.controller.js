import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // TODO: toggle subscription
    try {
        if (!channelId) {
            throw new ApiError(400, "Please provide a channelId");
        }
        const channel = await User.findById({ _id: channelId });
        if (!channel) {
            throw new ApiError(400, "Channel not found");
        }
        const alreadySubscribed = await Subscription.find({
            channel: channelId,
            subscriber: req.user._id,
        });
        if (alreadySubscribed.length > 0 && alreadySubscribed) {
            await Subscription.findOneAndDelete(alreadySubscribed, {
                new: true,
            });
            return res
                .status(200)
                .json(new ApiResponse(200, null, "Unsubscribed"));
        }
        const subscription = await Subscription.create({
            channel: channelId,
            subscriber: req.user._id,
        });
        if (!subscription) {
            throw new ApiError(500, "Unable to subscribe");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, subscription, "Subscribed"));
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    try {
        if (!channelId) {
            throw new ApiError(400, "Please provide a channelId");
        }
        const channel = await User.findById({ _id: channelId });
        if (!channel) {
            throw new ApiError(400, "Channel not found");
        }
        const subscribers = await Subscription.find({
            channel: channelId,
        });
        return res
            .status(200)
            .json(new ApiResponse(200, subscribers, "Subscribers"));
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    try {
        if (!subscriberId) {
            throw new ApiError(400, "Please provide a subscriberId");
        }
        const subscriber = await User.findById({ _id: subscriberId });
        if (!subscriber) {
            throw new ApiError(400, "Subscriber not found");
        }
        const subscribedChannels = await Subscription.find({
            subscriber: subscriberId,
        });
        return res
            .status(200)
            .json(
                new ApiResponse(200, subscribedChannels, "Subscribed Channels")
            );
    } catch (error) {
        throw new ApiError(
            error.status || 500,
            error.message || "Something went wrong"
        );
    }
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
