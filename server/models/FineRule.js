const mongoose = require('mongoose');

const fineRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  ruleType: {
    type: String,
    enum: ['fixed', 'per_day', 'percentage'],
    required: true,
  },
  amount: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  gracePeriodDays: {
    type: Number,
    default: 3,
    min: 0,
  },
  maxFineLimit: {
    type: Number,
    default: 0, // 0 = unlimited
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    default: null, // null means global default rule
    index: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('FineRule', fineRuleSchema);
