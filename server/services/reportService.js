const mongoose = require('mongoose');
const RentInvoice = require('../models/RentInvoice');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const Agreement = require('../models/Agreement');
const Owner = require('../models/Owner');
const Settlement = require('../models/Settlement');
const OwnerLedger = require('../models/OwnerLedger');

/**
 * 1. Owner-wise Rent Collection Report
 */
const getOwnerWiseCollectionReport = async (filters = {}) => {
  const match = {};
  if (filters.ownerId) match.ownerId = new mongoose.Types.ObjectId(filters.ownerId);
  if (filters.month) match.invoiceMonth = filters.month;
  if (filters.status) match.paymentStatus = filters.status;

  const data = await RentInvoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$ownerId',
        totalInvoiced: { $sum: '$totalPayable' },
        totalCollected: { $sum: '$amountPaid' },
        totalPending: { $sum: '$balanceAmount' },
        totalFineCollected: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$lateFine', 0],
          },
        },
        invoiceCount: { $sum: 1 },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'owners',
        localField: '_id',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: '$owner' },
    {
      $project: {
        ownerId: '$_id',
        ownerName: '$owner.name',
        ownerCode: '$owner.ownerCode',
        totalInvoiced: 1,
        totalCollected: 1,
        totalPending: 1,
        totalFineCollected: 1,
        invoiceCount: 1,
        paidCount: 1,
        collectionRate: {
          $cond: [
            { $gt: ['$totalInvoiced', 0] },
            { $round: [{ $multiply: [{ $divide: ['$totalCollected', '$totalInvoiced'] }, 100] }, 1] },
            0,
          ],
        },
      },
    },
    { $sort: { totalCollected: -1 } },
  ]);

  return data;
};

/**
 * 2. Property-wise Income Report
 */
const getPropertyWiseIncomeReport = async (filters = {}) => {
  const match = {};
  if (filters.ownerId) match.ownerId = new mongoose.Types.ObjectId(filters.ownerId);
  if (filters.propertyId) match.propertyId = new mongoose.Types.ObjectId(filters.propertyId);
  if (filters.month) match.invoiceMonth = filters.month;

  const data = await RentInvoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$propertyId',
        ownerId: { $first: '$ownerId' },
        totalIncome: { $sum: '$amountPaid' },
        pendingRent: { $sum: '$balanceAmount' },
        finesCollected: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$lateFine', 0] },
        },
        invoiceCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'properties',
        localField: '_id',
        foreignField: '_id',
        as: 'property',
      },
    },
    { $unwind: '$property' },
    {
      $lookup: {
        from: 'owners',
        localField: 'ownerId',
        foreignField: '_id',
        as: 'owner',
      },
    },
    { $unwind: '$owner' },
    {
      $project: {
        propertyId: '$_id',
        propertyName: '$property.propertyName',
        propertyNumber: '$property.propertyNumber',
        propertyType: '$property.propertyType',
        ownerName: '$owner.name',
        totalIncome: 1,
        pendingRent: 1,
        finesCollected: 1,
        invoiceCount: 1,
      },
    },
    { $sort: { totalIncome: -1 } },
  ]);

  return data;
};

/**
 * 3. Tenant-wise Ledger Report
 */
const getTenantWiseLedgerReport = async (tenantId) => {
  const invoices = await RentInvoice.find({ tenantId })
    .populate('propertyId', 'propertyName propertyNumber')
    .sort({ invoiceMonth: -1 });

  const payments = await Payment.find({ tenantId }).sort({ paymentDate: -1 });

  return {
    invoices,
    payments,
  };
};

/**
 * 4. Monthly Rent Collection Report (Historical Trends)
 */
const getMonthlyRentCollectionReport = async (filters = {}) => {
  const match = {};
  if (filters.ownerId) match.ownerId = new mongoose.Types.ObjectId(filters.ownerId);

  const data = await RentInvoice.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$invoiceMonth',
        totalInvoiced: { $sum: '$totalPayable' },
        totalCollected: { $sum: '$amountPaid' },
        totalOverdue: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'Overdue'] }, '$balanceAmount', 0] },
        },
        finesCollected: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$lateFine', 0] },
        },
        totalInvoices: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return data;
};

/**
 * 5. Pending Rent Report
 */
const getPendingRentReport = async (filters = {}) => {
  const query = { paymentStatus: { $in: ['Unpaid', 'Partially Paid'] } };
  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.month) query.invoiceMonth = filters.month;

  return await RentInvoice.find(query)
    .populate('tenantId', 'fullName mobileNumber email')
    .populate('propertyId', 'propertyName propertyNumber')
    .populate('ownerId', 'name ownerCode')
    .sort({ dueDate: 1 });
};

