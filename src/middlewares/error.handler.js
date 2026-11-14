const messages = require('../utils/messages');
const { BusinessError, BadRequestError } = require('../utils/errors');

// What a library throws for a bad request (a body that is not JSON, a file that is too big), as the
// error the API would have thrown itself. Anything else is left as it is.
function fromLibrary(error) {
  if (error instanceof BusinessError) return error;
  if (error.type === 'entity.parse.failed') return new BadRequestError(messages.INVALID_JSON);
  if (error.name === 'MulterError') {
    return error.code === 'LIMIT_FILE_SIZE' ? new BusinessError(messages.FILE_TOO_LARGE, 413) : new BadRequestError(messages.UPLOAD_FAILED);
  }
  // body-parser and friends mark any other client error with a 4xx status
  const status = error.status ?? error.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) return new BusinessError(messages.BAD_REQUEST, status);
  return error;
}

// The last middleware: every error ends here.
module.exports = (thrown, req, res, next) => {
  if (!thrown) return next();
  const error = fromLibrary(thrown);

  // a business failure answers 200 ("understood, and the answer is no"); a problem with the request
  // itself keeps its status: 400, 401, 403, 404, 413. See src/utils/errors.js
  if (error instanceof BusinessError) {
    return res.status(error.statusCode).json({ status: false, msg: error.message });
  }

  // anything else is a bug: log the stack, answer 500
  console.error(error);
  return res.status(500).json({ status: false, msg: 'Internal Server Error' });
};
