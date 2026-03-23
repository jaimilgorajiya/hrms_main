import express from "express";
import { addDesignation, getDesignations, updateDesignation, deleteDesignation } from "../controllers/Designation.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get("/", verifyToken, getDesignations);
router.post("/add", verifyToken, isAdmin, addDesignation);
router.put("/:id", verifyToken, isAdmin, updateDesignation);
router.delete("/:id", verifyToken, isAdmin, deleteDesignation);

export default router;
