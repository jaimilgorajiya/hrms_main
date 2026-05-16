import express from "express";
import { createPackage, getPackages, getPackageById, updatePackage, deletePackage, getEmployeeUsage, getAddonPackages, purchaseEmployeeAddon, verifyAddonPayment, getSubscriptionDetails } from "../controllers/Package.Controller.js";
import { verifyToken, isAdmin, isMasterAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

// Check if current user is master admin (must be before /:id)
router.get("/check-master", verifyToken, (req, res) => {
    const masterEmail = process.env.MASTER_ADMIN_EMAIL;
    const isMaster = masterEmail && req.user?.email?.toLowerCase() === masterEmail.toLowerCase();
    res.json({ success: true, isMasterAdmin: isMaster });
});

// Employee usage & addon routes (any admin can access — must be before /:id)
router.get("/subscription-details", verifyToken, isAdmin, getSubscriptionDetails);
router.get("/employee-usage", verifyToken, isAdmin, getEmployeeUsage);
router.get("/addons", verifyToken, isAdmin, getAddonPackages);
router.post("/addons/purchase", verifyToken, isAdmin, purchaseEmployeeAddon);
router.post("/addons/verify-payment", verifyToken, isAdmin, verifyAddonPayment);

// Public read (needed for Signup page)
router.get("/", getPackages); 

// Master Admin only — create/update/delete packages
router.post("/", verifyToken, isMasterAdmin, createPackage);
router.put("/:id", verifyToken, isMasterAdmin, updatePackage);
router.delete("/:id", verifyToken, isMasterAdmin, deletePackage);

// Any authenticated user can view a single package
router.get("/:id", getPackageById);

export default router;
