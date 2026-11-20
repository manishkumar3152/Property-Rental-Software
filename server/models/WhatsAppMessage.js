const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    trim: true,
  },
  recipientPhone: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  recipientType: {
    type: String,
    enum: ['tenant', 'owner', 'staff'],
    default: 'tenant',
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  recipientName: {
    type: String,
  },
  templateName: {
    type: String,
    required: true,
  },
  templateVariables: {
    type: mongoose.Schema.Types.Mixed,
  },
  bodyText: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'queued',
    index: true,
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RentInvoice',
    index: true,
  },
  agreementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agreement',
  },
  paymentUrl: {
    type: String,
  },
  errorMessage: {
    type: String,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  sentAt: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

whatsAppMessageSchema.index({ recipientPhone: 1, createdAt: -1 });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
