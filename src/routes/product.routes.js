const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const messages = require('../utils/messages');
const { BusinessError, NotFoundError } = require('../utils/errors');
const { requireSession, requireCsrf, requirePermission } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/async.handler');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads'), limits: { fileSize: 2 * 1024 * 1024 } });

// The menu: open to everyone, no sign-in
router.get('/', (req, res) => {
  const inStock = req.query.inStock === 'true';
  const items = db.products.filter((p) => !inStock || p.stock > 0).map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, hasImage: p.image !== null }));
  res.json({ status: true, result: { items, total: items.length } });
});

// A picture for a product: multipart, with the file in "image" and an optional "caption"
router.post(
  '/:id/image',
  requireSession,
  requireCsrf,
  requirePermission('products.write'),
  upload.single('image'),
  asyncHandler(async (req) => {
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) throw new NotFoundError(messages.PRODUCT_NOT_FOUND);
    if (!req.file) throw new BusinessError(messages.IMAGE_REQUIRED);
    product.image = req.file.filename;
    return { result: { id: product.id, image: req.file.filename, size: req.file.size, caption: req.body.caption ?? '' } };
  }),
);

module.exports = router;
