import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Multer setup for local uploads
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

// AWS S3 setup (if credentials are present)
const hasS3 = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET;
let s3Client: S3Client | null = null;
if (hasS3) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (s3Client) {
      // Upload to S3
      const fileContent = fs.readFileSync(req.file.path);
      const s3Key = `uploads/${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: s3Key,
        Body: fileContent,
        ContentType: req.file.mimetype,
        ACL: 'public-read',
      });
      await s3Client.send(command);
      // Remove local file after upload
      fs.unlinkSync(req.file.path);
      const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
      return res.json({ url: s3Url });
    } else {
      // Local upload
      const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      return res.json({ url });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Image upload failed', details: err });
  }
});

export default router;
