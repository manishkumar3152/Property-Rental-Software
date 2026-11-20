const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(protect);
router.use(authorizeRoles('super_admin'));

router.get('/', auditLogController.getAuditLogs);

module.exports = router;
