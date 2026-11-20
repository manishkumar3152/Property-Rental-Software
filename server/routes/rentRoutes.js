const express = require('express');
const router = express.Router();
const rentController = require('../controllers/rentController');
const { protect } = require('../middleware/auth');
const { authorizeRoles, enforceOwnerScope } = require('../middleware/rbac');

router.use(protect);
router.use(enforceOwnerScope);

router.get('/', rentController.getAllInvoices);
router.get('/preview-bulk', authorizeRoles('super_admin', 'staff'), rentController.previewBulkInvoices);
router.get('/:id', rentController.getInvoiceById);

router.post('/generate-single', authorizeRoles('super_admin', 'staff'), rentController.generateSingleInvoice);
router.post('/generate-bulk', authorizeRoles('super_admin', 'staff'), rentController.generateBulkInvoices);
router.post('/:id/adjust-fine', authorizeRoles('super_admin'), rentController.adjustInvoiceFine);
router.post('/:id/recalculate-fine', rentController.recalculateFine);

module.exports = router;
