const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('../db');
const messages = require('../utils/messages');
const { BusinessError, BadRequestError, NotFoundError } = require('../utils/errors');
const { requireSession, requireCsrf, requirePermission } = require('../middlewares/auth');
const { asyncHandler } = require('../middlewares/async.handler');

const router = express.Router();
const upload = multer({
  dest: path.join(__dirname, '..', '..', 'uploads'),
  limits: { fileSize: 2 * 1024 * 1024 },
  // pictures only: anything else is refused before it is written to disk
  fileFilter: (req, file, done) => (file.mimetype.startsWith('image/') ? done(null, true) : done(new BadRequestError(messages.IMAGE_TYPE_NOT_ALLOWED))),
});

// The product has to exist before the upload is read, so no file is saved for one that does not
const findProduct = (req, res, next) => {
  res.locals.product = db.products.find((p) => p.id === req.params.id);
  if (!res.locals.product) return next(new NotFoundError(messages.PRODUCT_NOT_FOUND));
  next();
};

// The menu: open to everyone, no sign-in
router.get('/', (req, res) => {
  const inStock = req.query.inStock === 'true';
  const items = db.products.filter((p) => !inStock || p.stock > 0).map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, hasImage: p.image !== null }));
  res.json({ status: true, result: { items, total: items.length } });
});

// Today's prices: slow on purpose. It asks the pricing service once per product, one after another
// (an N+1 over HTTP), which Sonarak's Timeline shows with the line below that makes the call.
router.get(
  '/prices',
  asyncHandler(async (req, res) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    const items = [];
    for (const p of db.products) {
      const r = await fetch(`${origin}/api/products/${p.id}/price`);
      const { price } = await r.json();
      items.push({ id: p.id, name: p.name, price });
    }
    return { result: { items, total: items.length } };
  }),
);

// The pretend pricing service the route above calls: 25 ms per product
router.get('/:id/price', findProduct, (req, res) => {
  setTimeout(() => res.json({ id: res.locals.product.id, price: res.locals.product.price }), 25);
});

// A picture for a product: multipart, with the file in "image" and an optional "caption"
router.post(
  '/:id/image',
  requireSession,
  requireCsrf,
  requirePermission('products.write'),
  findProduct,
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const { product } = res.locals;
    if (!req.file) throw new BusinessError(messages.IMAGE_REQUIRED);
    product.image = req.file.filename;
    return { result: { id: product.id, image: req.file.filename, size: req.file.size, caption: req.body.caption ?? '' } };
  }),
);

module.exports = router;
