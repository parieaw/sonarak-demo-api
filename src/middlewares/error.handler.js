const { BusinessError, NotFoundError, UnauthorizedError, ForbiddenError } = require('../utils/errors');

// The last middleware: every error ends here.
module.exports = (error, req, res, next) => {
  const keepsItsStatus = error instanceof NotFoundError || error instanceof UnauthorizedError || error instanceof ForbiddenError;

  // a problem with the request itself: 401, 403 or 404
  if (keepsItsStatus) {
    return res.status(error.statusCode).json({ status: false, msg: error.message });
  }

  // a business failure: understood, and the answer is no
  if (error instanceof BusinessError) {
    return res.status(error.statusCode || 200).json({ status: false, msg: error.message });
  }

  // anything else is a bug: log the stack, answer 500
  if (error) {
    console.error(error);
    return res.status(500).json({ status: false, msg: 'Internal Server Error' });
  }

  next();
};
