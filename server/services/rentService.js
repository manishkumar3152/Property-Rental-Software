const RentInvoice = require('../models/RentInvoice');
const Agreement = require('../models/Agreement');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const { generateSecureToken, generateFormattedId } = require('../utils/tokenGenerator');

/**
 * Calculates days in a specific month (YYYY-MM)
 */
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

/**
 * Checks if agreement started or ends in this month and calculates prorated rent if needed
 */
const calculateRentAmount = (agreement, invoiceMonth) => {
  const [yearStr, monthStr] = invoiceMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed

  const daysInMonth = getDaysInMonth(year, month);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59));

  const agrStart = new Date(agreement.agreementStartDate);
  const agrEnd = new Date(agreement.agreementEndDate);

  let activeDays = daysInMonth;
  let isProrated = false;

  // Mid-month start
  if (agrStart > monthStart && agrStart <= monthEnd) {
    const startDay = agrStart.getUTCDate();
    activeDays = daysInMonth - startDay + 1;
    isProrated = true;
  }

  // Mid-month end
  if (agrEnd >= monthStart && agrEnd < monthEnd) {
    const endDay = agrEnd.getUTCDate();
    activeDays = Math.min(activeDays, endDay);
    isProrated = true;
  }

  if (isProrated && activeDays < daysInMonth && activeDays > 0) {
    const dailyRate = agreement.monthlyRent / daysInMonth;
    const proratedRent = Math.round(dailyRate * activeDays);
    return {
      baseRent: agreement.monthlyRent,
      proratedRent,
      isProrated: true,
      activeDays,
      totalDays: daysInMonth,
    };
  }

  return {
    baseRent: agreement.monthlyRent,
    proratedRent: 0,
    isProrated: false,
    activeDays: daysInMonth,
    totalDays: daysInMonth,
  };
};

/**
 * Generates an invoice for a single active agreement for a given month (YYYY-MM)
 */
const generateInvoiceForAgreement = async (agreementId, invoiceMonth, createdBy = null) => {
  const agreement = await Agreement.findById(agreementId)
    .populate('propertyId')
    .populate('tenantId')
    .populate('ownerId');

  if (!agreement) {
    throw new Error('Agreement not found');
  }

  if (agreement.status !== 'Active' && agreement.status !== 'Expiring') {
    throw new Error(`Agreement is not active (Status: ${agreement.status})`);
  }

  // Check for duplicate invoice
  const existingInvoice = await RentInvoice.findOne({
    agreementId: agreement._id,
    invoiceMonth,
  });

  if (existingInvoice) {
    throw new Error(`Invoice already exists for this agreement in month ${invoiceMonth} (${existingInvoice.invoiceNumber})`);
  }

  // Check previous outstanding balance
  const previousUnpaidInvoices = await RentInvoice.find({
    agreementId: agreement._id,
    invoiceMonth: { $ne: invoiceMonth },
    paymentStatus: { $in: ['Unpaid', 'Overdue', 'Partially Paid'] },
  }).select('balanceAmount totalPayable amountPaid');

  const previousOutstanding = previousUnpaidInvoices.reduce((sum, inv) => {
    return sum + (inv.balanceAmount || (inv.totalPayable - inv.amountPaid) || 0);
  }, 0);

  // Rent calculation (including prorated check)
  const rentCalc = calculateRentAmount(agreement, invoiceMonth);
  const effectiveRent = rentCalc.isProrated ? rentCalc.proratedRent : rentCalc.baseRent;

  // Calculate Due Date: default to agreement's monthlyDueDate or 10th of that month
  const [yearStr, monthStr] = invoiceMonth.split('-');
  const dueDay = agreement.monthlyDueDate || 10;
  const dueDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, dueDay, 23, 59, 59);

  // Generate unique formatted invoice number: e.g. INV-202611-0001
  const cleanMonthPrefix = invoiceMonth.replace('-', '');
  const invoiceNumber = await generateFormattedId(RentInvoice, 'invoiceNumber', `INV-${cleanMonthPrefix}-`, 4);

  // Generate cryptographically secure payment token for public checkout URL
  const paymentToken = generateSecureToken(32);
  const tokenExpiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 180 days validity

  const totalPayable = effectiveRent + previousOutstanding;

  const invoice = new RentInvoice({
    invoiceNumber,
    invoiceMonth,
    agreementId: agreement._id,
    tenantId: agreement.tenantId._id,
    propertyId: agreement.propertyId._id,
    ownerId: agreement.ownerId._id,
    baseRent: rentCalc.baseRent,
    proratedRent: rentCalc.proratedRent,
    isProrated: rentCalc.isProrated,
    previousOutstanding,
    lateFine: 0,
    otherCharges: 0,
    discount: 0,
    totalPayable,
    amountPaid: 0,
    balanceAmount: totalPayable,
    dueDate,
    paymentStatus: 'Unpaid',
    paymentToken,
    paymentTokenExpiresAt: tokenExpiresAt,
    createdBy,
  });

  await invoice.save();
  return invoice;
};

