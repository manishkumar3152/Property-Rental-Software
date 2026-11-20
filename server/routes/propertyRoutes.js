const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { protect } = require('../middleware/auth');
const { authorizeRoles, enforceOwnerScope } = require('../middleware/rbac');

router.use(protect);
router.use(enforceOwnerScope);

router.get('/', propertyController.getAllProperties);
router.get('/:id', propertyController.getPropertyById);
router.post('/', authorizeRoles('super_admin', 'staff'), propertyController.createProperty);
router.put('/:id', authorizeRoles('super_admin', 'owner', 'staff'), propertyController.updateProperty);
router.delete('/:id', authorizeRoles('super_admin'), propertyController.deleteProperty);

module.exports = router;
