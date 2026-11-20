const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(protect);
router.use(authorizeRoles('super_admin'));

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/trigger-job', settingsController.triggerManualJob);

module.exports = router;
