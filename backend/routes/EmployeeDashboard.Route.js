import express from "express";
import { getEmployeeStats } from "../controllers/EmployeeDashboard.Controller.js";
import { verifyToken } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get("/stats", verifyToken, getEmployeeStats);

export default router;
