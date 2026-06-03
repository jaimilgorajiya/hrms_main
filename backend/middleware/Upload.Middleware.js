import multer from 'multer';
import path from 'path';
import fs from 'fs';

let uploadDir = process.env.UPLOAD_DIR || 'public/uploads';

// Ensure directory exists with defensive fallback (re-trigger)
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.warn(`[UPLOAD] Failed to create UPLOAD_DIR (${uploadDir}). Falling back to 'public/uploads'. Error:`, error.message);
  uploadDir = 'public/uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export { uploadDir };
export default upload;
