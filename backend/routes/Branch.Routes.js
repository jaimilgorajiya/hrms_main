import express from "express";
import { getBranches, addBranch, updateBranch, deleteBranch, reorderBranches } from "../controllers/Branch.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get("/", verifyToken, getBranches);
router.post("/add", verifyToken, isAdmin, addBranch);
router.post("/reorder", verifyToken, isAdmin, reorderBranches);
router.put("/:id", verifyToken, isAdmin, updateBranch);
router.delete("/:id", verifyToken, isAdmin, deleteBranch);

export default router;
