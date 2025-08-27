const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ensureLoggedIn } = require('../middleware/auth');

router.get('/profile/:userId', ensureLoggedIn, async (req, res) => {
  try {
    const profileUser = await User.findById(req.params.userId).lean();
    if (!profileUser) return res.redirect('/');
    res.render('profile', { user: profileUser });
  } catch (err) {
    console.error('Profile error:', err);
    res.redirect('/');
  }
});

module.exports = router;
