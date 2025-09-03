const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const router = express.Router();

function looksLikeObjectId(s) {
  return typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s);
}

router.get('/uploads/avatars/:id', async (req, res) => {
  const id = req.params.id;
  console.log('[uploads.get] request for avatar id=', id);

  if (looksLikeObjectId(id)) {
    try {
      const db = mongoose.connection.db;
      if (db) {
        const {GridFSBucket, ObjectId} = mongoose.mongo;
        const bucket = new GridFSBucket(db, {bucketName: 'avatars'});
        const _id = new ObjectId(id);

        const filesColl = db.collection('avatars.files');
        const fileDoc = await filesColl.findOne({_id});
        if (fileDoc) {
          console.log('[uploads.get] found GridFS fileDoc:', fileDoc.filename || '<no filename>');
          res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
          const downloadStream = bucket.openDownloadStream(_id);
          downloadStream.on('error', (err) => {
            console.error('[uploads.get] GridFS download error', err);
            res.status(404).end();
          });
          return downloadStream.pipe(res);
        } else {
          console.log('[uploads.get] GridFS: no document for id=', id);
        }
      } else {
        console.log('[uploads.get] mongoose.db not ready');
      }
    } catch (err) {
      console.error('[uploads.get] GridFS attempt error:', err && err.message ? err.message : err);
    }
  }

  const diskPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', id);
  if (fs.existsSync(diskPath)) {
    console.log('[uploads.get] serving disk file', diskPath);
    return res.sendFile(diskPath);
  }

  const pngPath = path.join(process.cwd(), 'public', 'uploads', 'avatars', `${id}.png`);
  if (fs.existsSync(pngPath)) {
    console.log('[uploads.get] serving disk file with .png', pngPath);
    return res.sendFile(pngPath);
  }

  const defaultPath = path.join(process.cwd(), 'public', 'images', 'honeycomb.png');
  if (fs.existsSync(defaultPath)) {
    console.log('[uploads.get] avatar not found; serving default image');
    return res.sendFile(defaultPath);
  }

  console.log('[uploads.get] avatar NOT found anywhere for id=', id);
  return res.status(404).end();
});

module.exports = router;
