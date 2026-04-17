import express from "express";
import { login, otpLogin, logout, register, verifyUser, changePassword, checkPhone, forgotPassword, resetPassword } from "../controllers/Auth.Controller.js";
import { verifyToken } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/otp-login", otpLogin);
router.post("/check-phone", checkPhone);
router.post("/logout", logout);
router.get("/verify", verifyToken, verifyUser);
router.post("/change-password", verifyToken, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
