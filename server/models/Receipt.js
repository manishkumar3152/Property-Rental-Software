const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true,
    index: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentInvoice',
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
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    index: true,
  },
  receiptDate: {
    type: Date,
    default: Date.now,
    index: true,
  },
  tenantName: {
    type: String,
    required: true,
  },
  propertyName: {
    type: String,
    required: true,
  },
  propertyAddress: {
    type: String,
    required: true,
  },
  ownerName: {
    type: String,
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
  },
  invoiceMonth: {
    type: String,
    required: true,
  },
  baseRent: {
    type: Number,
    required: true,
  },
  lateFine: {
    type: Number,
    default: 0,
  },
  otherCharges: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  totalPaid: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
  },
  isDuplicate: {
    type: Boolean,
    default: false,
  },
  duplicateIssuedAt: {
    type: Date,
  },
  duplicateIssuedReason: {
    type: String,
  },
  pdfPath: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

receiptSchema.index({ ownerId: 1, receiptDate: -1 });

module.exports = mongoose.model('Receipt', receiptSchema);
