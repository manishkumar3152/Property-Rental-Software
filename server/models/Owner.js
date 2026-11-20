const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
  ownerCode: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Owner name is required'],
    trim: true,
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    trim: true,
  },
  whatsappNumber: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    index: true,
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pinCode: { type: String, trim: true },
  },
  panNumber: {
    type: String,
    trim: true,
    uppercase: true,
  },
  bankDetails: {
    accountHolder: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true, uppercase: true },
    bankName: { type: String, trim: true },
    branch: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
  },
  razorpayLinkedAccountId: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  linkedAccountStatus: {
    type: String,
    enum: ['unlinked', 'pending', 'active', 'suspended'],
    default: 'unlinked',
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true,
  },
  commissionRate: {
    type: Number,
    default: 0, // Percentage commission
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

module.exports = mongoose.model('Owner', ownerSchema);
