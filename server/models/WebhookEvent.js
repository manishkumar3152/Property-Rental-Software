const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    index: true,
  },
  eventType: {
    type: String,
    required: true,
    index: true,
  },
  entityId: {
    type: String,
    index: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  status: {
    type: String,
    enum: ['received', 'processing', 'processed', 'duplicate', 'failed'],
    default: 'received',
    index: true,
  },
  processedAt: {
    type: Date,
  },
  errorMessage: {
    type: String,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
