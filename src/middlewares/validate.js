const { validationResult } = require('express-validator');

// After the express-validator chains of a route: answers 400 with the fields that failed.
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, msg: 'VALIDATION_FAILED', errors: errors.array().map((e) => ({ field: e.path, message: e.msg })) });
  }
  next();
};
