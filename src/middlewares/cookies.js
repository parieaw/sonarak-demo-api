// Reads the Cookie header into req.cookies. Small enough not to need a dependency.
module.exports = (req, res, next) => {
  req.cookies = Object.fromEntries(
    (req.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name]) => name)
      .map(([name, ...rest]) => [name, decodeURIComponent(rest.join('='))]),
  );
  next();
};
