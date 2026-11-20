const OwnerLedger = require('../models/OwnerLedger');
const Settlement = require('../models/Settlement');
const Owner = require('../models/Owner');
const { generateFormattedId } = require('../utils/tokenGenerator');

/**
 * Calculates current ledger balance for an owner
 */
const getOwnerCurrentBalance = async (ownerId) => {
  const lastEntry = await OwnerLedger.findOne({ ownerId }).sort({ createdAt: -1 }).lean();
  return lastEntry ? lastEntry.balanceAfter : 0;
};

/**
 * Records rent and fine collection into owner's financial ledger upon successful payment
 */
const recordPaymentCredit = async (payment) => {
  const owner = await Owner.findById(payment.ownerId);
  if (!owner) throw new Error('Owner not found for payment ledger');

  let currentBalance = await getOwnerCurrentBalance(owner._id);

  // 1. Credit Gross Rent & Fine
  const creditAmount = payment.amount;
  currentBalance += creditAmount;

  await OwnerLedger.create({
    ownerId: owner._id,
    transactionType: payment.finePortion > 0 ? 'fine_credit' : 'rent_credit',
    invoiceId: payment.invoiceId,
    paymentId: payment._id,
    amount: creditAmount,
    balanceAfter: currentBalance,
    description: `Rent payment collected via ${payment.paymentMethod.toUpperCase()} (Ref: ${payment.paymentNumber})`,
    status: 'completed',
  });

  // 2. Gateway Fee Debit (if applicable, e.g. 2%)
  const gatewayFee = payment.gatewayFee || Math.round(payment.amount * 0.02);
  if (gatewayFee > 0) {
    currentBalance -= gatewayFee;
    await OwnerLedger.create({
      ownerId: owner._id,
      transactionType: 'gateway_fee_debit',
      invoiceId: payment.invoiceId,
      paymentId: payment._id,
      amount: -gatewayFee,
      balanceAfter: currentBalance,
      description: `Payment gateway processing fee for ${payment.paymentNumber}`,
      status: 'completed',
    });
  }

  // 3. Platform Commission Debit (if owner has commission rate configured)
  const commissionRate = owner.commissionRate || 0;
  if (commissionRate > 0) {
    const commission = Math.round((payment.baseRentPortion * commissionRate) / 100);
    if (commission > 0) {
      currentBalance -= commission;
      await OwnerLedger.create({
        ownerId: owner._id,
        transactionType: 'platform_commission_debit',
        invoiceId: payment.invoiceId,
        paymentId: payment._id,
        amount: -commission,
        balanceAfter: currentBalance,
        description: `Platform management fee (${commissionRate}%) for ${payment.paymentNumber}`,
        status: 'completed',
      });
    }
  }

  return {
    finalBalance: currentBalance,
    ownerId: owner._id,
  };
};

/**
 * Initiates or executes a settlement payout to the owner
 */
const createOwnerSettlement = async ({
  ownerId,
  amount,
  method = 'manual_bank_transfer',
  bankReferenceNumber = '',
  notes = '',
  createdBy = null,
}) => {
  const owner = await Owner.findById(ownerId);
  if (!owner) throw new Error('Owner not found');

  const currentBalance = await getOwnerCurrentBalance(ownerId);
  if (amount > currentBalance) {
    throw new Error(`Settlement amount (₹${amount}) exceeds available owner balance (₹${currentBalance})`);
  }

  const settlementNumber = await generateFormattedId(Settlement, 'settlementNumber', 'SET-', 4);

  // If method is Razorpay Route and owner has linked account
  let status = 'initiated';
  let settledAt = null;

  if (method === 'manual_bank_transfer' && bankReferenceNumber) {
    // When an admin provides the bank UTR/reference number, mark as settled
    status = 'settled';
    settledAt = new Date();
  }

  const settlement = new Settlement({
    settlementNumber,
    ownerId,
    amount,
    method,
    bankReferenceNumber,
    status,
    settledAt,
    notes,
    createdBy,
  });

  await settlement.save();

  // Deduct from owner ledger
  const newBalance = currentBalance - amount;
  await OwnerLedger.create({
    ownerId,
    transactionType: 'settlement_payout',
    settlementId: settlement._id,
    amount: -amount,
    balanceAfter: newBalance,
    description: `Settlement payout [${settlementNumber}] via ${method.replace('_', ' ').toUpperCase()}${bankReferenceNumber ? ` (Ref: ${bankReferenceNumber})` : ''}`,
    status: status === 'settled' ? 'completed' : 'pending',
  });

  return settlement;
};

module.exports = {
  getOwnerCurrentBalance,
  recordPaymentCredit,
  createOwnerSettlement,
};
