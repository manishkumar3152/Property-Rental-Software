const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  propertyId: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  propertyName: {
    type: String,
    required: [true, 'Property name is required'],
    trim: true,
  },
  propertyNumber: {
    type: String,
    required: [true, 'Property number is required (e.g. Flat 301, Shop 5)'],
    trim: true,
  },
  propertyType: {
    type: String,
    enum: ['Shop', 'House', 'Flat', 'Office', 'Warehouse', 'Plot', 'Other'],
    required: true,
    index: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: [true, 'Owner ID is mandatory'],
    index: true,
  },
  address: {
    fullAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pinCode: { type: String, required: true },
  },
  monthlyBaseRent: {
    type: Number,
    required: [true, 'Monthly base rent is required'],
    min: 0,
  },
  securityDeposit: {
    type: Number,
    default: 0,
    min: 0,
  },
  description: {
    type: String,
  },
  images: [{
    type: String,
  }],
  availabilityStatus: {
    type: String,
    enum: ['Available', 'Occupied', 'Maintenance', 'Inactive'],
    default: 'Available',
    index: true,
  },
  currentTenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null,
  },
  currentAgreementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
    default: null,
  },
  allowMultiTenancy: {
    type: Boolean,
    default: false,
  },
  ownershipHistory: [{
    previousOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    newOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' },
    transferredAt: { type: Date, default: Date.now },
    transferredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

propertySchema.index({ ownerId: 1, availabilityStatus: 1 });

module.exports = mongoose.model('Property', propertySchema);
