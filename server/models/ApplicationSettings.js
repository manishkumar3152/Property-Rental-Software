const mongoose = require('mongoose');

const applicationSettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    default: 'PropRent ERP Systems',
  },
  companyLogo: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: 'Prestige Tech Park, Marathahalli-Sarjapur Outer Ring Rd, Bengaluru, Karnataka 560103',
  },
  contactEmail: {
    type: String,
    default: 'support@propertyerp.com',
  },
  contactPhone: {
    type: String,
    default: '+91 98765 43210',
  },
  defaultCurrency: {
    type: String,
    default: 'INR',
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
  },
  razorpaySettings: {
    isLiveMode: { type: Boolean, default: false },
    autoTransferEnabled: { type: Boolean, default: false },
    defaultTransferMode: { type: String, enum: ['route', 'manual'], default: 'manual' },
  },
  whatsappSettings: {
    autoSendInvoiceReminders: { type: Boolean, default: true },
    reminderDaysBeforeDue: { type: [Number], default: [5, 0] },
    overdueReminderDays: { type: [Number], default: [1, 7, 14] },
    autoSendPaymentReceipts: { type: Boolean, default: true },
  },
  rentSettings: {
    defaultDueDay: { type: Number, default: 10 },
    defaultGracePeriod: { type: Number, default: 3 },
    proratedRentCalculation: { type: Boolean, default: true },
    autoGenerateRentOnDay: { type: Number, default: 1 },
  },
  lateFineSettings: {
    defaultRuleType: { type: String, enum: ['fixed', 'per_day', 'percentage'], default: 'per_day' },
    defaultAmount: { type: Number, default: 100 },
    defaultPercentage: { type: Number, default: 5 },
    maxFineLimit: { type: Number, default: 2000 },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ApplicationSettings', applicationSettingsSchema);
