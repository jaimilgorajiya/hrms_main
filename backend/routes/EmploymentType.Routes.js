import express from "express";
import { 
    createEmploymentType, 
    getEmploymentTypes, 
    updateEmploymentType, 
    deleteEmploymentType 
} from "../controllers/EmploymentType.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

// Publicly available for authenticated users (to populate dropdowns)
router.get("/", verifyToken, getEmploymentTypes);

// Admin only CRUD
router.post("/create", verifyToken, isAdmin, createEmploymentType);
router.put("/:id", verifyToken, isAdmin, updateEmploymentType);
router.delete("/:id", verifyToken, isAdmin, deleteEmploymentType);

export default router;
