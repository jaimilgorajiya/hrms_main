import express from "express";
import { togglePunch, getTodayAttendance, toggleBreak, getAttendanceHistory, getAdminAttendance, updateApprovalStatus, addManualAttendance, getMissingAttendance, getMonthlyAttendanceStats, getAbsentEmployees, deleteAttendance } from "../controllers/Attendance.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

// Employee routes
router.get("/today", verifyToken, getTodayAttendance);
router.post("/toggle-punch", verifyToken, togglePunch);
router.post("/toggle-break", verifyToken, toggleBreak);
router.get("/history", verifyToken, getAttendanceHistory);

// Admin routes
router.get("/admin/all", verifyToken, isAdmin, getAdminAttendance);
router.get("/admin/absent-list", verifyToken, isAdmin, getAbsentEmployees);
router.get("/admin/missing", verifyToken, isAdmin, getMissingAttendance);
router.post("/admin/approve", verifyToken, isAdmin, updateApprovalStatus);
router.post("/admin/add-manual", verifyToken, isAdmin, addManualAttendance);
router.delete("/admin/delete", verifyToken, isAdmin, deleteAttendance);
router.get("/admin/monthly-stats", verifyToken, isAdmin, getMonthlyAttendanceStats);

export default router;
