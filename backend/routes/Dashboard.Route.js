import express from "express";
import { getAdminStats } from "../controllers/Dashboard.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get("/admin/stats", verifyToken, isAdmin, getAdminStats);

export default router;
