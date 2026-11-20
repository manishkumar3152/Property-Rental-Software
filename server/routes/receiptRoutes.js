const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { protect } = require('../middleware/auth');
const { authorizeRoles, enforceOwnerScope } = require('../middleware/rbac');

router.use(protect);
router.use(enforceOwnerScope);

router.get('/', receiptController.getAllReceipts);
router.get('/:id', receiptController.getReceiptById);
router.get('/:id/pdf', receiptController.downloadReceiptPdf);
router.post('/:id/duplicate', authorizeRoles('super_admin', 'staff'), receiptController.issueDuplicateReceipt);

module.exports = router;
