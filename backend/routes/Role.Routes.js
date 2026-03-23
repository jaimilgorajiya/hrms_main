import express from "express";
import { createRole, getRoles, updateRole, deleteRole, getRoleById } from "../controllers/Role.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.use(verifyToken);
router.use(isAdmin);

router.post("/create", createRole);
router.get("/", getRoles);
router.get("/:id", getRoleById);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;
