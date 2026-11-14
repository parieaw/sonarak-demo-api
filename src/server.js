const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`sonar-demo-api listening on http://localhost:${config.port}`);
  if (!config.sessionSecret) console.log('SESSION_SECRET is not set: fine for the demo, sessions are kept in memory');
});
