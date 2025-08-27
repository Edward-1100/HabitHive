const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

router.get('/register', (req, res) => res.render('register', { error: null }));

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = new User({ username, email, password });
    await user.save();
    req.session.user = { id: user._id.toString(), username: user.username, isAdmin: user.isAdmin };
    return res.redirect('/');
  } catch (err) {
    console.error('Register error', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.render('register', { error: `${field} already in use` });
    }
    return res.render('register', { error: 'Registration failed' });
  }
});

router.get('/login', (req, res) => res.render('login', { error: null }));

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.render('login', { error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.render('login', { error: 'Invalid credentials' });
    req.session.user = { id: user._id.toString(), username: user.username, isAdmin: user.isAdmin };
    return res.redirect('/');
  } catch (err) {
    console.error('Login error', err);
    return res.render('login', { error: 'Login failed' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/');
  });
});

module.exports = router;
