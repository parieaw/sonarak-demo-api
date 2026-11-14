const orderService = require('../services/order.service');

// These return their answer; asyncHandler sends it inside the envelope.
module.exports.orders = {
  list: async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const result = await orderService.listOrders({ user: res.locals.user, status: req.query.status, page, limit });
    return { result };
  },

  get: async (req, res) => {
    const result = await orderService.findOrder(req.params.id, res.locals.user);
    return { result };
  },

  create: async (req, res) => {
    const result = await orderService.createOrder({ user: res.locals.user, items: req.body.items, note: req.body.note });
    return { result };
  },

  pay: async (req, res) => {
    const order = await orderService.payOrder(req.params.id, res.locals.user);
    return { result: { id: order.id, status: order.status, paidAt: new Date().toISOString() } };
  },

  cancel: async (req, res) => {
    const order = await orderService.cancelOrder(req.params.id, res.locals.user);
    return { result: { id: order.id, status: order.status } };
  },
};
