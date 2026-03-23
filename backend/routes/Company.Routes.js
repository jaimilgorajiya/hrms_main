import express from 'express';
import { getCompanyDetails, updateCompanyDetails } from '../controllers/Company.Controller.js';
import { verifyToken, isAdmin } from "../middleware/Auth.Middleware.js";

const router = express.Router();

router.get('/', verifyToken, isAdmin, getCompanyDetails);
router.put('/', verifyToken, isAdmin, updateCompanyDetails);

export default router;
