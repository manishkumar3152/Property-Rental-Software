const reportService = require('../services/reportService');

const getEffectiveOwnerId = (req) => {
  if (req.user.role === 'owner') return req.user.ownerId;
  return req.query.ownerId || null;
};

const getOwnerWiseCollection = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
      month: req.query.month,
      status: req.query.status,
    };
    const data = await reportService.getOwnerWiseCollectionReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getPropertyWiseIncome = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
      propertyId: req.query.propertyId,
      month: req.query.month,
    };
    const data = await reportService.getPropertyWiseIncomeReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getTenantWiseLedger = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const data = await reportService.getTenantWiseLedgerReport(tenantId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getMonthlyRentCollection = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
    };
    const data = await reportService.getMonthlyRentCollectionReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getPendingRent = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
      propertyId: req.query.propertyId,
      month: req.query.month,
    };
    const data = await reportService.getPendingRentReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getOverdueRent = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
      propertyId: req.query.propertyId,
      month: req.query.month,
    };
    const data = await reportService.getOverdueRentReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getFineCollection = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
      month: req.query.month,
    };
    const data = await reportService.getFineCollectionReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getAgreementExpiry = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
      days: req.query.days || 60,
    };
    const data = await reportService.getAgreementExpiryReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getAgreementRenewal = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
    };
    const data = await reportService.getAgreementRenewalReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getRazorpayTransactions = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
      status: req.query.status,
      paymentMethod: req.query.paymentMethod,
    };
    const data = await reportService.getRazorpayTransactionReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getOwnerSettlements = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
      status: req.query.status,
    };
    const data = await reportService.getOwnerSettlementReport(filters);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

const getPropertyOccupancy = async (req, res, next) => {
  try {
    const filters = {
      ownerId: getEffectiveOwnerId(req),
    };
    const data = await reportService.getPropertyOccupancyReport(filters);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOwnerWiseCollection,
  getPropertyWiseIncome,
  getTenantWiseLedger,
  getMonthlyRentCollection,
  getPendingRent,
  getOverdueRent,
  getFineCollection,
  getAgreementExpiry,
  getAgreementRenewal,
  getRazorpayTransactions,
  getOwnerSettlements,
  getPropertyOccupancy,
};
