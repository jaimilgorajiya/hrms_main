import express from "express";
import { addBreakType, getBreakTypes, updateBreakType, deleteBreakType, bulkDeleteBreakTypes } from "../controllers/BreakType.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.post("/add", verifyToken, isAdmin, addBreakType);
router.get("/", verifyToken, getBreakTypes);
router.put("/update/:id", verifyToken, isAdmin, updateBreakType);
router.delete("/delete/:id", verifyToken, isAdmin, deleteBreakType);
router.post("/bulk-delete", verifyToken, isAdmin, bulkDeleteBreakTypes);

export default router;
