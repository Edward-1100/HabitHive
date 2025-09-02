const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {recursive: true});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = allowed.test(file.mimetype);
  const extOk = allowed.test(ext);
  cb(null, mimeOk && extOk);
};

const limits = {fileSize: 8 * 1024 * 1024};
const upload = multer({storage, fileFilter, limits});

async function processAvatar(buffer, filename) {
  const outPath = path.join(uploadDir, filename);
  await sharp(buffer)
    .resize(256, 256, {fit: 'cover'})
    .rotate()
    .png({quality: 90})
    .toFile(outPath);
  return `/uploads/avatars/${filename}`;
}

module.exports = {upload, processAvatar, uploadDir};
