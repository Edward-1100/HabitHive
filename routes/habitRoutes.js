const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const { ensureLoggedIn } = require('../middleware/auth');
const mongoose = require('mongoose');

function dayStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}

router.get('/habits', ensureLoggedIn, async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
    const today = dayStart();
    habits.forEach(h => {
      h.completedToday = (h.progress || []).some(p => dayStart(p.date).getTime() === today.getTime() && p.completed);
      h.startDateStr = h.startDate ? new Date(h.startDate).toISOString().slice(0,10) : '';
      h.endDateStr = h.endDate ? new Date(h.endDate).toISOString().slice(0,10) : '';
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

    const today = dayStart();
    let entry = (habit.progress || []).find(p => dayStart(p.date).getTime() === today.getTime());
    if (entry) {
      entry.completed = !entry.completed;
    } else {
      habit.progress.push({ date: today, completed: true });
    }
    await habit.save();
    const completed = (habit.progress || []).some(p => dayStart(p.date).getTime() === today.getTime() && p.completed);
    return res.json({ ok: true, completed });
  } catch (err) {
    console.error('POST /habits/toggle error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
