const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const fs = require('fs');
const mongoose = require('mongoose');
const { ObjectId, GridFSBucket } = require('mongodb');

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, {recursive: true});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif/;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeOk = allowed.test(file.mimetype || '');
  const extOk = allowed.test(ext);
  cb(null, mimeOk && extOk);
};

const limits = {fileSize: 8 * 1024 * 1024};
const upload = multer({storage, fileFilter, limits});

async function saveToGridFS(buffer, filename, mimeType) {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB not available');
  const bucket = new GridFSBucket(db, {bucketName: 'avatars'});
  const fileId = new ObjectId();
  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStreamWithId(fileId, filename, {contentType: mimeType});
    uploadStream.end(buffer);
    uploadStream.on('error', (err) => reject(err));
    uploadStream.on('finish', () => resolve(String(fileId)));
  });
}

async function deleteFromGridFS(id) {
  if (!id) return;
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    const bucket = new GridFSBucket(db, {bucketName: 'avatars'});
    const objId = new ObjectId(id);
    await bucket.delete(objId);
  } catch (err) {
    console.warn('deleteFromGridFS error (ignored):', err.message || err);
  }
}

async function processAvatar(buffer, filename) {
  const resized = await sharp(buffer)
    .resize(256, 256, {fit: 'cover'})
    .rotate()
    .png({quality: 90})
    .toBuffer();

  try {
    const db = mongoose.connection.db;
    if (db) {
      const fileId = await saveToGridFS(resized, filename, 'image/png');
      return `/uploads/avatars/${fileId}`;
    }
  } catch (err) {
    console.warn('GridFS save failed, falling back to disk:', err.message || err);
  }

  const outPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(outPath, resized);
  return `/uploads/avatars/${filename}`;
}

module.exports = {upload, processAvatar, uploadDir, deleteFromGridFS};
