// Reads the Cookie header into req.cookies. Small enough not to need a dependency.

// a value with a broken %-escape is kept as it was sent, instead of failing the whole request
const decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

module.exports = (req, res, next) => {
  req.cookies = Object.fromEntries(
    (req.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name]) => name)
      .map(([name, ...rest]) => [name, decode(rest.join('='))]),
  );
  next();
};
