const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true, // e.g., 'FINE_ADJUSTED', 'PAYMENT_VERIFIED', 'INVOICE_GENERATED', 'TRANSFER_INITIATED'
  },
  entityType: {
    type: String,
    enum: ['RentInvoice', 'Payment', 'Agreement', 'Property', 'Owner', 'Settlement', 'Tenant', 'FineRule', 'Settings', 'User', 'System'],
    required: true,
    index: true,
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  userRole: {
    type: String,
  },
  userName: {
    type: String,
  },
  previousState: {
    type: mongoose.Schema.Types.Mixed,
  },
  newState: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  details: {
    type: String,
  },
}, {
  timestamps: true,
});

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
