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
    uploadLargeVideo,
} from "../controllers/video.controller.js";
import { varifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.route("/all-video").get(getAllPublicVideos);
router.route("/v/upload").post(upload.single("video"), uploadLargeVideo);
// router.use(varifyJwt); // Apply varifyJwt middleware to all routes in this file

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
router.route("/v/:videoId").get(varifyJwt,getVideoById);
router
    .route("/update-video/:videoId")
    .patch(varifyJwt,upload.single("thumbnail"), updateVideo);
router.route("/delete-video/:videoId").delete(varifyJwt,deleteVideo);
router.route("/toggle-video/:videoId").post(varifyJwt,togglePublishStatus);
router.route("/getVideo").post(getAllVideos);
router.route("/history/:videoId").post(varifyJwt, addVideoToWatchHistory);
router
    .route("/history/:videoId")
    .delete(varifyJwt, removeVideoFromWatchHistory);

export default router;
