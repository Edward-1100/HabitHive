const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const User = require('../models/User');
const Habit = require('../models/Habit');
const {isLoggedIn} = require('../middleware/auth');
const {upload, processAvatar, deleteFromGridFS} = require('../middleware/uploadAvatar');

function toIso(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function clampDateToDayStart(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

function progressEntryToIso(p) {
  if (!p) return null;
  if (typeof p === 'string') return p;
  if (p instanceof Date) return toIso(p);
  if (p.date) {
    if (typeof p.date === 'string') return p.date;
    return toIso(new Date(p.date));
  }
  return null;
}

function isoToLocalDate(iso) {
  if (!iso) return null;
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

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

    const habitsCount = Array.isArray(habits) ? habits.length : 0;
    let completedCount = 0;
    const activities = [];

    for (const h of habits || []) {
      if (Array.isArray(h.progress)) {
        for (const p of h.progress) {
          const pdIso = progressEntryToIso(p);
          const dateObj = pdIso ? isoToLocalDate(pdIso) : new Date();
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

    const today = new Date();
    today.setHours(0,0,0,0);
    const isoToday = toIso(today);

    function isHabitScheduledOn(habit, dateObj) {
      const start = clampDateToDayStart(habit.startDate || new Date());
      const end = habit.endDate ? clampDateToDayStart(habit.endDate) : null;
      return dateObj >= start && (!end || dateObj <= end);
    }

    let currentStreak = 0;
    const maxLookbackDays = 4000;
    for (let i = 0; i < maxLookbackDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = toIso(d);

      let scheduled = 0;
      let completed = 0;

      for (const h of habits) {
        if (isHabitScheduledOn(h, d)) {
          scheduled++;
          if (Array.isArray(h.progress)) {
            const p = h.progress.find(pp => {
              const pd = progressEntryToIso(pp);
              return pd === iso;
            });
            if (p && p.completed) completed++;
          }
        }
      }

      if (scheduled === 0) {
        continue;
      }

      if (completed === scheduled) {
        currentStreak++;
      } else {
        break;
      }
    }

    const streak = currentStreak;

    if (!user.createdAt) user.createdAt = new Date();

    const recentDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = toIso(d);
      recentDays.push({date: iso, habits: [], completedCount: 0, total: 0, bucket: 'empty'});
    }

    for (const h of habits || []) {
      const start = clampDateToDayStart(h.startDate || new Date());
      const end = h.endDate ? clampDateToDayStart(h.endDate) : null;

      for (const day of recentDays) {
        const cur = new Date(day.date);
        if (cur >= start && (!end || cur <= end)) {
          const completed = Array.isArray(h.progress)
            ? !!h.progress.find(p => {
                const pd = progressEntryToIso(p);
                return pd === day.date && p.completed === true;
              })
            : false;

          day.habits.push({
            habitId: String(h._id),
            title: h.title,
            completed
          });
        }
      }
    }

    for (const day of recentDays) {
      const total = day.habits.length;
      const completedCountDay = day.habits.filter(h => h.completed).length;
      day.total = total;
      day.completedCount = completedCountDay;
      if (total === 0) day.bucket = 'empty';
      else if (completedCountDay === 0) day.bucket = 'none';
      else if (completedCountDay === total) day.bucket = 'all';
      else day.bucket = 'partial';
    }

    res.render('profile', {
      user,
      habitsCount,
      completedCount,
      streak,
      activities: recentActivities,
      recentDays
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

    await User.findByIdAndUpdate(req.params.id, updates, {new: true});

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
