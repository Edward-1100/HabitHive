const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const User = require('../models/User');
const Habit = require('../models/Habit');
const { isLoggedIn } = require('../middleware/auth');
const { upload, processAvatar, deleteFromGridFS } = require('../middleware/uploadAvatar');

router.get('/', (req, res) => {
  if (req.session && req.session.user && req.session.user.id) {
    return res.redirect(`/profile/${req.session.user.id}`);
  }
  return res.redirect('/login');
});

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).send('User not found');

    const habits = await Habit.find({user: user._id}).lean();

    const habitsCount = habits.length;
    let completedCount = 0;
    const activities = [];

    for (const h of habits) {
      if (Array.isArray(h.progress)) {
        for (const p of h.progress) {
          const dateObj = p && p.date ? new Date(p.date) : new Date();
          activities.push({
            date: dateObj,
            habitTitle: h.title,
            type: p && p.completed ? 'completed' : 'missed'
          });
          if (p && p.completed) completedCount++;
        }
      }
    }

    activities.sort((a, b) => b.date - a.date);
    const recentActivities = activities.slice(0, 10);
    const streak = 0;

    if (!user.createdAt) user.createdAt = new Date();

    res.render('profile', {
      user,
      habitsCount,
      completedCount,
      streak,
      activities: recentActivities
    });
  } catch (err) {
    console.error('Profile route error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/:id/edit', isLoggedIn, async (req, res) => {
  try {
    if (!req.session || !req.session.user || String(req.session.user.id) !== String(req.params.id)) {
      return res.status(403).send('Forbidden');
    }

    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).send('User not found');

    res.render('editProfile', {user, error: null});
  } catch (err) {
    console.error('GET edit profile error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/:id/edit', isLoggedIn, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.session || !req.session.user || String(req.session.user.id) !== String(req.params.id)) {
      return res.status(403).send('Forbidden');
    }

    const updates = {};
    if (req.body.email) updates.email = req.body.email.trim();

    if (req.file) {
      const name = crypto.randomBytes(12).toString('hex') + '.png';
      const publicPath = await processAvatar(req.file.buffer, name);
      updates.profileImage = publicPath;

      const existingUser = await User.findById(req.params.id).lean();
      if (existingUser && existingUser.profileImage) {
        if (existingUser.profileImage.startsWith('/uploads/avatars/')) {
          const oldId = existingUser.profileImage.split('/').pop();
          try {
            await deleteFromGridFS(oldId);
          } catch (err) {
            console.warn('Could not delete old GridFS avatar:', err.message || err);
          }
        } else {
          const oldFs = path.join(process.cwd(), 'public', existingUser.profileImage.replace(/^\//, ''));
          try {
            if (fs.existsSync(oldFs)) fs.unlinkSync(oldFs);
          } catch (err) {
            console.warn('Could not remove old avatar file:', err);
          }
        }
      }
    }

    await User.findByIdAndUpdate(req.params.id, updates, { new: true });

    if (req.session.user && String(req.session.user.id) === String(req.params.id)) {
      req.session.user = Object.assign({}, req.session.user, updates);
    }

    return res.redirect(`/profile/${req.params.id}`);
  } catch (err) {
    console.error('POST edit profile error:', err);
    const fallbackUser = {_id: req.params.id, email: req.body.email || ''};
    return res.render('editProfile', {user: fallbackUser, error: 'Could not update profile.'});
  }
});

module.exports = router;
