import { Router } from "express";
import {
    deleteVideo,
    getAllVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
} from "../controllers/video.controller.js";
import { varifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(varifyJwt); // Apply varifyJwt middleware to all routes in this file

router.route("/upload-video").post(
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

export default router;
