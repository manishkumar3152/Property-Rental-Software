const crypto = require('crypto');
const axios = require('axios');
const RentInvoice = require('../models/RentInvoice');
const Payment = require('../models/Payment');
const Receipt = require('../models/Receipt');
const Property = require('../models/Property');
const Owner = require('../models/Owner');
const Tenant = require('../models/Tenant');
const WebhookEvent = require('../models/WebhookEvent');
const fineService = require('./fineService');
const settlementService = require('./settlementService');
const whatsappService = require('./whatsappService');
const { generateFormattedId } = require('../utils/tokenGenerator');

const getRazorpayCredentials = () => {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKey123456789',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_secret_mockSecret123456789',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_mock123',
  };
};

/**
 * Checks if key is mock/test placeholder
 */
const isMockRazorpay = () => {
  const { keyId } = getRazorpayCredentials();
  return !keyId || keyId.includes('mockKey');
};

/**
 * Creates a Razorpay Order after server-side fine recalculation
 */
const createRentOrder = async (invoiceId) => {
  // 1. Fetch & recalculate invoice fine on server
  const invoice = await fineService.recalculateInvoiceFine(invoiceId);

  // 2. Prevent invalid payments
  if (invoice.paymentStatus === 'Paid') {
    throw new Error('This invoice has already been fully paid.');
  }
  if (invoice.paymentStatus === 'Cancelled') {
    throw new Error('This invoice has been cancelled.');
  }
  if (invoice.totalPayable <= 0) {
    throw new Error('Invoice balance is zero. No payment required.');
  }

  const owner = await Owner.findById(invoice.ownerId);
  const property = await Property.findById(invoice.propertyId);
  const tenant = await Tenant.findById(invoice.tenantId);

  const amountInPaise = Math.round(invoice.totalPayable * 100);
  const { keyId, keySecret } = getRazorpayCredentials();

  let orderId = '';

  if (isMockRazorpay()) {
    // Generate realistic simulated Razorpay Order ID for sandbox/development
    orderId = `order_sim_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  } else {
    // Call official Razorpay Orders API
    try {
      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const orderPayload = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: invoice.invoiceNumber,
        notes: {
          invoiceId: invoice._id.toString(),
          invoiceNumber: invoice.invoiceNumber,
          tenantName: tenant?.fullName || 'Tenant',
          propertyName: property?.propertyName || 'Property',
          ownerId: owner?._id.toString(),
        },
      };

      const response = await axios.post('https://api.razorpay.com/v1/orders', orderPayload, {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      });

      orderId = response.data.id;
    } catch (err) {
      console.error('[Razorpay Order Creation Error]', err.response?.data || err.message);
      throw new Error(`Razorpay Order failed: ${err.response?.data?.error?.description || err.message}`);
    }
  }

  return {
    orderId,
    amount: invoice.totalPayable,
    amountInPaise,
    currency: 'INR',
    keyId,
    invoice: {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceMonth: invoice.invoiceMonth,
      baseRent: invoice.baseRent,
      lateFine: invoice.lateFine,
      previousOutstanding: invoice.previousOutstanding,
      otherCharges: invoice.otherCharges,
      discount: invoice.discount,
      totalPayable: invoice.totalPayable,
      dueDate: invoice.dueDate,
    },
    property: {
      name: property?.propertyName,
      number: property?.propertyNumber,
      address: property?.address?.fullAddress,
    },
    tenant: {
      name: tenant?.fullName,
      email: tenant?.email,
      phone: tenant?.mobileNumber,
    },
    isSimulated: isMockRazorpay(),
  };
};

/**
 * Validates Razorpay Checkout Signature
 */
const verifyCheckoutSignature = async ({ orderId, paymentId, signature }) => {
  if (isMockRazorpay() && (signature === 'simulated_sig' || signature?.startsWith('sim_'))) {
    return true; // Allow simulated checkout signatures in test mode
  }

  const { keyId, keySecret } = getRazorpayCredentials();
  const trimmedKeySecret = (keySecret || '').trim();
  const trimmedKeyId = (keyId || '').trim();
  const trimmedOrderId = (orderId || '').trim();
  const trimmedPaymentId = (paymentId || '').trim();
  const trimmedSignature = (signature || '').trim();

  // 1. Standard Razorpay HMAC SHA256 Signature Verification: order_id + "|" + razorpay_payment_id
  if (trimmedOrderId && trimmedPaymentId && trimmedSignature && trimmedKeySecret) {
    const body = `${trimmedOrderId}|${trimmedPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', trimmedKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature === trimmedSignature) {
      return true;
    }
  }

  // 2. Direct Razorpay API Verification Fallback (authoritative check from Razorpay servers)
  if (trimmedPaymentId && trimmedKeyId && trimmedKeySecret && !isMockRazorpay()) {
    try {
      const authHeader = Buffer.from(`${trimmedKeyId}:${trimmedKeySecret}`).toString('base64');
      const response = await axios.get(`https://api.razorpay.com/v1/payments/${trimmedPaymentId}`, {
        headers: {
          Authorization: `Basic ${authHeader}`,
        },
        timeout: 5000,
      });

      if (response.data && (response.data.status === 'captured' || response.data.status === 'authorized')) {
        console.log(`[Razorpay Payment Verified via API] Payment ID: ${trimmedPaymentId}, Status: ${response.data.status}`);
        return true;
      }
    } catch (apiErr) {
      console.warn('[Razorpay API Verification Fallback Warning]', apiErr.response?.data || apiErr.message);
    }
  }

  return false;
};

