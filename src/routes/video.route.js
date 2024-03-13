import { Router } from "express";
import {
    addVideoToWatchHistory,
    deleteVideo,
    getAllPublicVideos,
    getAllVideos,
    getVideoById,
    publishAVideo,
    removeVideoFromWatchHistory,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js";
import { varifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.route("/all-video").get(getAllPublicVideos);
router.use(varifyJwt); // Apply varifyJwt middleware to all routes in this file

router.route("/").post(
    varifyJwt,
    upload.fields([
        {
            name: "video",
            maxCount: 1,
        },
        {
            name: "thumbnail",
            maxCount: 1,
        },
    ]),
    publishAVideo
);
router.route("/v/:videoId").get(getVideoById);
router
    .route("/update-video/:videoId")
    .patch(upload.single("thumbnail"), updateVideo);
router.route("/delete-video/:videoId").delete(deleteVideo);
router.route("/toggle-video/:videoId").post(togglePublishStatus);
router.route("/getVideo").post(getAllVideos);
router.route("/history/:videoId").post(addVideoToWatchHistory);
router.route("/history/:videoId").delete(removeVideoFromWatchHistory);
export default router;
