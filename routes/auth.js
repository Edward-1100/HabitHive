const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { upload, processAvatar } = require('../middleware/uploadAvatar');
const crypto = require('crypto');

router.get('/register', (req, res) => res.render('register', {error: null}));

router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
      return res.render('register', {error: 'Missing required fields.'});
    }

    let profileImagePath = '/images/honeycomb.png';
    if (req.file) {
      const name = crypto.randomBytes(12).toString('hex') + '.png';
      profileImagePath = await processAvatar(req.file.buffer, name);
    }

    const user = new User({username, password, email, profileImage: profileImagePath});
    await user.save();
    req.session.user = {id: user._id, username: user.username, isAdmin: user.isAdmin};
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.render('register', {error: 'Registration error. Try a different username/email.'});
  }
});

router.get('/login', (req, res) => res.render('login', {error: null}));

router.post('/login', async (req, res) => {
  const {username, password} = req.body;
  try {
    const user = await User.findOne({username});
    if (!user) return res.render('login', {error: 'Invalid credentials'});
    const ok = await user.comparePassword(password);
    if (!ok) return res.render('login', {error: 'Invalid credentials'});
    req.session.user = {id: user._id.toString(), username: user.username, isAdmin: user.isAdmin};
    return res.redirect('/');
  } catch (err) {
    console.error('Login error', err);
    return res.render('login', {error: 'Login failed'});
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid', { path: '/' });
    res.redirect('/');
  });
});

module.exports = router;
