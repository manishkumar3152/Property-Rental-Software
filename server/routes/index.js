const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const ownerRoutes = require('./ownerRoutes');
const propertyRoutes = require('./propertyRoutes');
const tenantRoutes = require('./tenantRoutes');
const agreementRoutes = require('./agreementRoutes');
const rentRoutes = require('./rentRoutes');
const paymentRoutes = require('./paymentRoutes');
const receiptRoutes = require('./receiptRoutes');
const settlementRoutes = require('./settlementRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');
const settingsRoutes = require('./settingsRoutes');
const auditLogRoutes = require('./auditLogRoutes');
const publicPayRoutes = require('./publicPayRoutes');
const webhookRoutes = require('./webhookRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/owners', ownerRoutes);
router.use('/properties', propertyRoutes);
router.use('/tenants', tenantRoutes);
router.use('/agreements', agreementRoutes);
router.use('/rent', rentRoutes);
router.use('/payments', paymentRoutes);
router.use('/receipts', receiptRoutes);
router.use('/settlements', settlementRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingsRoutes);
router.use('/audit-logs', auditLogRoutes);

// Public routes (tenant invoice checkout & portal)
router.use('/public', publicPayRoutes);

// Webhook routes
router.use('/webhooks', webhookRoutes);

module.exports = router;
