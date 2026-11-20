const Owner = require('../models/Owner');
const OwnerLedger = require('../models/OwnerLedger');
const Settlement = require('../models/Settlement');
const settlementService = require('../services/settlementService');
const { logAudit } = require('../middleware/auditLogger');

const getOwnerLedger = async (req, res, next) => {
  try {
    let ownerId = req.user.role === 'owner' ? req.user.ownerId : (req.query.ownerId || req.params.ownerId);

    // If super admin and no ownerId provided, default to first active owner if available
    if (!ownerId && req.user.role === 'super_admin') {
      const firstOwner = await Owner.findOne().sort({ createdAt: 1 });
      if (firstOwner) {
        ownerId = firstOwner._id;
      }
    }

    if (!ownerId) {
      return res.status(200).json({
        success: true,
        currentBalance: 0,
        count: 0,
        data: [],
      });
    }

    const entries = await OwnerLedger.find({ ownerId })
      .populate('ownerId', 'name ownerCode')
      .populate('invoiceId', 'invoiceNumber invoiceMonth')
      .populate('paymentId', 'paymentNumber paymentMethod')
      .populate('settlementId', 'settlementNumber method bankReferenceNumber')
      .sort({ createdAt: -1 });

    const currentBalance = await settlementService.getOwnerCurrentBalance(ownerId);

    res.status(200).json({
      success: true,
      currentBalance,
      count: entries.length,
      data: entries,
    });
  } catch (error) {
    next(error);
  }
};

const getOwnerSettlements = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.role === 'owner') {
      query.ownerId = req.user.ownerId;
    } else if (req.query.ownerId) {
      query.ownerId = req.query.ownerId;
    }

    const settlements = await Settlement.find(query)
      .populate('ownerId', 'name ownerCode bankDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: settlements.length, data: settlements });
  } catch (error) {
    next(error);
  }
};

const createSettlement = async (req, res, next) => {
  try {
    const { ownerId, amount, method, bankReferenceNumber, notes } = req.body;

    if (!ownerId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid ownerId and positive amount are required' });
    }

    const settlement = await settlementService.createOwnerSettlement({
      ownerId,
      amount: Number(amount),
      method: method || 'manual_bank_transfer',
      bankReferenceNumber,
      notes,
      createdBy: req.user._id,
    });

    await logAudit({
      action: 'SETTLEMENT_CREATED',
      entityType: 'Settlement',
      entityId: settlement._id,
      user: req.user,
      req,
      details: `Created owner settlement ${settlement.settlementNumber} of ₹${amount} via ${method}`,
    });

    res.status(201).json({ success: true, data: settlement });
  } catch (error) {
    next(error);
  }
};

const reconcileSettlement = async (req, res, next) => {
  try {
    const { status, bankReferenceNumber, notes } = req.body;
    const settlement = await Settlement.findById(req.params.id);

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    settlement.status = status;
    if (bankReferenceNumber) settlement.bankReferenceNumber = bankReferenceNumber;
    if (status === 'settled') settlement.settledAt = new Date();
    if (notes) settlement.notes = notes;

    await settlement.save();

    await logAudit({
      action: 'SETTLEMENT_RECONCILED',
      entityType: 'Settlement',
      entityId: settlement._id,
      user: req.user,
      req,
      details: `Reconciled settlement ${settlement.settlementNumber} to status '${status}'`,
    });

    res.status(200).json({ success: true, data: settlement });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOwnerLedger,
  getOwnerSettlements,
  createSettlement,
  reconcileSettlement,
};
