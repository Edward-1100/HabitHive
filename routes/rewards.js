const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {ensureLoggedIn} = require('../middleware/auth');

router.get('/', ensureLoggedIn, async (req, res) => {
  try {
    const msg = req.session.rewardsMessage || null;
    const err = req.session.rewardsError || null;
    delete req.session.rewardsMessage;
    delete req.session.rewardsError;

    const user = await User.findById(req.session.user.id).lean();
    return res.render('rewards', {
      title: 'Rewards',
      user,
      message: msg,
      error: err
    });
  } catch (e) {
    console.error('GET /rewards error:', e);
    return res.status(500).send('Server error');
  }
});

router.post('/deduct', ensureLoggedIn, async (req, res) => {
  try {
    let amount = parseInt(req.body.amount, 10);
    if (!Number.isFinite(amount)) {
      req.session.rewardsError = 'Invalid amount.';
      return res.redirect('/rewards');
    }
    amount = Math.abs(amount);
    if (amount === 0) {
      req.session.rewardsError = 'Enter an amount greater than zero.';
      return res.redirect('/rewards');
    }

    const updated = await User.findOneAndUpdate(
      {_id: req.session.user.id, points: {$gte: amount}},
      {$inc: {points: -amount}},
      {new: true}
    ).lean();

    if (!updated) {
      req.session.rewardsError = 'Not enough points.';
      return res.redirect('/rewards');
    }

    req.session.rewardsMessage = `Successfully redeemed ${amount} points.`;
    if (req.session.user) req.session.user.points = updated.points;
    return res.redirect('/rewards');
  } catch (e) {
    console.error('POST /rewards/deduct error:', e);
    req.session.rewardsError = 'Server error.';
    return res.redirect('/rewards');
  }
});

module.exports = router;
