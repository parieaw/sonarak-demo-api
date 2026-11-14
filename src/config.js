// Every setting the API reads from the environment, in one place. The server starts with none of
// them set; what cannot work without a value says so when it is used.
const fs = require('fs');
const path = require('path');

// a tiny .env reader, so the demo has no dependency for it
const file = path.join(__dirname, '..', '.env');
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const port = Number(process.env.PORT ?? 4100);

module.exports = {
  port,
  baseUrl: process.env.PUBLIC_URL || `http://localhost:${port}`,
  sessionSecret: process.env.SESSION_SECRET,
  paymentApiKey: process.env.PAYMENT_API_KEY,
  mailFrom: process.env.MAIL_FROM || 'orders@example.test',
  // not in .env.example: a teammate would not know it exists
  refundsEnabled: process.env.FEATURE_REFUNDS,
  logLevel: process.env.LOG_LEVEL ?? 'info',
};
