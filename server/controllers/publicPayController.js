const RentInvoice = require('../models/RentInvoice');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const Receipt = require('../models/Receipt');
const Payment = require('../models/Payment');
const fineService = require('../services/fineService');
const razorpayService = require('../services/razorpayService');

/**
 * Public endpoint to fetch invoice details using secure cryptographic token
 * GET /api/public/pay/:token
 */
const getInvoiceByToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Payment token is required' });
    }

    let invoice = await RentInvoice.findOne({ paymentToken: token });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invalid or expired payment link' });
    }

    // Check expiration of token
    if (invoice.paymentTokenExpiresAt && new Date() > invoice.paymentTokenExpiresAt) {
      return res.status(410).json({ success: false, message: 'This payment link has expired' });
    }

    // Recalculate late fine on server side dynamically (never trust client)
    if (invoice.paymentStatus !== 'Paid') {
      await fineService.recalculateInvoiceFine(invoice._id);
    }

    // Fetch fresh populated invoice
    invoice = await RentInvoice.findById(invoice._id)
      .populate('propertyId', 'propertyName propertyNumber propertyType address')
      .populate('tenantId', 'fullName mobileNumber')
      .populate('ownerId', 'name');

    // Tenant privacy: safe masked name if desired or public display
    const safeTenantName = invoice.tenantId ? invoice.tenantId.fullName : 'Tenant';

    // If paid, fetch receipt details for display/download
    let receipt = null;
    if (invoice.paymentStatus === 'Paid') {
      receipt = await Receipt.findOne({ invoiceId: invoice._id }).select('receiptNumber totalPaid receiptDate transactionId');
    }

    res.status(200).json({
      success: true,
      data: {
        invoiceNumber: invoice.invoiceNumber,
        invoiceMonth: invoice.invoiceMonth,
        property: {
          name: invoice.propertyId?.propertyName,
          number: invoice.propertyId?.propertyNumber,
          type: invoice.propertyId?.propertyType,
          address: invoice.propertyId?.address?.fullAddress,
          city: invoice.propertyId?.address?.city,
        },
        tenant: {
          name: safeTenantName,
        },
        landlord: {
          name: invoice.ownerId?.name,
        },
        financials: {
          baseRent: invoice.isProrated ? invoice.proratedRent : invoice.baseRent,
          isProrated: invoice.isProrated,
          previousOutstanding: invoice.previousOutstanding,
          lateFine: invoice.lateFine,
          otherCharges: invoice.otherCharges,
          discount: invoice.discount,
          totalPayable: invoice.totalPayable,
          amountPaid: invoice.amountPaid,
          balanceAmount: invoice.balanceAmount,
        },
        dueDate: invoice.dueDate,
        paymentStatus: invoice.paymentStatus,
        paidDate: invoice.paidDate,
        receipt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public endpoint to create Razorpay Order for this token
 * POST /api/public/pay/:token/order
 */
const createOrderForToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const invoice = await RentInvoice.findOne({ paymentToken: token });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invalid payment token' });
    }

    // Create server-side order with latest calculated fine
    const orderData = await razorpayService.createRentOrder(invoice._id);

    res.status(200).json({
      success: true,
      data: orderData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public checkout payment verification endpoint
 * POST /api/public/pay/:token/verify
 */
const verifyPaymentForToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentMethod = 'upi' } = req.body;

    const invoice = await RentInvoice.findOne({ paymentToken: token });
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invalid payment token' });
    }

    if (!razorpay_order_id || !razorpay_payment_id) {
      return res.status(400).json({ success: false, message: 'Missing payment transaction reference' });
    }

    // Verify signature
    const isValid = razorpayService.verifyCheckoutSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Security validation failed: Invalid Razorpay payment signature',
      });
    }

    // Process payment atomically
    const result = await razorpayService.processSuccessfulPayment({
      invoiceId: invoice._id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      paymentMethod,
      amount: invoice.totalPayable,
      signature: razorpay_signature,
      verifiedBy: razorpayService.isMockRazorpay() ? 'simulated_test' : 'razorpay_checkout',
    });

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully!',
      data: {
        receiptNumber: result.receipt.receiptNumber,
        receiptId: result.receipt._id,
        amountPaid: result.payment.amount,
        transactionId: razorpay_payment_id,
        paymentDate: result.payment.paymentDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public Tenant Portal: Look up active tenant rent status by mobile number
 * GET /api/public/tenant-portal?phone=9876543210
 */
const getTenantPortalData = async (req, res, next) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10); // last 10 digits

    const tenant = await Tenant.findOne({
      mobileNumber: new RegExp(cleanPhone + '$'),
    })
      .populate('assignedPropertyId', 'propertyName propertyNumber address')
      .populate('assignedOwnerId', 'name');

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'No tenant found with this phone number' });
    }

    // Get invoices
    const invoices = await RentInvoice.find({ tenantId: tenant._id })
      .sort({ invoiceMonth: -1 })
      .select('invoiceNumber invoiceMonth totalPayable amountPaid balanceAmount lateFine dueDate paymentStatus paymentToken paidDate');

    // Get receipts
    const receipts = await Receipt.find({ tenantId: tenant._id })
      .sort({ receiptDate: -1 })
      .select('receiptNumber invoiceNumber invoiceMonth totalPaid receiptDate paymentMethod isDuplicate');

    res.status(200).json({
      success: true,
      data: {
        tenant: {
          fullName: tenant.fullName,
          mobileNumber: tenant.mobileNumber,
          property: tenant.assignedPropertyId,
          owner: tenant.assignedOwnerId,
          securityDepositPaid: tenant.securityDepositPaid,
        },
        invoices,
        receipts,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoiceByToken,
  createOrderForToken,
  verifyPaymentForToken,
  getTenantPortalData,
};
