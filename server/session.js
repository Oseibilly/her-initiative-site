const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./db');

const sessionMiddleware = session({
  store: new pgSession({ pool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId || req.session.role !== 'admin') {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  next();
}

module.exports = { sessionMiddleware, requireAuth, requireAdmin };
