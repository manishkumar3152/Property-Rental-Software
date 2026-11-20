const Agreement = require('../models/Agreement');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const { generateFormattedId } = require('../utils/tokenGenerator');
const pdfService = require('../services/pdfService');
const { logAudit } = require('../middleware/auditLogger');

const getAllAgreements = async (req, res, next) => {
  try {
    const { ownerId, propertyId, tenantId, status, search } = req.query;
    const query = {};

    if (req.user.role === 'owner') {
      query.ownerId = req.user.ownerId;
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    if (propertyId) query.propertyId = propertyId;
    if (tenantId) query.tenantId = tenantId;
    if (status) query.status = status;

    const agreements = await Agreement.find(query)
      .populate('propertyId', 'propertyName propertyNumber propertyType address')
      .populate('tenantId', 'fullName mobileNumber email')
      .populate('ownerId', 'name ownerCode')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: agreements.length, data: agreements });
  } catch (error) {
    next(error);
  }
};

const getAgreementById = async (req, res, next) => {
  try {
    const agreement = await Agreement.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId')
      .populate('ownerId')
      .populate('renewalHistory.previousAgreementId', 'agreementNumber monthlyRent')
      .populate('renewalHistory.newAgreementId', 'agreementNumber monthlyRent');

    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    if (req.user.role === 'owner' && agreement.ownerId?._id?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot access agreement of another owner' });
    }

    res.status(200).json({ success: true, data: agreement });
  } catch (error) {
    next(error);
  }
};

