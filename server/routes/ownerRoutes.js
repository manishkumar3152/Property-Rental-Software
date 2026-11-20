const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(protect);

// Super admin can see all owners; owners can see their own profile
router.get('/', authorizeRoles('super_admin'), ownerController.getAllOwners);
router.get('/:id', authorizeRoles('super_admin', 'owner'), ownerController.getOwnerById);
router.post('/', authorizeRoles('super_admin'), ownerController.createOwner);
router.put('/:id', authorizeRoles('super_admin'), ownerController.updateOwner);
router.put('/:id/route-account', authorizeRoles('super_admin'), ownerController.updateRazorpayRouteAccount);
router.delete('/:id', authorizeRoles('super_admin'), ownerController.deleteOwner);

module.exports = router;
