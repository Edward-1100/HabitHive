const express = require('express');
const mongoose = require('mongoose');
const { ObjectId, GridFSBucket } = require('mongodb');

const router = express.Router();

router.get('/uploads/avatars/:id', async (req, res) => {
  const id = req.params.id;
  if (!ObjectId.isValid(id)) return res.status(404).send('Not found');

  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).end();

    const bucket = new GridFSBucket(db, {bucketName: 'avatars'});
    const _id = new ObjectId(id);

    const filesColl = db.collection('avatars.files');
    const fileDoc = await filesColl.findOne({_id});
    if (!fileDoc) return res.status(404).send('Not found');

    res.setHeader('Content-Type', fileDoc.contentType || 'application/octet-stream');
    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error', err);
      res.status(404).end();
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('Uploads route error:', err);
    res.status(500).end();
  }
});

module.exports = router;
