const db = require('../db');
const messages = require('../utils/messages');
const { BusinessError, NotFoundError, ForbiddenError } = require('../utils/errors');

// The same product can be on more than one line: the stock is checked against the sum of them
function priceOf(items) {
  const wanted = new Map();
  for (const item of items) wanted.set(item.productId, (wanted.get(item.productId) ?? 0) + Number(item.quantity));
  let total = 0;
  for (const [productId, quantity] of wanted) {
    const product = db.products.find((p) => p.id === productId);
    if (!product) throw new NotFoundError(messages.PRODUCT_NOT_FOUND);
    if (product.stock < quantity) throw new BusinessError(messages.OUT_OF_STOCK);
    total += product.price * quantity;
  }
  return total;
}

// Paying or cancelling: only the person who placed the order, or an admin
function assertCanChange(order, user) {
  if (user.role !== 'admin' && order.userId !== user.id) throw new ForbiddenError(messages.NOT_YOUR_ORDER);
}

async function listOrders({ user, status, page, limit }) {
  // staff and admins see every order; a guest sees their own
  const mine = user.role === 'guest' ? db.orders.filter((o) => o.userId === user.id) : db.orders;
  const matching = status ? mine.filter((o) => o.status === status) : mine;
  const start = (page - 1) * limit;
  return { items: matching.slice(start, start + limit), page, limit, total: matching.length };
}

async function findOrder(id, user) {
  const order = db.orders.find((o) => o.id === id);
  if (!order) throw new NotFoundError(messages.ORDER_NOT_FOUND);
  if (user.role === 'guest' && order.userId !== user.id) throw new ForbiddenError(messages.NOT_YOUR_ORDER);
  return order;
}

async function createOrder({ user, items, note }) {
  const total = priceOf(items);
  for (const item of items) {
    db.products.find((p) => p.id === item.productId).stock -= Number(item.quantity);
  }
  const order = { id: db.nextOrderId(), userId: user.id, items: items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })), note: note ?? '', status: 'pending', total, createdAt: new Date().toISOString() };
  db.orders.push(order);
  return order;
}

async function payOrder(id, user) {
  const order = await findOrder(id, user);
  assertCanChange(order, user);
  if (order.status === 'paid') throw new BusinessError(messages.ORDER_ALREADY_PAID);
  if (order.status === 'cancelled') throw new BusinessError(messages.ORDER_CANCELLED);
  order.status = 'paid';
  return order;
}

// Cancelling puts what the order took back in stock
async function cancelOrder(id, user) {
  const order = await findOrder(id, user);
  assertCanChange(order, user);
  if (order.status === 'paid') throw new BusinessError(messages.ORDER_ALREADY_PAID);
  if (order.status === 'cancelled') throw new BusinessError(messages.ORDER_CANCELLED);
  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (product) product.stock += Number(item.quantity);
  }
  order.status = 'cancelled';
  return order;
}

module.exports = { listOrders, findOrder, createOrder, payOrder, cancelOrder };
