import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getUserWatchHistory,
    getVarificationLink,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateProfile,
    varifyUser,
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
router.route("/update-profile").patch(
    varifyJwt,
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
    // upload.single("avatar"),
    updateProfile
);

router.route("/c/:username").get(varifyJwt, getUserChannelProfile);
router.route("/watch-history").get(varifyJwt, getUserWatchHistory);
router.route("/web/verify/:iv/:token").get(varifyUser);
router.route("/web/verification").get(
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
    getVarificationLink
);
export default router;
