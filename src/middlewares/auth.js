const db = require('../db');
const messages = require('../utils/messages');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

// Signed in with the session cookie (set by /api/auth/login and by the OAuth callback)
const requireSession = (req, res, next) => {
  const userId = db.sessions.get(req.cookies.demo_session);
  const user = db.users.find((u) => u.id === userId);
  if (!user) return next(new UnauthorizedError(messages.NOT_SIGNED_IN));
  res.locals.user = user;
  next();
};

// Signed in with "Authorization: Bearer <token>" (the accessToken /api/auth/login returns)
const requireToken = (req, res, next) => {
  const header = req.headers.authorization ?? '';
  const userId = db.tokens.get(header.replace(/^Bearer\s+/i, ''));
  const user = db.users.find((u) => u.id === userId);
  if (!user) return next(new UnauthorizedError(messages.NOT_SIGNED_IN));
  res.locals.user = user;
  next();
};

// requireRole('admin')
const requireRole = (role) => (req, res, next) => {
  if (res.locals.user?.role !== role) return next(new ForbiddenError(messages.NO_PERMISSION));
  next();
};

// requirePermission('orders.refund'): any of the permissions named grants access
const requirePermission = (...permissions) => (req, res, next) => {
  if (!permissions.some((p) => res.locals.user?.permissions.includes(p))) return next(new ForbiddenError(messages.NO_PERMISSION));
  next();
};

// Double-submit CSRF: the x-csrf-token header has to equal the csrf cookie (GET /api/auth/csrf sets it)
const requireCsrf = (req, res, next) => {
  const sent = req.headers['x-csrf-token'];
  if (!sent || sent !== req.cookies.csrf) {
    return res.status(403).json({ status: false, msg: messages.CSRF_TOKEN_MISMATCH });
  }
  next();
};

module.exports = { requireSession, requireToken, requireRole, requirePermission, requireCsrf };
