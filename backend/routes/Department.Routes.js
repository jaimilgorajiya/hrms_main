import express from "express";
import { createDepartment, getDepartments, updateDepartment, deleteDepartment, bulkCreateDepartments, reorderDepartments } from "../controllers/Department.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.post("/add", verifyToken, isAdmin, createDepartment);
router.post("/bulk-add", verifyToken, isAdmin, bulkCreateDepartments);
router.post("/reorder", verifyToken, isAdmin, reorderDepartments);
router.get("/", verifyToken, getDepartments);
router.put("/:id", verifyToken, isAdmin, updateDepartment);
router.delete("/:id", verifyToken, isAdmin, deleteDepartment);

export default router;
