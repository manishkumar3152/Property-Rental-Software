const RentInvoice = require('../models/RentInvoice');
const rentService = require('../services/rentService');
const fineService = require('../services/fineService');
const Payment = require('../models/Payment');
const Receipt = require('../models/Receipt');
const { logAudit } = require('../middleware/auditLogger');

const getAllInvoices = async (req, res, next) => {
  try {
    const {
      ownerId,
      propertyId,
      tenantId,
      invoiceMonth,
      paymentStatus,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (req.user.role === 'owner') {
      query.ownerId = req.user.ownerId;
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    if (propertyId) query.propertyId = propertyId;
    if (tenantId) query.tenantId = tenantId;
    if (invoiceMonth) query.invoiceMonth = invoiceMonth;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [invoices, totalCount] = await Promise.all([
      RentInvoice.find(query)
        .populate('tenantId', 'fullName mobileNumber email')
        .populate('propertyId', 'propertyName propertyNumber')
        .populate('ownerId', 'name ownerCode')
        .sort({ invoiceMonth: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      RentInvoice.countDocuments(query),
    ]);

    // Aggregate summary totals for the query
    const stats = await RentInvoice.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: '$totalPayable' },
          totalCollected: { $sum: '$amountPaid' },
          totalPending: { $sum: '$balanceAmount' },
          totalLateFines: { $sum: '$lateFine' },
          overdueCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Overdue'] }, 1, 0] },
          },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, 1, 0] },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: invoices.length,
      totalCount,
      totalPages: Math.ceil(totalCount / Number(limit)),
      currentPage: Number(page),
      summary: stats[0] || {
        totalInvoiced: 0,
        totalCollected: 0,
        totalPending: 0,
        totalLateFines: 0,
        overdueCount: 0,
        paidCount: 0,
      },
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

const getInvoiceById = async (req, res, next) => {
  try {
    let invoice = await RentInvoice.findById(req.params.id)
      .populate('agreementId')
      .populate('tenantId')
      .populate('propertyId')
      .populate('ownerId')
      .populate('manualFineAdjustments.adjustedBy', 'name');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role === 'owner' && invoice.ownerId?._id?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot access invoice of another owner' });
    }

    // Recalculate fine if unpaid
    if (invoice.paymentStatus !== 'Paid') {
      invoice = await fineService.recalculateInvoiceFine(invoice._id);
    }

    const payments = await Payment.find({ invoiceId: invoice._id });
    const receipts = await Receipt.find({ invoiceId: invoice._id });

    res.status(200).json({
      success: true,
      data: {
        ...invoice.toObject(),
        payments,
        receipts,
      },
    });
  } catch (error) {
    next(error);
  }
};

const generateSingleInvoice = async (req, res, next) => {
  try {
    const { agreementId, invoiceMonth } = req.body;

    if (!agreementId || !invoiceMonth) {
      return res.status(400).json({ success: false, message: 'Agreement ID and invoice month (YYYY-MM) are required' });
    }

    const invoice = await rentService.generateInvoiceForAgreement(agreementId, invoiceMonth, req.user._id);

    await logAudit({
      action: 'SINGLE_INVOICE_GENERATED',
      entityType: 'RentInvoice',
      entityId: invoice._id,
      user: req.user,
      req,
      details: `Generated invoice ${invoice.invoiceNumber} for month ${invoiceMonth}`,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

const previewBulkInvoices = async (req, res, next) => {
  try {
    const { invoiceMonth, ownerId } = req.query;

    if (!invoiceMonth) {
      return res.status(400).json({ success: false, message: 'Invoice month (YYYY-MM) is required' });
    }

    const targetOwnerId = req.user.role === 'owner' ? req.user.ownerId : ownerId;
    const preview = await rentService.previewBulkRentInvoices(invoiceMonth, targetOwnerId);

    res.status(200).json({ success: true, data: preview });
  } catch (error) {
    next(error);
  }
};

const generateBulkInvoices = async (req, res, next) => {
  try {
    const { invoiceMonth, ownerId } = req.body;

    if (!invoiceMonth) {
      return res.status(400).json({ success: false, message: 'Invoice month (YYYY-MM) is required' });
    }

    const targetOwnerId = req.user.role === 'owner' ? req.user.ownerId : ownerId;
    const result = await rentService.generateBulkRentInvoices(invoiceMonth, targetOwnerId, req.user._id);

    await logAudit({
      action: 'BULK_INVOICES_GENERATED',
      entityType: 'RentInvoice',
      user: req.user,
      req,
      details: `Bulk generated ${result.generated.length} invoices for ${invoiceMonth}`,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const adjustInvoiceFine = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const { newFineAmount, reason } = req.body;

    if (newFineAmount === undefined || !reason) {
      return res.status(400).json({ success: false, message: 'newFineAmount and reason are mandatory' });
    }

    const invoice = await RentInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'Cannot adjust fine on already paid invoice' });
    }

    const previousFine = invoice.lateFine || 0;
    invoice.lateFine = Number(newFineAmount);

    invoice.manualFineAdjustments.push({
      previousAmount: previousFine,
      adjustedAmount: Number(newFineAmount),
      reason,
      adjustedBy: req.user._id,
      adjustedAt: new Date(),
    });

    // Recalculate total payable
    const rentComponent = invoice.isProrated ? invoice.proratedRent : invoice.baseRent;
    invoice.totalPayable = rentComponent + invoice.previousOutstanding + invoice.lateFine + invoice.otherCharges - invoice.discount;
    invoice.balanceAmount = invoice.totalPayable - invoice.amountPaid;

    await invoice.save();

    await logAudit({
      action: 'FINE_MANUALLY_ADJUSTED',
      entityType: 'RentInvoice',
      entityId: invoice._id,
      user: req.user,
      previousState: { lateFine: previousFine },
      newState: { lateFine: invoice.lateFine },
      req,
      details: `Adjusted fine on ${invoice.invoiceNumber} from ₹${previousFine} to ₹${newFineAmount}. Reason: ${reason}`,
    });

    res.status(200).json({ success: true, message: 'Fine updated with audit log', data: invoice });
  } catch (error) {
    next(error);
  }
};

const recalculateFine = async (req, res, next) => {
  try {
    const invoice = await fineService.recalculateInvoiceFine(req.params.id);
    res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  generateSingleInvoice,
  previewBulkInvoices,
  generateBulkInvoices,
  adjustInvoiceFine,
  recalculateFine,
};
