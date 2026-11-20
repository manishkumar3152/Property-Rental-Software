const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Owner = require('../models/Owner');
const RentInvoice = require('../models/RentInvoice');
const Agreement = require('../models/Agreement');
const { generateFormattedId } = require('../utils/tokenGenerator');
const { logAudit } = require('../middleware/auditLogger');

const getAllTenants = async (req, res, next) => {
  try {
    const { ownerId, propertyId, status, search } = req.query;
    const query = {};

    if (req.user.role === 'owner') {
      query.assignedOwnerId = req.user.ownerId;
    } else if (ownerId) {
      query.assignedOwnerId = ownerId;
    }

    if (propertyId) query.assignedPropertyId = propertyId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { tenantId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const tenants = await Tenant.find(query)
      .populate('assignedPropertyId', 'propertyName propertyNumber monthlyBaseRent')
      .populate('assignedOwnerId', 'name ownerCode')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tenants.length, data: tenants });
  } catch (error) {
    next(error);
  }
};

const getTenantById = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('assignedPropertyId')
      .populate('assignedOwnerId');

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (req.user.role === 'owner' && tenant.assignedOwnerId?._id?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot access tenant of another owner' });
    }

    // Tenant invoices and agreements
    const agreements = await Agreement.find({ tenantId: tenant._id }).sort({ agreementStartDate: -1 });
    const invoices = await RentInvoice.find({ tenantId: tenant._id }).sort({ invoiceMonth: -1 });

    res.status(200).json({
      success: true,
      data: {
        ...tenant.toObject(),
        agreements,
        invoices,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createTenant = async (req, res, next) => {
  try {
    const {
      fullName,
      fatherName,
      mobileNumber,
      whatsappNumber,
      email,
      aadhaarNumber,
      panNumber,
      permanentAddress,
      idProofDocument,
      profileImage,
      assignedPropertyId,
      assignedOwnerId,
      securityDepositPaid,
      status,
      notes,
    } = req.body;

    const targetOwnerId = req.user.role === 'owner' ? req.user.ownerId : assignedOwnerId;
    if (!targetOwnerId) {
      return res.status(400).json({ success: false, message: 'Owner ID is required' });
    }

    const tenantId = await generateFormattedId(Tenant, 'tenantId', 'TEN-', 4);

    const tenant = new Tenant({
      tenantId,
      fullName,
      fatherName,
      mobileNumber,
      whatsappNumber: whatsappNumber || mobileNumber,
      email,
      aadhaarNumber,
      panNumber,
      permanentAddress,
      idProofDocument,
      profileImage,
      assignedPropertyId: assignedPropertyId || null,
      assignedOwnerId: targetOwnerId,
      securityDepositPaid: Number(securityDepositPaid || 0),
      status: status || 'Active',
      notes,
      createdBy: req.user._id,
    });

    await tenant.save();

    // If property assigned, mark property occupied
    if (assignedPropertyId) {
      await Property.findByIdAndUpdate(assignedPropertyId, {
        currentTenantId: tenant._id,
        availabilityStatus: 'Occupied',
      });
    }

    await logAudit({
      action: 'TENANT_CREATED',
      entityType: 'Tenant',
      entityId: tenant._id,
      user: req.user,
      req,
      details: `Created tenant: ${tenant.fullName} (${tenant.tenantId})`,
    });

    res.status(201).json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};

const updateTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    if (req.user.role === 'owner' && tenant.assignedOwnerId?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify another owner tenant' });
    }

    const previousState = tenant.toObject();

    Object.assign(tenant, req.body);
    await tenant.save();

    await logAudit({
      action: 'TENANT_UPDATED',
      entityType: 'Tenant',
      entityId: tenant._id,
      user: req.user,
      previousState,
      newState: tenant.toObject(),
      req,
      details: `Updated tenant: ${tenant.fullName}`,
    });

    res.status(200).json({ success: true, data: tenant });
  } catch (error) {
    next(error);
  }
};

const deleteTenant = async (req, res, next) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    // Check outstanding invoices
    const unpaidCount = await RentInvoice.countDocuments({
      tenantId: tenant._id,
      paymentStatus: { $in: ['Unpaid', 'Overdue', 'Partially Paid'] },
    });

    if (unpaidCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete tenant with ${unpaidCount} unpaid/overdue rent invoices. Please settle balances first.`,
      });
    }

    tenant.status = 'Inactive';
    await tenant.save();

    // Release property if tenant was assigned
    if (tenant.assignedPropertyId) {
      await Property.findByIdAndUpdate(tenant.assignedPropertyId, {
        currentTenantId: null,
        availabilityStatus: 'Available',
      });
    }

    await logAudit({
      action: 'TENANT_DEACTIVATED',
      entityType: 'Tenant',
      entityId: tenant._id,
      user: req.user,
      req,
      details: `Deactivated tenant: ${tenant.fullName} (${tenant.tenantId})`,
    });

    res.status(200).json({ success: true, message: 'Tenant marked Inactive and property released' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
};
