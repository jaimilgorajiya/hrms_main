import express from "express";
import { getAdminStats, getEmployeePerformance } from "../controllers/Dashboard.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get("/admin/stats", verifyToken, isAdmin, getAdminStats);
router.get("/admin/employee-performance", verifyToken, isAdmin, getEmployeePerformance);

export default router;
