import express from "express";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";
import { submitRequest, getEmployeeRequests, getAdminRequests, updateRequestStatus } from "../controllers/Request.Controller.js";

const router = express.Router();

router.post("/submit", verifyToken, submitRequest);
router.get("/my-requests", verifyToken, getEmployeeRequests);
router.get("/admin/all", verifyToken, isAdmin, getAdminRequests);
router.post("/admin/action", verifyToken, isAdmin, updateRequestStatus);

export default router;
