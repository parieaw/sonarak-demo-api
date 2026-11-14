const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middlewares/validate');
const { requireSession, requireCsrf, requirePermission } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/async.handler');
const { orders } = require('../controllers/order.controller');

const router = express.Router();

// every order route needs the session cookie
router.use(requireSession);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders
 *     description: Staff and admins see every order, a guest sees their own.
 *     tags: [orders]
 */
router.get(
  '/',
  requirePermission('orders.read'),
  query('status').optional().isIn(['pending', 'paid', 'cancelled', 'refunded']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  validate,
  asyncHandler(orders.list),
);

// One order
router.get('/:id', requirePermission('orders.read'), param('id').matches(/^o_\d+$/), validate, asyncHandler(orders.get));

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Place an order
 *     description: Needs the CSRF header. An item that is out of stock is a business failure, answered as 200 with status false.
 *     tags: [orders]
 */
router.post(
  '/',
  requireCsrf,
  requirePermission('orders.write'),
  body('items').isArray({ min: 1, max: 10 }).withMessage('one to ten items'),
  body('items.*.productId').isString().notEmpty(),
  body('items.*.quantity').isInt({ min: 1, max: 20 }),
  body('note').optional().isString().isLength({ max: 280 }),
  validate,
  asyncHandler(orders.create),
);

// Mark an order as paid
router.post('/:id/pay', requireCsrf, requirePermission('orders.write'), asyncHandler(orders.pay));

// Give the money back for a paid order: only who has orders.refund
router.post(
  '/:id/refund',
  requireCsrf,
  requirePermission('orders.refund'),
  body('reason').isString().isLength({ min: 5, max: 200 }).withMessage('say why, in 5 to 200 characters'),
  validate,
  asyncHandler(orders.refund),
);

// Cancel an order
router.delete('/:id', requireCsrf, requirePermission('orders.write'), asyncHandler(orders.cancel));

module.exports = router;
