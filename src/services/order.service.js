const config = require('../config');
const db = require('../db');
const messages = require('../utils/messages');
const { BusinessError, NotFoundError, ForbiddenError } = require('../utils/errors');

function priceOf(items) {
  let total = 0;
  for (const item of items) {
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) throw new NotFoundError(messages.PRODUCT_NOT_FOUND);
    if (product.stock < item.quantity) throw new BusinessError(messages.OUT_OF_STOCK);
    total += product.price * item.quantity;
  }
  return total;
}

async function listOrders({ user, status, page, limit }) {
  // staff and admins see every order; a guest sees their own
  const mine = user.role === 'guest' ? db.orders.filter((o) => o.userId === user.id) : db.orders;
  const matching = status ? mine.filter((o) => o.status === status) : mine;
  const start = (page - 1) * limit;
  return { items: matching.slice(start, start + limit), page, limit, total: matching.length, hasMore: start + limit < matching.length };
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
    db.products.find((p) => p.id === item.productId).stock -= item.quantity;
  }
  const order = { id: db.nextOrderId(), userId: user.id, items, note: note ?? '', status: 'pending', total, createdAt: new Date().toISOString() };
  db.orders.push(order);
  return order;
}

async function payOrder(id, user) {
  const order = await findOrder(id, user);
  if (order.status === 'paid') throw new BusinessError(messages.ORDER_ALREADY_PAID);
  if (order.status === 'cancelled') throw new BusinessError(messages.ORDER_CANCELLED);
  order.status = 'paid';
  return order;
}

async function cancelOrder(id, user) {
  const order = await findOrder(id, user);
  if (order.status === 'paid') throw new BusinessError(messages.ORDER_ALREADY_PAID);
  order.status = 'cancelled';
  return order;
}

async function refundOrder(id, user, reason) {
  if (!config.refundsEnabled) throw new BusinessError(messages.REFUNDS_ARE_OFF);
  const order = await findOrder(id, user);
  if (order.status !== 'paid') throw new BusinessError(messages.ORDER_NOT_PAID);
  order.status = 'refunded';
  return { id: order.id, status: order.status, refunded: order.total, reason };
}

module.exports = { listOrders, findOrder, createOrder, payOrder, cancelOrder, refundOrder };
