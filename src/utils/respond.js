const messages = require('./messages');

// Every success is wrapped the same way: { status: true, msg: 'SUCCESS', ...what the controller returned }
const response = (data) => ({ status: true, msg: messages.SUCCESS, ...data });

module.exports = { response };
