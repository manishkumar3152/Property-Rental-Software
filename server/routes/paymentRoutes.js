const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { authorizeRoles, enforceOwnerScope } = require('../middleware/rbac');

router.use(protect);
router.use(enforceOwnerScope);

router.get('/', paymentController.getAllPayments);
router.get('/:id', paymentController.getPaymentById);
router.post('/manual', authorizeRoles('super_admin', 'staff'), paymentController.recordManualPayment);

module.exports = router;
