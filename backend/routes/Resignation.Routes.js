import express from "express";
import { 
    submitResignation, 
    getMyResignation, 
    getAdminResignations, 
    actionResignation 
} from "../controllers/Resignation.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

// Employees (Submitting their own resignation)
router.post("/submit", verifyToken, submitResignation);
router.get("/my", verifyToken, getMyResignation);

// Admins (Management)
router.get("/admin/all", verifyToken, isAdmin, getAdminResignations);
router.post("/admin/action", verifyToken, isAdmin, actionResignation);

export default router;
