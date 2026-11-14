// The data, in memory. It is seeded the same way every time the server starts, so there is nothing
// to install and nothing to clean up.
const users = [
  { id: 'u_admin', email: 'admin@demo.test', password: 'demo1234', name: 'Ada Admin', role: 'admin', permissions: ['orders.read', 'orders.write', 'orders.refund', 'products.write'] },
  { id: 'u_staff', email: 'staff@demo.test', password: 'demo1234', name: 'Sam Staff', role: 'staff', permissions: ['orders.read', 'orders.write'] },
  { id: 'u_guest', email: 'guest@demo.test', password: 'demo1234', name: 'Gus Guest', role: 'guest', permissions: ['orders.read'] },
];

const products = [
  { id: 'p_latte', name: 'Latte', price: 95, stock: 40, image: null },
  { id: 'p_mocha', name: 'Mocha', price: 110, stock: 12, image: null },
  { id: 'p_scone', name: 'Scone', price: 60, stock: 0, image: null },
];

const orders = [
  { id: 'o_1001', userId: 'u_staff', items: [{ productId: 'p_latte', quantity: 2 }], note: 'no sugar', status: 'paid', total: 190, createdAt: '2026-11-01T09:00:00.000Z' },
  { id: 'o_1002', userId: 'u_staff', items: [{ productId: 'p_mocha', quantity: 1 }], note: '', status: 'pending', total: 110, createdAt: '2026-11-02T10:30:00.000Z' },
  { id: 'o_1003', userId: 'u_admin', items: [{ productId: 'p_latte', quantity: 1 }, { productId: 'p_mocha', quantity: 1 }], note: '', status: 'cancelled', total: 205, createdAt: '2026-11-03T14:15:00.000Z' },
];

const feedback = [];
/** session id → user id */
const sessions = new Map();
/** bearer token → user id */
const tokens = new Map();
/** one-time code from the pretend sign-in provider → user id */
const oauthCodes = new Map();

let seq = 1003;
const nextOrderId = () => `o_${++seq}`;

module.exports = { users, products, orders, feedback, sessions, tokens, oauthCodes, nextOrderId };
