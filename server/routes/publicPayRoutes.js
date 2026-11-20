const express = require('express');
const router = express.Router();
const publicPayController = require('../controllers/publicPayController');

// Public tenant payment links
router.get('/pay/:token', publicPayController.getInvoiceByToken);
router.post('/pay/:token/order', publicPayController.createOrderForToken);
router.post('/pay/:token/verify', publicPayController.verifyPaymentForToken);

// Public tenant portal
router.get('/tenant-portal', publicPayController.getTenantPortalData);

module.exports = router;
