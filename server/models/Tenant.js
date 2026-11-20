const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  fullName: {
    type: String,
    required: [true, 'Tenant full name is required'],
    trim: true,
  },
  fatherName: {
    type: String,
    trim: true,
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
    index: true,
  },
  whatsappNumber: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
  },
  aadhaarNumber: {
    type: String, // Masked representation or securely stored
    trim: true,
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  permanentAddress: {
    fullAddress: { type: String },
    city: { type: String },
    state: { type: String },
    pinCode: { type: String },
  },
  idProofDocument: {
    docType: { type: String, enum: ['Aadhaar', 'PAN', 'Passport', 'VoterID', 'DrivingLicense', 'Other'], default: 'Aadhaar' },
    docNumber: { type: String },
    docUrl: { type: String },
  },
  profileImage: {
    type: String,
  },
  assignedPropertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    index: true,
  },
  assignedOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: [true, 'Assigned Owner is required'],
    index: true,
  },
  securityDepositPaid: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['Active', 'Notice', 'Inactive'],
    default: 'Active',
    index: true,
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

tenantSchema.index({ assignedOwnerId: 1, status: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
