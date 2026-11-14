// What the API throws. The error handler (src/middlewares/error.handler.js) turns each into a response.
//
// A business failure ("out of stock", "already paid") is answered as HTTP 200 with
// { status: false, msg }: the request was understood, the answer is no. Problems with the request
// itself keep their HTTP status: 401, 403, 404.

/** A business failure: HTTP 200 with { status: false, msg } */
class BusinessError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'BusinessError';
    this.statusCode = statusCode ?? 200;
  }
}

class NotFoundError extends BusinessError {
  constructor(message = 'NOT_FOUND') {
    super(message, 404);
  }
}

class UnauthorizedError extends BusinessError {
  constructor(message = 'NOT_SIGNED_IN') {
    super(message, 401);
  }
}

class ForbiddenError extends BusinessError {
  constructor(message = 'NO_PERMISSION') {
    super(message, 403);
  }
}

module.exports = { BusinessError, NotFoundError, UnauthorizedError, ForbiddenError };
