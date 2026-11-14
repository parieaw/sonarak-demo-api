const { response } = require('../utils/respond');

// Runs a controller that returns its answer, and sends it in the envelope. What the controller throws
// goes to the error handler.
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res);
    return res.json(response({ ...result }));
  } catch (error) {
    return next(error);
  }
};

module.exports = { asyncHandler };
