const express = require('express');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { requireSession } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/async.handler');
const { auth } = require('../controllers/auth.controller');

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Sign in with an email and a password
 *     description: Sets the session cookie and returns an access token. Use either one afterwards. The demo accounts are admin@demo.test, staff@demo.test and guest@demo.test, all with the password demo1234.
 *     tags: [auth]
 */
router.post('/login', body('email').isEmail().withMessage('must be an email'), body('password').isString().isLength({ min: 4 }), validate, auth.login);

// Sign out: forgets the session
router.post('/logout', requireSession, asyncHandler(auth.logout));

// Who is signed in
router.get('/me', requireSession, asyncHandler(auth.me));

// A CSRF token, for the routes that change something with the session cookie
router.get('/csrf', auth.csrf);

// Sign in with the pretend provider: a redirect, like "Sign in with Google"
router.get('/oauth', auth.oauthStart);
router.get('/oauth/callback', auth.oauthCallback);

module.exports = router;
