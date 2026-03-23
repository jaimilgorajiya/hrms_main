import express from 'express';
import { verifyToken, isAdmin } from '../middleware/Auth.Middleware.js';
import { 
    getDocumentTypes, 
    createDocumentType, 
    updateDocumentType, 
    deleteDocumentType, 
    bulkDeleteDocumentTypes,
    toggleDocumentStatus
} from '../controllers/DocumentType.Controller.js';

const router = express.Router();

router.get('/', verifyToken, isAdmin, getDocumentTypes);
router.post('/', verifyToken, isAdmin, createDocumentType);
router.put('/:id', verifyToken, isAdmin, updateDocumentType);
router.delete('/:id', verifyToken, isAdmin, deleteDocumentType);
router.post('/bulk-delete', verifyToken, isAdmin, bulkDeleteDocumentTypes);
router.patch('/toggle-status/:id', verifyToken, isAdmin, toggleDocumentStatus);

export default router;
