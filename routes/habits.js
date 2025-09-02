const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {isLoggedIn} = require('../middleware/auth');

router.get('/', isLoggedIn, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).lean();
    const habits = (user && Array.isArray(user.habits)) ? user.habits : [];
    res.render('habits', {habits});
  } catch (err) {
    console.error('Habits GET error:', err);
    res.redirect('/');
  }
});

router.post('/add', isLoggedIn, async (req, res) => {
  try {
    const { habit } = req.body;
    if (typeof habit === 'string' && habit.trim()) {
      await User.findByIdAndUpdate(req.session.user.id, {$push: {habits: habit.trim()}});
    }
    res.redirect('/habits');
  } catch (err) {
    console.error('Habits add error:', err);
    res.redirect('/habits');
  }
});

module.exports = router;
