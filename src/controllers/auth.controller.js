const crypto = require('crypto');
const config = require('../config');
const db = require('../db');
const messages = require('../utils/messages');
const authService = require('../services/auth.service');

const COOKIE = 'Path=/; HttpOnly; SameSite=Lax';

module.exports.auth = {
  // POST /api/auth/login: answers by itself, because it also sets the session cookie
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = authService.checkPassword(email, password);
      const { sessionId, accessToken } = authService.startSession(user);
      res.setHeader('Set-Cookie', `demo_session=${sessionId}; ${COOKIE}`);
      return res.json({ status: true, msg: messages.SUCCESS, accessToken, user: authService.publicUser(user) });
    } catch (error) {
      return next(error);
    }
  },

  logout: async (req) => {
    authService.endSession(req.cookies.demo_session);
    return { signedOut: true };
  },

  me: async (req, res) => {
    return { user: authService.publicUser(res.locals.user) };
  },

  // GET /api/auth/csrf: the token goes in a cookie and in the body; send it back in x-csrf-token
  csrf: (req, res) => {
    const csrfToken = crypto.randomBytes(16).toString('hex');
    res.setHeader('Set-Cookie', `csrf=${csrfToken}; Path=/; SameSite=Lax`);
    return res.json({ csrfToken });
  },

  // GET /api/auth/oauth: starts a sign-in with the pretend provider. Like "Sign in with Google", it
  // answers with a redirect that only a browser can follow to the end.
  oauthStart: (req, res) => {
    const state = crypto.randomBytes(12).toString('hex');
    res.setHeader('Set-Cookie', `demo_oauth_state=${state}; ${COOKIE}; Max-Age=600`);
    const url = new URL('/oauth/authorize', config.baseUrl);
    url.searchParams.set('client_id', 'sonarak-demo');
    url.searchParams.set('redirect_uri', `${config.baseUrl}/api/auth/oauth/callback`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    return res.redirect(307, url.toString());
  },

  // GET /api/auth/oauth/callback?code=…&state=…: the provider sends the browser back here
  oauthCallback: (req, res) => {
    const { code, state } = req.query;
    if (!state || state !== req.cookies.demo_oauth_state) {
      return res.status(400).json({ status: false, msg: 'OAUTH_STATE_MISMATCH' });
    }
    const userId = db.oauthCodes.get(code);
    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      return res.status(400).json({ status: false, msg: 'OAUTH_CODE_INVALID' });
    }
    db.oauthCodes.delete(code);
    const { sessionId } = authService.startSession(user);
    res.setHeader('Set-Cookie', [`demo_session=${sessionId}; ${COOKIE}`, 'demo_oauth_state=; Path=/; Max-Age=0']);
    return res.redirect(302, '/signed-in');
  },
};
