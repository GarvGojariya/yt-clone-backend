import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getUserWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAvatarImage,
    updateCoverImage,
    updateProfile,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { varifyJwt } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
    //for multiple fields
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);

router.route("/login").post(loginUser);

//secure routes
router.route("/logout").post(varifyJwt, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(varifyJwt, changeCurrentPassword);
router.route("/get-current-user").get(varifyJwt, getCurrentUser);
router.route("/update-profile").patch(varifyJwt, updateProfile);
router.route("/update-avatar").patch(
    varifyJwt,
    upload.single("avatar"), //for single fields
    updateAvatarImage
);
router.route("/update-coverimage").patch(
    varifyJwt,
    upload.single("coverImage"), //for single field
    updateCoverImage
);
router.route("/c/:username").get(varifyJwt, getUserChannelProfile);
router.route("/watch-history").get(varifyJwt, getUserWatchHistory);

export default router;
