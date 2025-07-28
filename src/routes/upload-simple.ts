import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Multer setup for local uploads only (no AWS S3 for testing)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
  },
});
const upload = multer({ storage });

router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      headers: req.headers,
      body: req.body
    });
    
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }

    console.log('File details:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Local upload only for testing
    // Use the correct host for React Native development
    const host = req.get('host');
    const publicHost = host === 'localhost:3000' ? '192.168.1.4:3000' : host;
    const url = `${req.protocol}://${publicHost}/uploads/${req.file.filename}`;
    
    console.log('Generated URL:', url);
    
    return res.json({ 
      success: true,
      message: 'File uploaded successfully',
      data: {
        url,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ 
      success: false,
      error: 'Image upload failed', 
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

export default router;
