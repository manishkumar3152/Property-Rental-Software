const mongoose = require('mongoose');

const ownerLedgerSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    index: true,
  },
  transactionType: {
    type: String,
    enum: [
      'rent_credit',
      'fine_credit',
      'gateway_fee_debit',
      'platform_commission_debit',
      'settlement_payout',
      'adjustment',
    ],
    required: true,
    index: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentInvoice',
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  settlementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Settlement',
  },
  amount: {
    type: Number,
    required: true, // positive for credit, negative for debit
  },
  balanceAfter: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed',
  },
}, {
  timestamps: true,
});

ownerLedgerSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('OwnerLedger', ownerLedgerSchema);
