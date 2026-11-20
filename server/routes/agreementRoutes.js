const express = require('express');
const router = express.Router();
const agreementController = require('../controllers/agreementController');
const { protect } = require('../middleware/auth');
const { authorizeRoles, enforceOwnerScope } = require('../middleware/rbac');

router.use(protect);
router.use(enforceOwnerScope);

router.get('/', agreementController.getAllAgreements);
router.get('/:id', agreementController.getAgreementById);
router.get('/:id/pdf', agreementController.downloadAgreementPdf);
router.post('/', authorizeRoles('super_admin', 'staff'), agreementController.createAgreement);
router.post('/:id/renew', authorizeRoles('super_admin', 'owner', 'staff'), agreementController.renewAgreement);
router.post('/:id/terminate', authorizeRoles('super_admin'), agreementController.terminateAgreement);

module.exports = router;
