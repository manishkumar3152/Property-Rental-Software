const FineRule = require('../models/FineRule');
const Agreement = require('../models/Agreement');
const RentInvoice = require('../models/RentInvoice');
const ApplicationSettings = require('../models/ApplicationSettings');

/**
 * Calculates the server-side late payment fine for an invoice as of a specific date (default: now)
 * @param {Object} invoice - RentInvoice document or object
 * @param {Date} asOfDate - Date to calculate fine for (defaults to current server time)
 * @returns {Object} - { fineAmount, daysLate, gracePeriodDays, ruleType, ruleApplied }
 */
const calculateFineForInvoice = async (invoice, asOfDate = new Date()) => {
  // If invoice is already paid, return existing fine (fine stops increasing after payment)
  if (invoice.paymentStatus === 'Paid' && invoice.paidDate) {
    return {
      fineAmount: invoice.lateFine || 0,
      daysLate: 0,
      ruleApplied: 'Preserved from payment confirmation',
      isFrozen: true,
    };
  }

  const dueDate = new Date(invoice.dueDate);
  const targetDate = new Date(asOfDate);

  // If before or on due date, fine is 0
  if (targetDate <= dueDate) {
    return {
      fineAmount: 0,
      daysLate: 0,
      gracePeriodDays: 0,
      ruleType: 'none',
      ruleApplied: 'Due date not exceeded',
    };
  }

  // Load agreement to check custom fine rules
  let agreement = null;
  if (invoice.agreementId) {
    agreement = await Agreement.findById(invoice.agreementId).lean();
  }

  // Determine grace period
  const gracePeriodDays = agreement?.gracePeriod !== undefined ? agreement.gracePeriod : 3;

  // Calculate difference in whole days
  const diffTime = targetDate.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // If within grace period, fine is 0
  if (diffDays <= gracePeriodDays) {
    return {
      fineAmount: 0,
      daysLate: diffDays,
      gracePeriodDays,
      ruleType: 'grace_period',
      ruleApplied: `Within grace period (${gracePeriodDays} days)`,
    };
  }

  // Days subject to fine
  const chargeableDays = diffDays - gracePeriodDays;

  // Check agreement fine config or fallback to owner/global settings
  let fineType = agreement?.fineType || 'per_day';
  let fineValue = agreement?.fineValue !== undefined ? agreement.fineValue : 100;
  let maxFineLimit = agreement?.maxFineLimit !== undefined ? agreement.maxFineLimit : 2000;

  // Check if there is an explicit FineRule linked
  if (agreement?.fineRuleId) {
    const customRule = await FineRule.findById(agreement.fineRuleId).lean();
    if (customRule && customRule.isActive) {
      fineType = customRule.ruleType;
      fineValue = customRule.ruleType === 'percentage' ? customRule.percentage : customRule.amount;
      maxFineLimit = customRule.maxFineLimit || maxFineLimit;
    }
  }

  let calculatedFine = 0;
  let ruleApplied = '';

  switch (fineType) {
    case 'fixed':
      calculatedFine = fineValue;
      ruleApplied = `Fixed fine of ₹${fineValue} after ${gracePeriodDays} days grace`;
      break;

    case 'per_day':
      calculatedFine = chargeableDays * fineValue;
      ruleApplied = `₹${fineValue}/day for ${chargeableDays} day(s) late (after ${gracePeriodDays} days grace)`;
      break;

    case 'percentage':
      calculatedFine = Math.round((invoice.baseRent * fineValue) / 100);
      ruleApplied = `${fineValue}% of base rent (₹${invoice.baseRent}) after grace period`;
      break;

    case 'none':
    default:
      calculatedFine = 0;
      ruleApplied = 'No fine rule applicable';
      break;
  }

  // Apply maximum fine limit if configured
  if (maxFineLimit > 0 && calculatedFine > maxFineLimit) {
    calculatedFine = maxFineLimit;
    ruleApplied += ` (Capped at maximum ₹${maxFineLimit})`;
  }

  return {
    fineAmount: calculatedFine,
    daysLate: diffDays,
    chargeableDays,
    gracePeriodDays,
    ruleType: fineType,
    ruleApplied,
  };
};

/**
 * Updates an invoice with fresh server-calculated fine and recalculates totalPayable
 */
const recalculateInvoiceFine = async (invoiceId, asOfDate = new Date()) => {
  const invoice = await RentInvoice.findById(invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  if (invoice.paymentStatus === 'Paid') {
    return invoice; // Never alter paid invoices
  }

  const { fineAmount, daysLate, ruleApplied } = await calculateFineForInvoice(invoice, asOfDate);

  const previousFine = invoice.lateFine || 0;
  invoice.lateFine = fineAmount;
  invoice.fineCalculatedAt = new Date();

  // If fine changed or days late increased, log to history
  if (fineAmount !== previousFine || daysLate > 0) {
    invoice.fineCalculationHistory.push({
      calculatedAt: new Date(),
      fineAmount,
      daysLate,
      ruleApplied,
    });
  }

  // If overdue, update status
  const dueDate = new Date(invoice.dueDate);
  if (asOfDate > dueDate && invoice.paymentStatus === 'Unpaid') {
    invoice.paymentStatus = 'Overdue';
  }

  // Recalculate total payable
  const rentComponent = invoice.isProrated ? invoice.proratedRent : invoice.baseRent;
  invoice.totalPayable = rentComponent + invoice.previousOutstanding + invoice.lateFine + invoice.otherCharges - invoice.discount;
  invoice.balanceAmount = invoice.totalPayable - invoice.amountPaid;

  await invoice.save();
  return invoice;
};

module.exports = {
  calculateFineForInvoice,
  recalculateInvoiceFine,
};
