/**
 * Middleware: ensures the logged-in user has the 'admin' role.
 */
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
}

/**
 * Middleware: ensures the logged-in user has the 'student' role.
 */
function isStudent(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'student') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Students only.' });
}

module.exports = { isAdmin, isStudent };
