import express from "express";
import { 
    getEarningDeductionTypes, 
    addEarningDeductionType, 
    updateEarningDeductionType, 
    deleteEarningDeductionType, 
    toggleStatus 
} from "../controllers/EarningDeductionType.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get("/", verifyToken, getEarningDeductionTypes);
router.post("/add", verifyToken, isAdmin, addEarningDeductionType);
router.put("/:id", verifyToken, isAdmin, updateEarningDeductionType);
router.put("/status/:id", verifyToken, isAdmin, toggleStatus);
router.delete("/:id", verifyToken, isAdmin, deleteEarningDeductionType);

export default router;
