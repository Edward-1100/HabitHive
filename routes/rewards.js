const express = require('express');
const router = express.Router();

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