const createAgreement = async (req, res, next) => {
  try {
    const {
      propertyId,
      ownerId,
      tenantId,
      agreementStartDate,
      agreementEndDate,
      agreementDuration = 11,
      monthlyRent,
      securityDeposit,
      rentGenerationDay = 1,
      monthlyDueDate = 10,
      gracePeriod = 3,
      fineType = 'per_day',
      fineValue = 100,
      maxFineLimit = 2000,
      rentIncrementPercentage = 10,
      renewalConditions,
      status = 'Active',
    } = req.body;

    const targetOwnerId = req.user.role === 'owner' ? req.user.ownerId : ownerId;

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Overlapping Agreement Guard
    if (!property.allowMultiTenancy) {
      const existingActive = await Agreement.findOne({
        propertyId,
        status: { $in: ['Active', 'Expiring'] },
      });

      if (existingActive) {
        return res.status(400).json({
          success: false,
          message: `Property already has an active agreement (${existingActive.agreementNumber}). Overlapping agreements not allowed unless multi-tenancy is enabled.`,
        });
      }
    }

    const currentYear = new Date().getFullYear();
    const agreementNumber = await generateFormattedId(Agreement, 'agreementNumber', `AGR-${currentYear}-`, 3);

    // Calculate end date if not explicitly passed
    let calculatedEndDate = agreementEndDate;
    if (!calculatedEndDate && agreementStartDate) {
      const start = new Date(agreementStartDate);
      calculatedEndDate = new Date(start.setMonth(start.getMonth() + Number(agreementDuration)));
    }

    const agreement = new Agreement({
      agreementNumber,
      propertyId,
      ownerId: targetOwnerId,
      tenantId,
      agreementStartDate: new Date(agreementStartDate),
      agreementEndDate: new Date(calculatedEndDate),
      agreementDuration: Number(agreementDuration),
      monthlyRent: Number(monthlyRent),
      securityDeposit: Number(securityDeposit || 0),
      rentGenerationDay: Number(rentGenerationDay),
      monthlyDueDate: Number(monthlyDueDate),
      gracePeriod: Number(gracePeriod),
      fineType,
      fineValue: Number(fineValue),
      maxFineLimit: Number(maxFineLimit),
      rentIncrementPercentage: Number(rentIncrementPercentage),
      renewalConditions,
      status,
      createdBy: req.user._id,
    });

    await agreement.save();

    // Update Property with current agreement and tenant
    property.currentAgreementId = agreement._id;
    property.currentTenantId = tenantId;
    property.availabilityStatus = 'Occupied';
    await property.save();

    // Update Tenant assigned property
    await Tenant.findByIdAndUpdate(tenantId, {
      assignedPropertyId: property._id,
      assignedOwnerId: targetOwnerId,
      status: 'Active',
    });

    await logAudit({
      action: 'AGREEMENT_CREATED',
      entityType: 'Agreement',
      entityId: agreement._id,
      user: req.user,
      req,
      details: `Created rental agreement: ${agreement.agreementNumber} for Property: ${property.propertyName}`,
    });

    res.status(201).json({ success: true, data: agreement });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiates agreement renewal with increment calculation
 */
const renewAgreement = async (req, res, next) => {
  try {
    const agreementId = req.params.id;
    const oldAgreement = await Agreement.findById(agreementId);

    if (!oldAgreement) {
      return res.status(404).json({ success: false, message: 'Existing agreement not found' });
    }

    const {
      durationMonths = 11,
      overrideIncrementPercentage,
      overrideRent,
      startDate,
      renewalConditions,
    } = req.body;

    const incrementPercentage = overrideIncrementPercentage !== undefined
      ? Number(overrideIncrementPercentage)
      : (oldAgreement.rentIncrementPercentage || 10);

    // Business Logic: New Rent = Previous Rent + (Previous Rent * Increment Percentage / 100)
    let calculatedNewRent = Math.round(oldAgreement.monthlyRent + (oldAgreement.monthlyRent * incrementPercentage) / 100);
    if (overrideRent !== undefined && overrideRent > 0) {
      calculatedNewRent = Number(overrideRent);
    }

    const start = startDate ? new Date(startDate) : new Date(oldAgreement.agreementEndDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(durationMonths));

    const currentYear = new Date().getFullYear();
    const newAgreementNumber = await generateFormattedId(Agreement, 'agreementNumber', `AGR-${currentYear}-`, 3);

    const newAgreement = new Agreement({
      agreementNumber: newAgreementNumber,
      propertyId: oldAgreement.propertyId,
      ownerId: oldAgreement.ownerId,
      tenantId: oldAgreement.tenantId,
      agreementStartDate: start,
      agreementEndDate: end,
      agreementDuration: Number(durationMonths),
      monthlyRent: calculatedNewRent,
      securityDeposit: oldAgreement.securityDeposit,
      rentGenerationDay: oldAgreement.rentGenerationDay,
      monthlyDueDate: oldAgreement.monthlyDueDate,
      gracePeriod: oldAgreement.gracePeriod,
      fineType: oldAgreement.fineType,
      fineValue: oldAgreement.fineValue,
      maxFineLimit: oldAgreement.maxFineLimit,
      rentIncrementPercentage: incrementPercentage,
      renewalConditions: renewalConditions || oldAgreement.renewalConditions,
      status: 'Active',
      createdBy: req.user._id,
    });

    await newAgreement.save();

    // Update old agreement status & link renewal history
    oldAgreement.status = 'Renewed';
    oldAgreement.renewalHistory.push({
      previousAgreementId: oldAgreement._id,
      newAgreementId: newAgreement._id,
      previousRent: oldAgreement.monthlyRent,
      newRent: calculatedNewRent,
      incrementPercentage,
      renewedAt: new Date(),
      renewedBy: req.user._id,
    });
    await oldAgreement.save();

    // Update property with new agreement
    await Property.findByIdAndUpdate(oldAgreement.propertyId, {
      currentAgreementId: newAgreement._id,
      monthlyBaseRent: calculatedNewRent,
    });

    await logAudit({
      action: 'AGREEMENT_RENEWED',
      entityType: 'Agreement',
      entityId: newAgreement._id,
      user: req.user,
      req,
      details: `Renewed agreement ${oldAgreement.agreementNumber} -> ${newAgreement.agreementNumber}. Rent escalated from ₹${oldAgreement.monthlyRent} to ₹${calculatedNewRent} (${incrementPercentage}% increment).`,
    });

    res.status(200).json({
      success: true,
      message: 'Agreement renewed successfully',
      data: {
        newAgreement,
        previousRent: oldAgreement.monthlyRent,
        newRent: calculatedNewRent,
        escalation: incrementPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

const terminateAgreement = async (req, res, next) => {
  try {
    const agreement = await Agreement.findById(req.params.id);
    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    const { reason } = req.body;

    agreement.status = 'Terminated';
    agreement.terminationDetails = {
      terminatedAt: new Date(),
      reason: reason || 'Terminated by mutual consent',
      terminatedBy: req.user._id,
    };
    await agreement.save();

    // Free property
    await Property.findByIdAndUpdate(agreement.propertyId, {
      currentAgreementId: null,
      currentTenantId: null,
      availabilityStatus: 'Available',
    });

    await logAudit({
      action: 'AGREEMENT_TERMINATED',
      entityType: 'Agreement',
      entityId: agreement._id,
      user: req.user,
      req,
      details: `Terminated agreement ${agreement.agreementNumber}. Reason: ${reason}`,
    });

    res.status(200).json({ success: true, message: 'Agreement terminated and property released' });
  } catch (error) {
    next(error);
  }
};

const downloadAgreementPdf = async (req, res, next) => {
  try {
    const agreement = await Agreement.findById(req.params.id)
      .populate('propertyId')
      .populate('tenantId')
      .populate('ownerId');

    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Agreement-${agreement.agreementNumber}.pdf`);

    pdfService.generateAgreementPDF(agreement, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAgreements,
  getAgreementById,
  createAgreement,
  renewAgreement,
  terminateAgreement,
  downloadAgreementPdf,
};
