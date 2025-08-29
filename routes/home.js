const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const MissedLog = require('../models/MissedLog');
const { isLoggedIn } = require('../middleware/auth');

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

router.get('/', async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.render('index');
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayIso = toIso(now);

    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    const habits = await Habit.find({ user: req.user._id }).lean();

    const days = [];
    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date: iso, habits: [] });
    }

    for (const h of habits) {
      const start = clampDateToDayStart(h.startDate || new Date());
      const end = h.endDate ? clampDateToDayStart(h.endDate) : null;

      for (let d = 1; d <= lastOfMonth.getDate(); d++) {
        const cur = new Date(year, month, d);
        const curIso = toIso(cur);

        if (cur >= start && (!end || cur <= end)) {
          const completed = Array.isArray(h.progress)
            ? !!h.progress.find(p => p.date === curIso && p.completed === true)
            : false;

          days[d - 1].habits.push({
            habitId: String(h._id),
            title: h.title,
            completed
          });

          if (curIso < todayIso && !completed) {
            try {
              await MissedLog.updateOne(
                { habit: h._id, date: curIso },
                { $setOnInsert: { user: req.user._id, habit: h._id, date: curIso } },
                { upsert: true }
              );
            } catch (e) {

            }
          }
        }
      }
    }

    for (const d of days) {
      const total = d.habits.length;
      const completedCount = d.habits.filter(h => h.completed).length;

      let bucket = 'none';
      if (total === 0) bucket = 'empty';
      else if (completedCount === 0) bucket = 'none';
      else if (completedCount === total) bucket = 'all';
      else bucket = 'partial';


      d.bucket = bucket;
      d.completedCount = completedCount;
      d.total = total;
    }

    return res.render('index', {
      user: req.user,
      calendarDays: days,
      month,
      year,
      todayIso,
      habits: habits.map(h => ({ _id: String(h._id), title: h.title }))
    });
  } catch (err) {
    console.error('Home route error:', err);
    return res.render('index');
  }
});

module.exports = router;
