const express = require('express');
const router = express.Router();
const settlementController = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');
const { authorizeRoles, enforceOwnerScope } = require('../middleware/rbac');

router.use(protect);
router.use(enforceOwnerScope);

router.get('/ledger', settlementController.getOwnerLedger);
router.get('/', settlementController.getOwnerSettlements);
router.post('/', authorizeRoles('super_admin'), settlementController.createSettlement);
router.put('/:id/reconcile', authorizeRoles('super_admin'), settlementController.reconcileSettlement);

module.exports = router;
