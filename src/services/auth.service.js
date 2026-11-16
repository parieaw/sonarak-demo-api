const crypto = require('crypto');
const db = require('../db');
const messages = require('../utils/messages');
const { BusinessError } = require('../utils/errors');

const publicUser = (user) => ({ id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions });

// Checks the email and password; a wrong pair is a business failure (HTTP 200, status false)
function checkPassword(email, password) {
  // emails are not case-sensitive: Admin@Demo.test is admin@demo.test
  const wanted = String(email).trim().toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === wanted);
  if (!user || user.password !== password) {
    throw new BusinessError(messages.WRONG_EMAIL_OR_PASSWORD);
  }
  return user;
}

// Starts a session for the user: a session id for the cookie, and a token for the Authorization header
function startSession(user) {
  const sessionId = crypto.randomUUID();
  const accessToken = `demo_${crypto.randomUUID().replace(/-/g, '')}`;
  db.sessions.set(sessionId, user.id);
  db.tokens.set(accessToken, user.id);
  db.sessionTokens.set(sessionId, accessToken);
  return { sessionId, accessToken };
}

// Signing out ends the session cookie and the bearer token that came with it
function endSession(sessionId) {
  db.sessions.delete(sessionId);
  db.tokens.delete(db.sessionTokens.get(sessionId));
  db.sessionTokens.delete(sessionId);
}

module.exports = { publicUser, checkPassword, startSession, endSession };
