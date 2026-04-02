import express from "express";
import { 
    createSalaryGroup, 
    getSalaryGroups, 
    getSalaryGroupById, 
    updateSalaryGroup, 
    deleteSalaryGroup 
} from "../controllers/SalaryGroup.Controller.js";
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.post("/add", verifyToken, isAdmin, createSalaryGroup);
router.get("/all", verifyToken, isAdmin, getSalaryGroups);
router.get("/get/:id", verifyToken, isAdmin, getSalaryGroupById);
router.put("/update/:id", verifyToken, isAdmin, updateSalaryGroup);
router.delete("/delete/:id", verifyToken, isAdmin, deleteSalaryGroup);

export default router;
