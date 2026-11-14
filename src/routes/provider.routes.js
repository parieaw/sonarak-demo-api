// The pretend sign-in provider. In a real project this page belongs to Google or GitHub; here it is
// served by the same app so the whole sign-in can be tried offline. It is a page for a person in a
// browser: it is not part of the API.
const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const page = (body) => `<!doctype html><meta charset="utf-8"><title>Demo sign-in</title><body style="font:16px system-ui;max-width:420px;margin:12vh auto;padding:0 20px;color:#16202e">${body}</body>`;

router.get('/oauth/authorize', (req, res) => {
  const { redirect_uri: redirectUri, state } = req.query;
  if (!redirectUri || !state) return res.status(400).send(page('<p>Missing redirect_uri or state.</p>'));
  const buttons = db.users
    .map((u) => `<p><a style="display:block;padding:12px 16px;border:1px solid #c8d0db;border-radius:10px;text-decoration:none;color:inherit" href="/oauth/continue?as=${esc(u.id)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}"><b>${esc(u.name)}</b><br><small>${esc(u.email)} · ${esc(u.role)}</small></a></p>`)
    .join('');
  res.send(page(`<h2>Demo sign-in</h2><p>Choose who to continue as. This stands in for a provider's account picker.</p>${buttons}`));
});

router.get('/oauth/continue', (req, res) => {
  const user = db.users.find((u) => u.id === req.query.as);
  const redirectUri = String(req.query.redirect_uri ?? '');
  // only back to this app's own callback
  if (!user || !/^http:\/\/(localhost|127\.0\.0\.1):\d+\/api\/auth\/oauth\/callback$/.test(redirectUri)) return res.status(400).send(page('<p>That sign-in request is not valid.</p>'));
  const code = crypto.randomBytes(12).toString('hex');
  db.oauthCodes.set(code, user.id);
  res.redirect(302, `${redirectUri}?code=${code}&state=${encodeURIComponent(String(req.query.state ?? ''))}`);
});

router.get('/signed-in', (req, res) => {
  const user = db.users.find((u) => u.id === db.sessions.get(req.cookies.demo_session));
  res.send(page(user ? `<h2>Signed in as ${esc(user.name)}</h2><p>This browser now has the <code>demo_session</code> cookie. To use it in Sonar, copy its value from the developer tools (Application › Cookies) and add it in Sonar's Auth tab.</p>` : '<h2>Not signed in</h2><p><a href="/api/auth/oauth">Sign in</a></p>'));
});

module.exports = router;
