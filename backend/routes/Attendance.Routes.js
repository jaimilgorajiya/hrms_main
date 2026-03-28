import express from "express";
import { togglePunch, getTodayAttendance, toggleBreak, getAttendanceHistory, getAdminAttendance, updateApprovalStatus } from "../controllers/Attendance.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

// Employee routes
router.get("/today", verifyToken, getTodayAttendance);
router.post("/toggle-punch", verifyToken, togglePunch);
router.post("/toggle-break", verifyToken, toggleBreak);
router.get("/history", verifyToken, getAttendanceHistory);

// Admin routes
router.get("/admin/all", verifyToken, isAdmin, getAdminAttendance);
router.post("/admin/approve", verifyToken, isAdmin, updateApprovalStatus);

export default router;
