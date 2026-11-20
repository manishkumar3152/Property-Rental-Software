const Property = require('../models/Property');
const Agreement = require('../models/Agreement');
const RentInvoice = require('../models/RentInvoice');
const Owner = require('../models/Owner');
const { generateFormattedId } = require('../utils/tokenGenerator');
const { logAudit } = require('../middleware/auditLogger');

const getAllProperties = async (req, res, next) => {
  try {
    const { ownerId, status, type, search } = req.query;
    const query = {};

    // Data isolation
    if (req.user.role === 'owner') {
      query.ownerId = req.user.ownerId;
    } else if (ownerId) {
      query.ownerId = ownerId;
    }

    if (status) query.availabilityStatus = status;
    if (type) query.propertyType = type;
    if (search) {
      query.$or = [
        { propertyName: { $regex: search, $options: 'i' } },
        { propertyNumber: { $regex: search, $options: 'i' } },
        { propertyId: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }

    const properties = await Property.find(query)
      .populate('ownerId', 'name ownerCode mobile email')
      .populate('currentTenantId', 'fullName mobileNumber email')
      .populate('currentAgreementId', 'agreementNumber monthlyRent agreementEndDate status')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: properties.length, data: properties });
  } catch (error) {
    next(error);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('ownerId')
      .populate('currentTenantId')
      .populate('currentAgreementId')
      .populate('ownershipHistory.previousOwnerId', 'name ownerCode')
      .populate('ownershipHistory.newOwnerId', 'name ownerCode')
      .populate('ownershipHistory.transferredBy', 'name');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Owner role guard
    if (req.user.role === 'owner' && property.ownerId?._id?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Cannot access property of another owner' });
    }

    // Recent agreements & invoices
    const agreements = await Agreement.find({ propertyId: property._id })
      .populate('tenantId', 'fullName')
      .sort({ agreementStartDate: -1 });

    const invoices = await RentInvoice.find({ propertyId: property._id })
      .populate('tenantId', 'fullName')
      .sort({ invoiceMonth: -1 })
      .limit(12);

    res.status(200).json({
      success: true,
      data: {
        ...property.toObject(),
        agreements,
        invoices,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createProperty = async (req, res, next) => {
  try {
    const {
      propertyName,
      propertyNumber,
      propertyType,
      ownerId,
      address,
      monthlyBaseRent,
      securityDeposit,
      description,
      images,
      allowMultiTenancy,
    } = req.body;

    const assignedOwnerId = req.user.role === 'owner' ? req.user.ownerId : ownerId;

    if (!assignedOwnerId) {
      return res.status(400).json({ success: false, message: 'Owner ID is mandatory' });
    }

    const ownerExists = await Owner.findById(assignedOwnerId);
    if (!ownerExists) {
      return res.status(400).json({ success: false, message: 'Selected owner does not exist' });
    }

    const propertyId = await generateFormattedId(Property, 'propertyId', 'PROP-', 4);

    const property = new Property({
      propertyId,
      propertyName,
      propertyNumber,
      propertyType,
      ownerId: assignedOwnerId,
      address,
      monthlyBaseRent: Number(monthlyBaseRent),
      securityDeposit: Number(securityDeposit || 0),
      description,
      images: images || [],
      availabilityStatus: 'Available',
      allowMultiTenancy: Boolean(allowMultiTenancy),
      createdBy: req.user._id,
    });

    await property.save();

    await logAudit({
      action: 'PROPERTY_CREATED',
      entityType: 'Property',
      entityId: property._id,
      user: req.user,
      req,
      details: `Created property: ${property.propertyName} (${property.propertyId}) assigned to owner ${ownerExists.name}`,
    });

    res.status(201).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (req.user.role === 'owner' && property.ownerId?.toString() !== req.user.ownerId?.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify another owner property' });
    }

    const previousState = property.toObject();

    // Check for Ownership transfer
    if (req.body.ownerId && req.body.ownerId.toString() !== property.ownerId.toString()) {
      // Only Super Admin can transfer property ownership
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin is authorized to transfer property ownership',
        });
      }

      const newOwner = await Owner.findById(req.body.ownerId);
      if (!newOwner) {
        return res.status(400).json({ success: false, message: 'New owner not found' });
      }

      // Add to ownership history
      property.ownershipHistory.push({
        previousOwnerId: property.ownerId,
        newOwnerId: newOwner._id,
        transferredAt: new Date(),
        transferredBy: req.user._id,
        reason: req.body.transferReason || 'Ownership reassigned by Super Admin',
      });

      property.ownerId = newOwner._id;
    }

    // Update allowable fields
    if (req.body.propertyName) property.propertyName = req.body.propertyName;
    if (req.body.propertyNumber) property.propertyNumber = req.body.propertyNumber;
    if (req.body.propertyType) property.propertyType = req.body.propertyType;
    if (req.body.address) property.address = req.body.address;
    if (req.body.monthlyBaseRent !== undefined) property.monthlyBaseRent = Number(req.body.monthlyBaseRent);
    if (req.body.securityDeposit !== undefined) property.securityDeposit = Number(req.body.securityDeposit);
    if (req.body.description !== undefined) property.description = req.body.description;
    if (req.body.images) property.images = req.body.images;
    if (req.body.availabilityStatus) property.availabilityStatus = req.body.availabilityStatus;
    if (req.body.allowMultiTenancy !== undefined) property.allowMultiTenancy = req.body.allowMultiTenancy;

    await property.save();

    await logAudit({
      action: 'PROPERTY_UPDATED',
      entityType: 'Property',
      entityId: property._id,
      user: req.user,
      previousState,
      newState: property.toObject(),
      req,
      details: `Updated property: ${property.propertyName} (${property.propertyId})`,
    });

    res.status(200).json({ success: true, data: property });
  } catch (error) {
    next(error);
  }
};

const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    // Financial Record Safeguard:
    // Check if property has active agreement
    const activeAgreement = await Agreement.findOne({
      propertyId: property._id,
      status: { $in: ['Active', 'Expiring'] },
    });

    if (activeAgreement) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete property with active rental agreement. Please terminate the agreement first.',
      });
    }

    // Check if property has financial records (invoices or payments)
    const invoiceCount = await RentInvoice.countDocuments({ propertyId: property._id });
    if (invoiceCount > 0) {
      // Deactivate instead of physical delete to preserve financial integrity
      property.availabilityStatus = 'Inactive';
      await property.save();

      await logAudit({
        action: 'PROPERTY_DEACTIVATED_SAFEGUARD',
        entityType: 'Property',
        entityId: property._id,
        user: req.user,
        req,
        details: `Property has ${invoiceCount} historical financial invoices. Marked Inactive instead of deletion.`,
      });

      return res.status(200).json({
        success: true,
        message: 'Property has historical financial records. Its status has been safely changed to Inactive.',
      });
    }

    await Property.findByIdAndDelete(property._id);

    await logAudit({
      action: 'PROPERTY_DELETED',
      entityType: 'Property',
      entityId: property._id,
      user: req.user,
      req,
      details: `Deleted property: ${property.propertyName} (${property.propertyId})`,
    });

    res.status(200).json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
};
