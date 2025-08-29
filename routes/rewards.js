const express = require('express');
const router = express.Router();
const User = require('../models/User')
 
router.get('/', async (req, res) => {
  try {
    if (!req.user || !req.user._id) return res.redirect('/login');
    const user = await User.findById(req.user._id).lean();
    return res.render('rewards', { title: 'Rewards', user, message: null, error: null });
  } catch (err) {
    console.error('GET /points-test error', err);
    return res.status(500).send('Server error');
  }
});
 
router.post('/deduct', async (req, res) => {
  try {
    if (!req.user || !req.user._id) return res.redirect('/login');
 
let amount = parseInt(req.body.amount, 10);
    if (Number.isNaN(amount)) {
      const user = await User.findById(req.user._id).lean();
      return res.render('rewards', { title: 'Rewards', user, message: null, error: 'Enter a valid number.' });
    }
 
    amount = Math.abs(amount);
    if (amount === 0) {
      const user = await User.findById(req.user._id).lean();
      return res.render('rewards', { title: 'Rewards', user, message: null, error: 'Enter an amount greater than zero.' });
    }
 
 
const updated = await User.findOneAndUpdate(
      { _id: req.user._id, points: { $gte: amount } },
      { $inc: { points: -amount } },
      { new: true }
    ).lean();
 
 
if (!updated) {
      const user = await User.findById(req.user._id).lean();
      return res.render('rewards', { title: 'Rewards', user, message: null, error: 'Not enough points' });
    }
 
return res.render('rewards', { title: 'Rewards', user: updated, message: `Successfully deducted ${amount} points.`, error: null });
  } catch (err) {
    console.error('POST /points-test/deduct error', err);
    return res.status(500).send('Server error');
  }
});
 
module.exports = router;


let authMiddleware = null;
try {
  const auth = require('../middleware/auth');
  authMiddleware = auth.isLoggedIn || auth.ensureLoggedIn || auth.isLoggedIn || auth.ensure_logged_in || null;
} catch (err) {
  authMiddleware = null;
}

const renderRewards = (req, res) => {
  res.render('rewards', { title: 'Rewards' });
};

if (authMiddleware && typeof authMiddleware === 'function') {
  router.get('/', authMiddleware, renderRewards);
} else {
  router.get('/', renderRewards);
}

module.exports = router;
