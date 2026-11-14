const db = require('../db');

async function salesSummary() {
  const paid = db.orders.filter((o) => o.status === 'paid');
  return { orders: paid.length, revenue: paid.reduce((sum, o) => sum + o.total, 0), currency: 'THB' };
}

// This one has a bug on purpose: an order whose product was removed has no `product`, and reading
// `.name` of it throws. The error handler logs the stack and answers 500. Send it from Sonar with the
// server started in the Server panel to see the stack trace next to the response.
async function dailyReport() {
  const lines = db.orders.map((order) => {
    const first = order.items[0];
    const product = db.products.find((p) => p.id === `${first.productId}_archived`);
    return { order: order.id, product: product.name, total: order.total };
  });
  return { lines };
}

module.exports = { salesSummary, dailyReport };
