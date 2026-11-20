const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientType: {
    type: String,
    enum: ['tenant', 'owner', 'admin', 'staff'],
    required: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  notificationType: {
    type: String,
    enum: ['rent_due', 'rent_overdue', 'payment_success', 'agreement_expiry', 'fine_added', 'system'],
    required: true,
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'in_app', 'email', 'sms'],
    default: 'in_app',
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'sent',
    index: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
  },
  link: {
    type: String,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

notificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
