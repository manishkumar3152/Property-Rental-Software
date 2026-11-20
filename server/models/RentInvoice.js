const mongoose = require('mongoose');

const rentInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  invoiceMonth: {
    type: String, // e.g. '2026-11'
    required: true,
    index: true,
  },
  agreementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    required: true,
    index: true,
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
    index: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    index: true,
  },
  baseRent: {
    type: Number,
    required: true,
    min: 0,
  },
  proratedRent: {
    type: Number,
    default: 0,
  },
  isProrated: {
    type: Boolean,
    default: false,
  },
  previousOutstanding: {
    type: Number,
    default: 0,
    min: 0,
  },
  lateFine: {
    type: Number,
    default: 0,
    min: 0,
  },
  fineCalculatedAt: {
    type: Date,
  },
  fineCalculationHistory: [{
    calculatedAt: { type: Date, default: Date.now },
    fineAmount: { type: Number },
    daysLate: { type: Number },
    ruleApplied: { type: String },
  }],
  otherCharges: {
    type: Number,
    default: 0,
  },
  otherChargesDescription: {
    type: String,
  },
  discount: {
    type: Number,
    default: 0,
  },
  totalPayable: {
    type: Number,
    required: true,
    min: 0,
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0,
  },
  balanceAmount: {
    type: Number,
    default: 0,
  },
  dueDate: {
    type: Date,
    required: true,
    index: true,
  },
  paymentStatus: {
    type: String,
    enum: ['Upcoming', 'Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled', 'Adjusted'],
    default: 'Unpaid',
    index: true,
  },
  paymentToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  paymentTokenExpiresAt: {
    type: Date,
  },
  manualFineAdjustments: [{
    adjustedAmount: { type: Number },
    previousAmount: { type: Number },
    reason: { type: String, required: true },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adjustedAt: { type: Date, default: Date.now },
  }],
  paidDate: {
    type: Date,
  },
  whatsappShareCount: {
    type: Number,
    default: 0,
  },
  lastWhatsappSentAt: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

rentInvoiceSchema.index({ agreementId: 1, invoiceMonth: 1 }, { unique: true });
rentInvoiceSchema.index({ ownerId: 1, paymentStatus: 1 });
rentInvoiceSchema.index({ tenantId: 1, paymentStatus: 1 });

module.exports = mongoose.model('RentInvoice', rentInvoiceSchema);