/**
 * Preview bulk invoice generation for a month without writing to DB
 */
const previewBulkRentInvoices = async (invoiceMonth, filterOwnerId = null) => {
  const query = { status: { $in: ['Active', 'Expiring'] } };
  if (filterOwnerId) {
    query.ownerId = filterOwnerId;
  }

  const activeAgreements = await Agreement.find(query)
    .populate('propertyId', 'propertyName propertyNumber monthlyBaseRent')
    .populate('tenantId', 'fullName mobileNumber')
    .populate('ownerId', 'name ownerCode');

  const existingInvoices = await RentInvoice.find({
    invoiceMonth,
    agreementId: { $in: activeAgreements.map(a => a._id) },
  }).select('agreementId invoiceNumber');

  const existingMap = new Set(existingInvoices.map(i => i.agreementId.toString()));

  const previewList = [];

  for (const agr of activeAgreements) {
    const isAlreadyGenerated = existingMap.has(agr._id.toString());
    const rentCalc = calculateRentAmount(agr, invoiceMonth);
    const effectiveRent = rentCalc.isProrated ? rentCalc.proratedRent : rentCalc.baseRent;

    previewList.push({
      agreementId: agr._id,
      agreementNumber: agr.agreementNumber,
      owner: agr.ownerId ? { id: agr.ownerId._id, name: agr.ownerId.name, code: agr.ownerId.ownerCode } : null,
      property: agr.propertyId ? { id: agr.propertyId._id, name: agr.propertyId.propertyName, number: agr.propertyId.propertyNumber } : null,
      tenant: agr.tenantId ? { id: agr.tenantId._id, name: agr.tenantId.fullName, phone: agr.tenantId.mobileNumber } : null,
      monthlyRent: agr.monthlyRent,
      effectiveRent,
      isProrated: rentCalc.isProrated,
      activeDays: rentCalc.activeDays,
      dueDay: agr.monthlyDueDate || 10,
      alreadyGenerated: isAlreadyGenerated,
    });
  }

  return {
    invoiceMonth,
    totalAgreements: activeAgreements.length,
    newToGenerate: previewList.filter(p => !p.alreadyGenerated).length,
    alreadyGeneratedCount: previewList.filter(p => p.alreadyGenerated).length,
    items: previewList,
  };
};

/**
 * Bulk generate invoices for active agreements for a given month
 */
const generateBulkRentInvoices = async (invoiceMonth, filterOwnerId = null, createdBy = null) => {
  const query = { status: { $in: ['Active', 'Expiring'] } };
  if (filterOwnerId) {
    query.ownerId = filterOwnerId;
  }

  const activeAgreements = await Agreement.find(query);

  const results = {
    generated: [],
    skipped: [],
    errors: [],
  };

  for (const agr of activeAgreements) {
    try {
      // Check if already exists
      const existing = await RentInvoice.findOne({
        agreementId: agr._id,
        invoiceMonth,
      });

      if (existing) {
        results.skipped.push({
          agreementId: agr._id,
          agreementNumber: agr.agreementNumber,
          reason: `Already generated: ${existing.invoiceNumber}`,
        });
        continue;
      }

      const invoice = await generateInvoiceForAgreement(agr._id, invoiceMonth, createdBy);
      results.generated.push({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        agreementNumber: agr.agreementNumber,
        totalPayable: invoice.totalPayable,
      });
    } catch (err) {
      results.errors.push({
        agreementId: agr._id,
        agreementNumber: agr.agreementNumber,
        error: err.message,
      });
    }
  }

  return results;
};

module.exports = {
  calculateRentAmount,
  generateInvoiceForAgreement,
  previewBulkRentInvoices,
  generateBulkRentInvoices,
};
