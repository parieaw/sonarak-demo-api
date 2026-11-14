const express = require('express');
const cookies = require('./middlewares/cookies');
const errorHandler = require('./middlewares/error.handler');

const app = express();

app.use(express.json());
app.use(cookies);
// one line per request, so the Server panel has something to show
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`));
  next();
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api', require('./routes/misc.routes'));
app.use(require('./routes/provider.routes'));

app.use(errorHandler);

module.exports = app;
