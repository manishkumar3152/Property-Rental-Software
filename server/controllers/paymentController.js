const Payment = require('../models/Payment');
const RentInvoice = require('../models/RentInvoice');
const razorpayService = require('../services/razorpayService');
const { logAudit } = require('../middleware/auditLogger');

const getAllPayments = async (req, res, next) => {
  try {
    const { ownerId, tenantId, propertyId, status, paymentMethod, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (req.user.role === 'owner') {
      query.ownerId = req.user.ownerId;
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    if (tenantId) query.tenantId = tenantId;
    if (propertyId) query.propertyId = propertyId;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, totalCount] = await Promise.all([
      Payment.find(query)
        .populate('tenantId', 'fullName mobileNumber')
        .populate('propertyId', 'propertyName propertyNumber')
        .populate('ownerId', 'name ownerCode')
        .populate('invoiceId', 'invoiceNumber invoiceMonth')
        .populate('receiptId', 'receiptNumber')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    const totalCollected = await Payment.aggregate([
      { $match: { ...query, status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    res.status(200).json({
      success: true,
      count: payments.length,
      totalCount,
      totalCollected: totalCollected[0]?.total || 0,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('tenantId')
      .populate('propertyId')
      .populate('ownerId')
      .populate('invoiceId')
      .populate('receiptId');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    if (req.user.role === 'owner' && payment.ownerId?._id?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot access payment of another owner' });
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

const recordManualPayment = async (req, res, next) => {
  try {
    const { invoiceId, paymentMethod = 'cash', amount, referenceNumber, notes } = req.body;

    const invoice = await RentInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'Invoice is already paid' });
    }

    const payAmount = Number(amount || invoice.totalPayable);

    const result = await razorpayService.processSuccessfulPayment({
      invoiceId: invoice._id,
      paymentId: referenceNumber || `MANUAL_${Date.now()}`,
      orderId: `MANUAL_ORDER_${Date.now()}`,
      paymentMethod,
      amount: payAmount,
      verifiedBy: 'manual_admin',
      metadata: { recordedBy: req.user.name, notes },
    });

    await logAudit({
      action: 'MANUAL_PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: result.payment._id,
      user: req.user,
      req,
      details: `Recorded manual ${paymentMethod} payment of ₹${payAmount} for invoice ${invoice.invoiceNumber}`,
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded and receipt generated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  recordManualPayment,
};
