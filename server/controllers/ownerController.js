const Owner = require('../models/Owner');
const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const RentInvoice = require('../models/RentInvoice');
const OwnerLedger = require('../models/OwnerLedger');
const settlementService = require('../services/settlementService');
const { generateFormattedId } = require('../utils/tokenGenerator');
const { logAudit } = require('../middleware/auditLogger');

const getAllOwners = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ownerCode: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
      ];
    }

    const owners = await Owner.find(query).sort({ createdAt: -1 });

    // Attach property and tenant counts
    const enrichedOwners = await Promise.all(
      owners.map(async (owner) => {
        const propertyCount = await Property.countDocuments({ ownerId: owner._id });
        const tenantCount = await Tenant.countDocuments({ assignedOwnerId: owner._id, status: 'Active' });
        const balance = await settlementService.getOwnerCurrentBalance(owner._id);

        return {
          ...owner.toObject(),
          propertyCount,
          tenantCount,
          currentLedgerBalance: balance,
        };
      })
    );

    res.status(200).json({ success: true, count: enrichedOwners.length, data: enrichedOwners });
  } catch (error) {
    next(error);
  }
};

const getOwnerById = async (req, res, next) => {
  try {
    const ownerId = req.params.id;

    // Enforce owner scope
    if (req.user.role === 'owner' && req.user.ownerId?.toString() !== ownerId) {
      return res.status(403).json({ success: false, message: 'Cannot access another owner profile' });
    }

    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    const properties = await Property.find({ ownerId: owner._id });
    const tenants = await Tenant.find({ assignedOwnerId: owner._id });
    const balance = await settlementService.getOwnerCurrentBalance(owner._id);

    res.status(200).json({
      success: true,
      data: {
        ...owner.toObject(),
        properties,
        tenants,
        currentLedgerBalance: balance,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createOwner = async (req, res, next) => {
  try {
    const {
      name,
      mobile,
      whatsappNumber,
      email,
      address,
      panNumber,
      bankDetails,
      razorpayLinkedAccountId,
      linkedAccountStatus,
      commissionRate,
      notes,
    } = req.body;

    const existingEmail = await Owner.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Owner with this email already exists' });
    }

    const ownerCode = await generateFormattedId(Owner, 'ownerCode', 'OWN-', 3);

    const owner = new Owner({
      ownerCode,
      name,
      mobile,
      whatsappNumber: whatsappNumber || mobile,
      email: email.toLowerCase(),
      address,
      panNumber,
      bankDetails,
      razorpayLinkedAccountId: razorpayLinkedAccountId || '',
      linkedAccountStatus: linkedAccountStatus || (razorpayLinkedAccountId ? 'pending' : 'unlinked'),
      commissionRate: commissionRate || 0,
      notes,
      createdBy: req.user._id,
    });

    await owner.save();

    await logAudit({
      action: 'OWNER_CREATED',
      entityType: 'Owner',
      entityId: owner._id,
      user: req.user,
      req,
      details: `Created owner: ${owner.name} (${owner.ownerCode})`,
    });

    res.status(201).json({ success: true, data: owner });
  } catch (error) {
    next(error);
  }
};

const updateOwner = async (req, res, next) => {
  try {
    const owner = await Owner.findById(req.params.id);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    const previousState = owner.toObject();

    Object.assign(owner, req.body);
    await owner.save();

    await logAudit({
      action: 'OWNER_UPDATED',
      entityType: 'Owner',
      entityId: owner._id,
      user: req.user,
      previousState,
      newState: owner.toObject(),
      req,
      details: `Updated owner: ${owner.name}`,
    });

    res.status(200).json({ success: true, data: owner });
  } catch (error) {
    next(error);
  }
};

const updateRazorpayRouteAccount = async (req, res, next) => {
  try {
    const { razorpayLinkedAccountId, linkedAccountStatus } = req.body;
    const owner = await Owner.findById(req.params.id);

    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    owner.razorpayLinkedAccountId = razorpayLinkedAccountId;
    owner.linkedAccountStatus = linkedAccountStatus || 'pending';
    await owner.save();

    await logAudit({
      action: 'OWNER_ROUTE_ACCOUNT_UPDATED',
      entityType: 'Owner',
      entityId: owner._id,
      user: req.user,
      req,
      details: `Updated Razorpay Route linked account for ${owner.name}: ${razorpayLinkedAccountId} (${owner.linkedAccountStatus})`,
    });

    res.status(200).json({ success: true, data: owner });
  } catch (error) {
    next(error);
  }
};

const deleteOwner = async (req, res, next) => {
  try {
    const owner = await Owner.findById(req.params.id);
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    const propertyCount = await Property.countDocuments({ ownerId: owner._id });
    if (propertyCount > 0) {
      // Deactivate owner to protect existing property & financial records
      owner.status = 'inactive';
      await owner.save();

      await logAudit({
        action: 'OWNER_DEACTIVATED',
        entityType: 'Owner',
        entityId: owner._id,
        user: req.user,
        req,
        details: `Owner ${owner.name} (${owner.ownerCode}) deactivated. Has ${propertyCount} properties assigned.`,
      });

      return res.status(200).json({
        success: true,
        message: `Owner ${owner.name} marked inactive to protect ${propertyCount} assigned properties and financial ledgers.`,
      });
    }

    await Owner.findByIdAndDelete(owner._id);

    await logAudit({
      action: 'OWNER_DELETED',
      entityType: 'Owner',
      entityId: owner._id,
      user: req.user,
      req,
      details: `Owner ${owner.name} (${owner.ownerCode}) permanently deleted.`,
    });

    res.status(200).json({ success: true, message: 'Owner deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllOwners,
  getOwnerById,
  createOwner,
  updateOwner,
  updateRazorpayRouteAccount,
  deleteOwner,
};
