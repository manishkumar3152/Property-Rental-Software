import api from './axios';

// Auth
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/update-password', data),
};

// Users / Staff
export const userApi = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Owners
export const ownerApi = {
  getAll: (params) => api.get('/owners', { params }),
  getById: (id) => api.get(`/owners/${id}`),
  create: (data) => api.post('/owners', data),
  update: (id, data) => api.put(`/owners/${id}`, data),
  updateRouteAccount: (id, data) => api.put(`/owners/${id}/route-account`, data),
  delete: (id) => api.delete(`/owners/${id}`),
};

// Properties
export const propertyApi = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
};

// Tenants
export const tenantApi = {
  getAll: (params) => api.get('/tenants', { params }),
  getById: (id) => api.get(`/tenants/${id}`),
  create: (data) => api.post('/tenants', data),
  update: (id, data) => api.put(`/tenants/${id}`, data),
  delete: (id) => api.delete(`/tenants/${id}`),
};

// Agreements
export const agreementApi = {
  getAll: (params) => api.get('/agreements', { params }),
  getById: (id) => api.get(`/agreements/${id}`),
  create: (data) => api.post('/agreements', data),
  renew: (id, data) => api.post(`/agreements/${id}/renew`, data),
  terminate: (id, data) => api.post(`/agreements/${id}/terminate`, data),
  downloadPdf: (id) => `/api/agreements/${id}/pdf`,
};

// Rent Invoices
export const rentApi = {
  getAll: (params) => api.get('/rent', { params }),
  getById: (id) => api.get(`/rent/${id}`),
  generateSingle: (data) => api.post('/rent/generate-single', data),
  previewBulk: (params) => api.get('/rent/preview-bulk', { params }),
  generateBulk: (data) => api.post('/rent/generate-bulk', data),
  adjustFine: (id, data) => api.post(`/rent/${id}/adjust-fine`, data),
  recalculateFine: (id) => api.post(`/rent/${id}/recalculate-fine`),
};

// Payments
export const paymentApi = {
  getAll: (params) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  recordManual: (data) => api.post('/payments/manual', data),
};

// Receipts
export const receiptApi = {
  getAll: (params) => api.get('/receipts', { params }),
  getById: (id) => api.get(`/receipts/${id}`),
  issueDuplicate: (id, data) => api.post(`/receipts/${id}/duplicate`, data),
  downloadPdf: (id) => `/api/receipts/${id}/pdf`,
};

// Settlements & Ledger
export const settlementApi = {
  getLedger: (params) => api.get('/settlements/ledger', { params }),
  getSettlements: (params) => api.get('/settlements', { params }),
  createSettlement: (data) => api.post('/settlements', data),
  reconcileSettlement: (id, data) => api.put(`/settlements/${id}/reconcile`, data),
};

// WhatsApp
export const whatsappApi = {
  sendSingleLink: (data) => api.post('/whatsapp/send-single', data),
  sendBulkLinks: (data) => api.post('/whatsapp/send-bulk', data),
  getLogs: (params) => api.get('/whatsapp/logs', { params }),
  retryMessage: (id) => api.post(`/whatsapp/retry/${id}`),
};

// Notifications
export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

// Reports
export const reportApi = {
  getOwnerWise: (params) => api.get('/reports/owner-wise', { params }),
  getPropertyWise: (params) => api.get('/reports/property-wise', { params }),
  getTenantWise: (tenantId) => api.get(`/reports/tenant-wise/${tenantId}`),
  getMonthlyRent: (params) => api.get('/reports/monthly-rent', { params }),
  getPending: (params) => api.get('/reports/pending', { params }),
  getOverdue: (params) => api.get('/reports/overdue', { params }),
  getFineCollection: (params) => api.get('/reports/fine-collection', { params }),
  getAgreementExpiry: (params) => api.get('/reports/agreement-expiry', { params }),
  getAgreementRenewal: (params) => api.get('/reports/agreement-renewal', { params }),
  getRazorpayTransactions: (params) => api.get('/reports/razorpay-transactions', { params }),
  getOwnerSettlements: (params) => api.get('/reports/owner-settlements', { params }),
  getPropertyOccupancy: (params) => api.get('/reports/property-occupancy', { params }),
};

// Settings & Background Jobs
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  triggerJob: (data) => api.post('/settings/trigger-job', data),
};

// Audit Logs
export const auditLogApi = {
  getAll: (params) => api.get('/audit-logs', { params }),
};

// Public
export const publicApi = {
  getInvoiceByToken: (token) => api.get(`/public/pay/${token}`),
  createOrder: (token) => api.post(`/public/pay/${token}/order`),
  verifyPayment: (token, data) => api.post(`/public/pay/${token}/verify`, data),
  getTenantPortalData: (phone) => api.get('/public/tenant-portal', { params: { phone } }),
};
