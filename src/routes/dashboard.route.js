import { Router } from "express";
import {
    getChannelStats,
    getChannelVideos,
} from "../controllers/dashboard.controller.js";
import { varifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(varifyJwt); // Apply varifyJwt middleware to all routes in this file

router.route("/states").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;
