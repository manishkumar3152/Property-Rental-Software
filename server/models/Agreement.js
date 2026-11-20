const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema({
  agreementNumber: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true,
    index: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  agreementStartDate: {
    type: Date,
    required: true,
  },
  agreementEndDate: {
    type: Date,
    required: true,
    index: true,
  },
  agreementDuration: {
    type: Number,
    default: 11, // months
  },
  monthlyRent: {
    type: Number,
    required: true,
    min: 0,
  },
  securityDeposit: {
    type: Number,
    default: 0,
    min: 0,
  },
  rentGenerationDay: {
    type: Number,
    default: 1, // 1st of month
    min: 1,
    max: 28,
  },
  monthlyDueDate: {
    type: Number,
    default: 10, // 10th of month
    min: 1,
    max: 28,
  },
  gracePeriod: {
    type: Number,
    default: 3, // 3 days grace
    min: 0,
  },
  fineRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FineRule',
  },
  fineType: {
    type: String,
    enum: ['fixed', 'per_day', 'percentage', 'none'],
    default: 'per_day',
  },
  fineValue: {
    type: Number,
    default: 100, // e.g. 100/day or 5% or fixed 500
  },
  maxFineLimit: {
    type: Number,
    default: 2000,
  },
  rentIncrementPercentage: {
    type: Number,
    default: 10, // 10% increment upon renewal
  },
  renewalConditions: {
    type: String,
    default: 'Standard 11-month lease renewal with 10% rent escalation subject to mutual agreement.',
  },
  agreementDocumentPdf: {
    type: String,
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Expiring', 'Expired', 'Renewed', 'Terminated'],
    default: 'Active',
    index: true,
  },
  renewalHistory: [{
    previousAgreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreement' },
    renewedAt: { type: Date, default: Date.now },
    previousRent: { type: Number },
    newRent: { type: Number },
    incrementPercentage: { type: Number },
    renewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    newAgreementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agreement' },
  }],
  terminationDetails: {
    terminatedAt: { type: Date },
    reason: { type: String },
    terminatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

agreementSchema.index({ propertyId: 1, status: 1 });
agreementSchema.index({ ownerId: 1, status: 1 });
agreementSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('Agreement', agreementSchema);
