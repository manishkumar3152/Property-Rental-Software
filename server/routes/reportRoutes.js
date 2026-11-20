const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');

router.use(protect);
router.use(authorizeRoles('super_admin', 'owner'));

router.get('/owner-wise', reportController.getOwnerWiseCollection);
router.get('/property-wise', reportController.getPropertyWiseIncome);
router.get('/tenant-wise/:tenantId', reportController.getTenantWiseLedger);
router.get('/monthly-rent', reportController.getMonthlyRentCollection);
router.get('/pending', reportController.getPendingRent);
router.get('/overdue', reportController.getOverdueRent);
router.get('/fine-collection', reportController.getFineCollection);
router.get('/agreement-expiry', reportController.getAgreementExpiry);
router.get('/agreement-renewal', reportController.getAgreementRenewal);
router.get('/razorpay-transactions', reportController.getRazorpayTransactions);
router.get('/owner-settlements', reportController.getOwnerSettlements);
router.get('/property-occupancy', reportController.getPropertyOccupancy);

module.exports = router;