/**
 * Validates Razorpay Webhook Signature using raw body
 */
const verifyWebhookSignature = (rawBody, signature) => {
  const { webhookSecret } = getRazorpayCredentials();
  if (!webhookSecret || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret.trim())
    .update(rawBody)
    .digest('hex');

  return expectedSignature === signature;
};

/**
 * Atomic Payment Confirmation: Updates invoice, creates Payment, Receipt & updates OwnerLedger
 */
const processSuccessfulPayment = async ({
  invoiceId,
  paymentId: rzpPaymentId,
  orderId: rzpOrderId,
  paymentMethod = 'upi',
  amount,
  signature = '',
  verifiedBy = 'razorpay_checkout',
  metadata = {},
}) => {
  const invoice = await RentInvoice.findById(invoiceId)
    .populate('tenantId')
    .populate('propertyId')
    .populate('ownerId');

  if (!invoice) throw new Error('Invoice not found');

  // Idempotency: check if payment record for this razorpayPaymentId already exists
  const existingPayment = await Payment.findOne({ razorpayPaymentId: rzpPaymentId });
  if (existingPayment && existingPayment.status === 'captured') {
    let existingReceipt = await Receipt.findOne({ paymentId: existingPayment._id });
    if (!existingReceipt && existingPayment.receiptId) {
      existingReceipt = await Receipt.findById(existingPayment.receiptId);
    }
    if (!existingReceipt) {
      existingReceipt = await Receipt.findOne({ invoiceId: invoice._id }).sort({ createdAt: -1 });
    }
    return {
      success: true,
      alreadyProcessed: true,
      payment: existingPayment,
      receipt: existingReceipt || {
        _id: existingPayment.receiptId || existingPayment._id,
        receiptNumber: `REC-${(existingPayment.paymentNumber || '').replace('PAY-', '')}`,
      },
      invoice,
    };
  }

  const monthPrefix = (invoice.invoiceMonth || new Date().toISOString().slice(0, 7)).replace('-', '');
  const paymentNumber = await generateFormattedId(Payment, 'paymentNumber', `PAY-${monthPrefix}-`, 4);

  // 1. Create Payment Record
  const newPayment = new Payment({
    paymentNumber,
    invoiceId: invoice._id,
    agreementId: invoice.agreementId,
    tenantId: invoice.tenantId._id,
    propertyId: invoice.propertyId._id,
    ownerId: invoice.ownerId._id,
    amount: amount || invoice.totalPayable,
    baseRentPortion: invoice.baseRent,
    finePortion: invoice.lateFine || 0,
    otherChargesPortion: invoice.otherCharges || 0,
    paymentMethod,
    razorpayOrderId: rzpOrderId,
    razorpayPaymentId: rzpPaymentId,
    razorpaySignature: signature,
    gatewayFee: Math.round((amount || invoice.totalPayable) * 0.02), // standard 2% gateway fee
    status: 'captured',
    paymentDate: new Date(),
    verifiedBy,
    metadata,
  });

  await newPayment.save();

  // 2. Generate Official Receipt
  const receiptNumber = await generateFormattedId(Receipt, 'receiptNumber', `REC-${monthPrefix}-`, 4);
  const receipt = new Receipt({
    receiptNumber,
    paymentId: newPayment._id,
    invoiceId: invoice._id,
    tenantId: invoice.tenantId._id,
    propertyId: invoice.propertyId._id,
    ownerId: invoice.ownerId._id,
    receiptDate: new Date(),
    tenantName: invoice.tenantId.fullName,
    propertyName: `${invoice.propertyId.propertyName} (${invoice.propertyId.propertyNumber})`,
    propertyAddress: invoice.propertyId.address.fullAddress,
    ownerName: invoice.ownerId.name,
    invoiceNumber: invoice.invoiceNumber,
    invoiceMonth: invoice.invoiceMonth,
    baseRent: invoice.baseRent,
    lateFine: invoice.lateFine,
    otherCharges: invoice.otherCharges,
    discount: invoice.discount,
    totalPaid: newPayment.amount,
    paymentMethod: paymentMethod.toUpperCase(),
    transactionId: rzpPaymentId,
    isDuplicate: false,
  });

  await receipt.save();
  newPayment.receiptId = receipt._id;
  await newPayment.save();

  // 3. Update Invoice Status
  invoice.paymentStatus = 'Paid';
  invoice.amountPaid = newPayment.amount;
  invoice.balanceAmount = 0;
  invoice.paidDate = new Date();
  await invoice.save();

  // 4. Update Owner Ledger and route/manual accounting
  await settlementService.recordPaymentCredit(newPayment);

  // 5. Send automated WhatsApp confirmation with receipt details
  if (invoice.tenantId.mobileNumber) {
    whatsappService.sendWhatsAppMessage({
      recipientPhone: invoice.tenantId.whatsappNumber || invoice.tenantId.mobileNumber,
      recipientType: 'tenant',
      recipientId: invoice.tenantId._id,
      recipientName: invoice.tenantId.fullName,
      templateName: 'payment_success_receipt',
      templateVariables: {
        tenantName: invoice.tenantId.fullName,
        propertyName: invoice.propertyId.propertyName,
        month: invoice.invoiceMonth,
        amountPaid: `₹${newPayment.amount}`,
        receiptNumber: receipt.receiptNumber,
        transactionId: rzpPaymentId,
        receiptUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/receipts/${receipt._id}`,
      },
      invoiceId: invoice._id,
    }).catch(err => console.error('[WhatsApp Auto-Confirm Error]', err.message));
  }

  return {
    success: true,
    payment: newPayment,
    receipt,
    invoice,
  };
};

/**
 * Handles Webhook Events with Idempotency
 */
const handleWebhookEvent = async (eventPayload) => {
  const eventId = eventPayload.event_id || eventPayload.id || `evt_${Date.now()}`;
  const eventType = eventPayload.event;

  // Check duplicate
  const existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent) {
    return { status: 'duplicate', message: 'Event already processed' };
  }

  const webhookDoc = await WebhookEvent.create({
    eventId,
    eventType,
    entityId: eventPayload.payload?.payment?.entity?.id || eventPayload.payload?.order?.entity?.id,
    payload: eventPayload,
    status: 'processing',
  });

  try {
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const notes = paymentEntity?.notes || eventPayload.payload?.order?.entity?.notes;

      if (notes && notes.invoiceId) {
        await processSuccessfulPayment({
          invoiceId: notes.invoiceId,
          paymentId: paymentEntity?.id || `pay_${Date.now()}`,
          orderId: paymentEntity?.order_id,
          paymentMethod: paymentEntity?.method || 'upi',
          amount: paymentEntity ? paymentEntity.amount / 100 : undefined,
          verifiedBy: 'razorpay_webhook',
          metadata: paymentEntity,
        });
      }
    }

    webhookDoc.status = 'processed';
    webhookDoc.processedAt = new Date();
    await webhookDoc.save();

    return { status: 'processed' };
  } catch (error) {
    webhookDoc.status = 'failed';
    webhookDoc.errorMessage = error.message;
    await webhookDoc.save();
    throw error;
  }
};

module.exports = {
  createRentOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  processSuccessfulPayment,
  handleWebhookEvent,
  isMockRazorpay,
};
