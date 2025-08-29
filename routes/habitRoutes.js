const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const MissedLog = require('../models/MissedLog');
const { ensureLoggedIn } = require('../middleware/auth');
const mongoose = require('mongoose');

function toIsoDate(input = new Date()) {
  const d = new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseProgressDate(p) {
  if (!p) return null;
  if (typeof p === 'string') return p;
  if (p instanceof Date) return toIsoDate(p);
  if (p.date) return parseProgressDate(p.date);
  return null;
}

router.get('/habits', ensureLoggedIn, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    const todayIso = toIsoDate();
    habits.forEach(h => {
      const prog = Array.isArray(h.progress) ? h.progress : [];
      h.completedToday = prog.some(p => {
        const pd = parseProgressDate(p.date || p);
        return pd === todayIso && (p.completed === true);
      });
      h.startDateStr = h.startDate ? toIsoDate(h.startDate) : '';
      h.endDateStr = h.endDate ? toIsoDate(h.endDate) : '';
      h.progressNormalized = prog.map(p => ({ date: parseProgressDate(p.date || p), completed: !!p.completed }));
    });
    res.render('habits', { habits });
  } catch (err) {
    console.error('GET /habits error:', err);
    res.redirect('/');
  }
});

router.post('/habits/add', ensureLoggedIn, async (req, res) => {
  try {
    const { habitType, title, goodHabits, badHabits, startDate, endDate } = req.body;
    const habitTitle = (title && title.trim()) || goodHabits || badHabits;
    if (!habitType || !habitTitle) {
      return res.status(400).send('Missing required fields');
    }

    const habit = new Habit({
      user: req.user._id,
      title: habitTitle.trim(),
      type: habitType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      progress: []
    });

    await habit.save();
    return res.redirect('/habits');
  } catch (err) {
    console.error('POST /habits/add error:', err);
    return res.status(500).send('Error saving habit');
  }
});

router.post('/habits/edit/:id', ensureLoggedIn, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).send('Invalid id');

    const { title, startDate, endDate } = req.body;
    const h = await Habit.findById(id);
    if (!h) return res.status(404).send('Not found');
    if (h.user.toString() !== req.user._id.toString()) return res.status(403).send('Forbidden');

    h.title = (title || h.title).trim();
    h.startDate = startDate ? new Date(startDate) : h.startDate;
    h.endDate = endDate ? new Date(endDate) : h.endDate;
    await h.save();
    return res.redirect('/habits');
  } catch (err) {
    console.error('POST /habits/edit error:', err);
    return res.status(500).send('Error updating habit');
  }
});

router.post('/habits/delete/:id', ensureLoggedIn, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).send('Invalid id');
    const h = await Habit.findById(id);
    if (!h) return res.status(404).send('Not found');
    if (h.user.toString() !== req.user._id.toString()) return res.status(403).send('Forbidden');
    await Habit.findByIdAndDelete(id);
    try { await MissedLog.deleteMany({ habit: id }); } catch (e) {}
    return res.redirect('/habits');
  } catch (err) {
    console.error('POST /habits/delete error:', err);
    return res.status(500).send('Error deleting habit');
  }
});

router.post('/habits/toggle/:id', ensureLoggedIn, async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });

    const habit = await Habit.findById(id);
    if (!habit) return res.status(404).json({ error: 'Not found' });
    if (habit.user.toString() !== req.user._id.toString()) return res.status(403).json({ error: 'Forbidden' });

    const today = toIsoDate();
    if (!Array.isArray(habit.progress)) habit.progress = [];

    const idx = habit.progress.findIndex(p => parseProgressDate(p.date || p) === today);
    let nowCompleted;

    if (idx === -1) {
      habit.progress.push({ date: today, completed: true });
      nowCompleted = true;
    } else {
      habit.progress[idx].completed = !habit.progress[idx].completed;
      nowCompleted = habit.progress[idx].completed;
    }

    await habit.save();

    if (nowCompleted) {
      try { await MissedLog.deleteOne({ habit: habit._id, date: today }); } catch (e) {}
    } else {
      const todayIso = toIsoDate();
      if (today < todayIso) {
        try {
          await MissedLog.updateOne(
            { habit: habit._id, date: today },
            { $setOnInsert: { user: habit.user, habit: habit._id, date: today } },
            { upsert: true }
          );
        } catch (e) {}
      }
    }

    const completed = (habit.progress || []).some(p => parseProgressDate(p.date || p) === today && p.completed);
    return res.json({ ok: true, completed });
  } catch (err) {
    console.error('POST /habits/toggle error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/habits/:id/toggle-date', ensureLoggedIn, async (req, res) => {
  try {
    const id = req.params.id;
    const { date } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ ok: false, error: 'Invalid date format' });
    }
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ ok: false, error: 'Invalid id' });

    const habit = await Habit.findById(id);
    if (!habit) return res.status(404).json({ ok: false, error: 'Not found' });
    if (habit.user.toString() !== req.user._id.toString()) return res.status(403).json({ ok: false, error: 'Forbidden' });

    if (!Array.isArray(habit.progress)) habit.progress = [];

    const idx = habit.progress.findIndex(p => parseProgressDate(p.date || p) === date);
    let nowCompleted;

    if (idx === -1) {
      habit.progress.push({ date, completed: true });
      nowCompleted = true;
    } else {
      habit.progress[idx].completed = !habit.progress[idx].completed;
      nowCompleted = habit.progress[idx].completed;
    }

    await habit.save();

    if (nowCompleted) {
      try { await MissedLog.deleteOne({ habit: habit._id, date }); } catch (e) {}
    } else {
      const todayIso = toIsoDate();
      if (date < todayIso) {
        try {
          await MissedLog.updateOne(
            { habit: habit._id, date },
            { $setOnInsert: { user: habit.user, habit: habit._id, date } },
            { upsert: true }
          );
        } catch (e) {}
      }
    }

    const userHabits = await Habit.find({ user: req.user._id }).lean();
    let completedCount = 0;
    for (const h of userHabits) {
      if (!Array.isArray(h.progress)) continue;
      if (h.progress.some(p => parseProgressDate(p.date || p) === date && p.completed)) {
        completedCount++;
      }
    }

    return res.json({ ok: true, habitId: id, date, completed: nowCompleted, completedCount });
  } catch (err) {
    console.error('POST /habits/:id/toggle-date error:', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
});

module.exports = router;
