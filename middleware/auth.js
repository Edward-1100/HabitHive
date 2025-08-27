function ensureLoggedIn(req, res, next) {
  if (req.user && req.user._id) return next();
  return res.redirect('/login');
}

function ensureAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) return next();
  return res.status(403).send('Forbidden - Admins Only');
}

module.exports = { ensureLoggedIn, ensureAdmin };
