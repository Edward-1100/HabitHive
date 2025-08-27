const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');

router.get('/', isLoggedIn, (req, res) => {
  res.render('rewards');
});

module.exports = router;
