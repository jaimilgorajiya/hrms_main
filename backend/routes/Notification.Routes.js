import express from "express";
import { getMyNotifications, markAsRead, markAllRead } from "../controllers/Notification.Controller.js";
import { verifyToken } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get("/my", verifyToken, getMyNotifications);
router.put("/read/:notificationId", verifyToken, markAsRead);
router.put("/read-all", verifyToken, markAllRead);

export default router;
