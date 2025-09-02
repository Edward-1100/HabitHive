const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Habit = require('../models/Habit');

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

module.exports = router;
