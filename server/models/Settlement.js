const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  settlementNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
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
  method: {
    type: String,
    enum: ['razorpay_route', 'manual_bank_transfer', 'upi', 'cheque'],
    default: 'manual_bank_transfer',
  },
  razorpayTransferId: {
    type: String,
    sparse: true,
  },
  razorpayReversalId: {
    type: String,
  },
  bankReferenceNumber: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['initiated', 'processing', 'settled', 'failed', 'reversed'],
    default: 'initiated',
    index: true,
  },
  failureReason: {
    type: String,
  },
  settledAt: {
    type: Date,
  },
  periodStart: {
    type: Date,
  },
  periodEnd: {
    type: Date,
  },
  notes: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

settlementSchema.index({ ownerId: 1, status: 1 });

module.exports = mongoose.model('Settlement', settlementSchema);
