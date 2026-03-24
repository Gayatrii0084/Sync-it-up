/**
 * Middleware: ensures the user is authenticated (has an active session).
 * If not, redirects to login page.
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
}

/**
 * Middleware: redirect-based auth check for HTML page routes.
 */
function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.redirect('/pages/login.html');
}

module.exports = { isAuthenticated, requireLogin };
