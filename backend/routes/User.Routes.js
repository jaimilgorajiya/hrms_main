import express from "express";
import { createUser, getUsers, getExEmployees, getUser, updateUser, deleteUser, getNextEmployeeId, bulkUpdateEmployeeIds, uploadUserDocument, deleteUserDocument, changeBranch } from "../controllers/User.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";
import upload from "../middleware/Upload.Middleware.js";

const router = express.Router();

router.post("/create", verifyToken, isAdmin, createUser);
router.post("/add-employee", verifyToken, isAdmin, upload.fields([{ name: 'profilePhoto', maxCount: 1 }, { name: 'resume', maxCount: 1 }, { name: 'idProof', maxCount: 1 }, { name: 'idProofs', maxCount: 10 }]), createUser);
router.get("/", verifyToken, isAdmin, getUsers);
router.get("/ex-employees", verifyToken, isAdmin, getExEmployees);
router.get("/next-id", verifyToken, isAdmin, getNextEmployeeId);
router.post("/bulk-update-ids", verifyToken, isAdmin, bulkUpdateEmployeeIds);
router.get("/:id", verifyToken, isAdmin, getUser);
router.put("/:id", verifyToken, isAdmin, upload.single('profilePhoto'), updateUser);
router.delete("/:id", verifyToken, isAdmin, deleteUser);
router.post("/:id/documents", verifyToken, isAdmin, upload.single('file'), uploadUserDocument);
router.delete("/:id/documents/:docId", verifyToken, isAdmin, deleteUserDocument);
router.put("/:id/change-branch", verifyToken, isAdmin, changeBranch);

export default router;
