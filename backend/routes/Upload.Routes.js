import express from 'express';
import upload from '../middleware/Upload.Middleware.js';
import { uploadFile } from '../controllers/Upload.Controller.js';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';

const router = express.Router();

router.post('/', verifyToken, isAdmin, upload.single('file'), uploadFile);

export default router;
