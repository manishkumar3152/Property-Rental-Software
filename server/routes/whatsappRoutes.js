const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(protect);

router.post('/send-single', authorizeRoles('super_admin', 'staff'), whatsappController.sendSingleInvoiceLink);
router.post('/send-bulk', authorizeRoles('super_admin', 'staff'), whatsappController.sendBulkInvoiceLinks);
router.get('/logs', authorizeRoles('super_admin', 'staff'), whatsappController.getMessageLogs);
router.post('/retry/:id', authorizeRoles('super_admin'), whatsappController.retryFailedMessage);

module.exports = router;
