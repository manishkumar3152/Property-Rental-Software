const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { protect } = require('../middleware/auth');
const { authorizeRoles, enforceOwnerScope } = require('../middleware/rbac');

router.use(protect);
router.use(enforceOwnerScope);

router.get('/', tenantController.getAllTenants);
router.get('/:id', tenantController.getTenantById);
router.post('/', authorizeRoles('super_admin', 'staff'), tenantController.createTenant);
router.put('/:id', authorizeRoles('super_admin', 'staff', 'owner'), tenantController.updateTenant);
router.delete('/:id', authorizeRoles('super_admin'), tenantController.deleteTenant);

module.exports = router;
