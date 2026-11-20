const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentInvoice',
    required: true,
    index: true,
  },
  agreementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  baseRentPortion: {
    type: Number,
    default: 0,
  },
  finePortion: {
    type: Number,
    default: 0,
  },
  otherChargesPortion: {
    type: Number,
    default: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'netbanking', 'wallet', 'cash', 'bank_transfer', 'cheque'],
    default: 'upi',
  },
  razorpayOrderId: {
    type: String,
    index: true,
  },
  razorpayPaymentId: {
    type: String,
    sparse: true,
    index: true,
  },
  razorpaySignature: {
    type: String,
  },
  razorpayTransferId: {
    type: String,
  },
  gatewayFee: {
    type: Number,
    default: 0,
  },
  tax: {
    type: Number,
    default: 0,
  },
  netSettlementAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['created', 'captured', 'failed', 'refunded'],
    default: 'created',
    index: true,
  },
  failureReason: {
    type: String,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
    index: true,
  },
  receiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receipt',
  },
  verifiedBy: {
    type: String,
    enum: ['razorpay_webhook', 'razorpay_checkout', 'manual_admin', 'simulated_test'],
    default: 'razorpay_checkout',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

paymentSchema.index({ ownerId: 1, paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
