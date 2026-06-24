import express from "express";
import { createUser, getUsers, getExEmployees, getUser, updateUser, deleteUser, reactivateUser, getNextEmployeeId, bulkUpdateEmployeeIds, uploadUserDocument, deleteUserDocument, changeBranch, getLeaveBalances, updateUserStatus, deleteProfilePhoto, getAllUploadedDocuments, reviewUserDocument, resendCredentials } from "../controllers/User.Controller.js";
import { downloadSample, importEmployees } from "../controllers/ImportEmployee.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";
import { checkEmployeeLimit } from "../middleware/EmployeeLimit.Middleware.js";
import upload from "../middleware/Upload.Middleware.js";

const router = express.Router();

router.post("/create", verifyToken, isAdmin, checkEmployeeLimit, createUser);
router.post("/add-employee", verifyToken, isAdmin, checkEmployeeLimit, upload.fields([{ name: 'profilePhoto', maxCount: 1 }, { name: 'resume', maxCount: 1 }, { name: 'idProof', maxCount: 1 }, { name: 'idProofs', maxCount: 10 }]), createUser);
router.get("/", verifyToken, isAdmin, getUsers);
router.get("/ex-employees", verifyToken, isAdmin, getExEmployees);
router.get("/next-id", verifyToken, isAdmin, getNextEmployeeId);
router.post("/bulk-update-ids", verifyToken, isAdmin, bulkUpdateEmployeeIds);
router.get("/leave-balance", verifyToken, isAdmin, getLeaveBalances);
router.get("/import/sample", verifyToken, isAdmin, downloadSample);
router.post("/import", verifyToken, isAdmin, upload.single('file'), importEmployees);
router.get("/documents/all", verifyToken, isAdmin, getAllUploadedDocuments);
router.get("/:id", verifyToken, isAdmin, getUser);
router.put("/:id", verifyToken, isAdmin, upload.single('profilePhoto'), updateUser);
router.patch("/:id/status", updateUserStatus);
router.delete("/:id", verifyToken, isAdmin, deleteUser);
router.post("/:id/reactivate", verifyToken, isAdmin, reactivateUser);
router.post("/:id/documents", verifyToken, isAdmin, upload.single('file'), uploadUserDocument);
router.delete("/:id/documents/:docId", verifyToken, isAdmin, deleteUserDocument);
router.put("/:id/documents/:docId/review", verifyToken, isAdmin, reviewUserDocument);
router.put("/:id/change-branch", verifyToken, isAdmin, changeBranch);
router.delete("/:id/profile-photo", verifyToken, isAdmin, deleteProfilePhoto);
router.post("/:id/resend-credentials", verifyToken, isAdmin, resendCredentials);

export default router;