/**
 * 6. Overdue Rent Report
 */
const getOverdueRentReport = async (filters = {}) => {
  const query = { paymentStatus: 'Overdue' };
  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.month) query.invoiceMonth = filters.month;

  return await RentInvoice.find(query)
    .populate('tenantId', 'fullName mobileNumber email')
    .populate('propertyId', 'propertyName propertyNumber')
    .populate('ownerId', 'name ownerCode')
    .sort({ dueDate: 1 });
};

/**
 * 7. Fine Collection Report
 */
const getFineCollectionReport = async (filters = {}) => {
  const query = { lateFine: { $gt: 0 } };
  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.month) query.invoiceMonth = filters.month;

  return await RentInvoice.find(query)
    .populate('tenantId', 'fullName mobileNumber')
    .populate('propertyId', 'propertyName propertyNumber')
    .populate('ownerId', 'name')
    .select('invoiceNumber invoiceMonth lateFine baseRent totalPayable amountPaid paymentStatus dueDate paidDate')
    .sort({ lateFine: -1 });
};

/**
 * 8. Agreement Expiry Report
 */
const getAgreementExpiryReport = async (filters = {}) => {
  const daysAhead = parseInt(filters.days || '60', 10);
  const now = new Date();
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const query = {
    status: { $in: ['Active', 'Expiring'] },
    agreementEndDate: { $gte: now, $lte: future },
  };

  if (filters.ownerId) query.ownerId = filters.ownerId;

  return await Agreement.find(query)
    .populate('tenantId', 'fullName mobileNumber')
    .populate('propertyId', 'propertyName propertyNumber')
    .populate('ownerId', 'name')
    .sort({ agreementEndDate: 1 });
};

/**
 * 9. Agreement Renewal Report
 */
const getAgreementRenewalReport = async (filters = {}) => {
  const query = { 'renewalHistory.0': { $exists: true } };
  if (filters.ownerId) query.ownerId = filters.ownerId;

  return await Agreement.find(query)
    .populate('tenantId', 'fullName mobileNumber')
    .populate('propertyId', 'propertyName propertyNumber')
    .populate('ownerId', 'name')
    .select('agreementNumber monthlyRent rentIncrementPercentage renewalHistory status')
    .sort({ updatedAt: -1 });
};

/**
 * 10. Razorpay Transaction Report
 */
const getRazorpayTransactionReport = async (filters = {}) => {
  const query = {};
  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.status) query.status = filters.status;
  if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

  return await Payment.find(query)
    .populate('tenantId', 'fullName')
    .populate('propertyId', 'propertyName propertyNumber')
    .populate('ownerId', 'name')
    .populate('invoiceId', 'invoiceNumber invoiceMonth')
    .sort({ paymentDate: -1 });
};

/**
 * 11. Owner Settlement Report
 */
const getOwnerSettlementReport = async (filters = {}) => {
  const query = {};
  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.status) query.status = filters.status;

  return await Settlement.find(query)
    .populate('ownerId', 'name ownerCode bankDetails')
    .sort({ createdAt: -1 });
};

/**
 * 12. Property Occupancy Report
 */
const getPropertyOccupancyReport = async (filters = {}) => {
  const query = {};
  if (filters.ownerId) query.ownerId = filters.ownerId;

  const properties = await Property.find(query)
    .populate('ownerId', 'name ownerCode')
    .populate('currentTenantId', 'fullName mobileNumber')
    .populate('currentAgreementId', 'monthlyRent agreementEndDate');

  const summary = {
    total: properties.length,
    occupied: properties.filter(p => p.availabilityStatus === 'Occupied').length,
    available: properties.filter(p => p.availabilityStatus === 'Available').length,
    maintenance: properties.filter(p => p.availabilityStatus === 'Maintenance').length,
    inactive: properties.filter(p => p.availabilityStatus === 'Inactive').length,
    occupancyRate: properties.length > 0 ? Math.round((properties.filter(p => p.availabilityStatus === 'Occupied').length / properties.length) * 100) : 0,
  };

  return {
    summary,
    properties,
  };
};

module.exports = {
  getOwnerWiseCollectionReport,
  getPropertyWiseIncomeReport,
  getTenantWiseLedgerReport,
  getMonthlyRentCollectionReport,
  getPendingRentReport,
  getOverdueRentReport,
  getFineCollectionReport,
  getAgreementExpiryReport,
  getAgreementRenewalReport,
  getRazorpayTransactionReport,
  getOwnerSettlementReport,
  getPropertyOccupancyReport,
};
