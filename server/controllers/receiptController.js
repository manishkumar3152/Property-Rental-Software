const Receipt = require('../models/Receipt');
const pdfService = require('../services/pdfService');
const { logAudit } = require('../middleware/auditLogger');

const getAllReceipts = async (req, res, next) => {
  try {
    const { ownerId, tenantId, propertyId, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (req.user.role === 'owner') {
      query.ownerId = req.user.ownerId;
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    if (tenantId) query.tenantId = tenantId;
    if (propertyId) query.propertyId = propertyId;
    if (search) {
      query.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { tenantName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [receipts, totalCount] = await Promise.all([
      Receipt.find(query)
        .populate('tenantId', 'fullName mobileNumber')
        .populate('propertyId', 'propertyName propertyNumber')
        .populate('ownerId', 'name ownerCode')
        .sort({ receiptDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Receipt.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: receipts.length,
      totalCount,
      data: receipts,
    });
  } catch (error) {
    next(error);
  }
};

const getReceiptById = async (req, res, next) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('tenantId')
      .populate('propertyId')
      .populate('ownerId')
      .populate('paymentId')
      .populate('invoiceId');

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    if (req.user.role === 'owner' && receipt.ownerId?._id?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot access receipt of another owner' });
    }

    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    next(error);
  }
};

const downloadReceiptPdf = async (req, res, next) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    if (req.user.role === 'owner' && receipt.ownerId?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot download receipt of another owner' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Receipt-${receipt.receiptNumber}.pdf`);

    pdfService.generateReceiptPDF(receipt, res);
  } catch (error) {
    next(error);
  }
};

const issueDuplicateReceipt = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    receipt.isDuplicate = true;
    receipt.duplicateIssuedAt = new Date();
    receipt.duplicateIssuedReason = reason || 'Duplicate requested by tenant';
    await receipt.save();

    await logAudit({
      action: 'DUPLICATE_RECEIPT_ISSUED',
      entityType: 'Payment',
      entityId: receipt._id,
      user: req.user,
      req,
      details: `Issued duplicate receipt ${receipt.receiptNumber}. Reason: ${receipt.duplicateIssuedReason}`,
    });

    res.status(200).json({
      success: true,
      message: 'Duplicate receipt marked successfully',
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReceipts,
  getReceiptById,
  downloadReceiptPdf,
  issueDuplicateReceipt,
};
