const WhatsAppMessage = require('../models/WhatsAppMessage');
const RentInvoice = require('../models/RentInvoice');
const whatsappService = require('../services/whatsappService');
const { formatINR, formatDate, formatMonth } = require('../utils/formatters');
const { logAudit } = require('../middleware/auditLogger');

const sendSingleInvoiceLink = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    const invoice = await RentInvoice.findById(invoiceId)
      .populate('tenantId')
      .populate('propertyId');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (!invoice.tenantId || !invoice.tenantId.mobileNumber) {
      return res.status(400).json({ success: false, message: 'Tenant mobile number not found' });
    }

    const clientUrl = process.env.PUBLIC_PAYMENT_URL || 'http://localhost:5173/pay';
    const paymentUrl = `${clientUrl}/${invoice.paymentToken}`;

    const isOverdue = invoice.paymentStatus === 'Overdue';
    const templateName = isOverdue ? 'rent_overdue_reminder' : 'rent_invoice_generated';

    const templateVariables = {
      tenantName: invoice.tenantId.fullName,
      propertyName: invoice.propertyId ? `${invoice.propertyId.propertyName} (${invoice.propertyId.propertyNumber})` : 'Property',
      month: formatMonth(invoice.invoiceMonth),
      rent: formatINR(invoice.baseRent),
      fine: formatINR(invoice.lateFine),
      dueDate: formatDate(invoice.dueDate),
      totalAmount: formatINR(invoice.totalPayable),
      paymentUrl,
    };

    const result = await whatsappService.sendWhatsAppMessage({
      recipientPhone: invoice.tenantId.whatsappNumber || invoice.tenantId.mobileNumber,
      recipientType: 'tenant',
      recipientId: invoice.tenantId._id,
      recipientName: invoice.tenantId.fullName,
      templateName,
      templateVariables,
      invoiceId: invoice._id,
      agreementId: invoice.agreementId,
      paymentUrl,
    });

    await logAudit({
      action: 'WHATSAPP_LINK_SENT',
      entityType: 'RentInvoice',
      entityId: invoice._id,
      user: req.user,
      req,
      details: `Sent payment link via WhatsApp to ${invoice.tenantId.fullName} (${invoice.tenantId.mobileNumber}) for ${invoice.invoiceNumber}`,
    });

    res.status(200).json({
      success: true,
      message: 'WhatsApp payment link dispatched',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const sendBulkInvoiceLinks = async (req, res, next) => {
  try {
    const { invoiceIds } = req.body;

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({ success: false, message: 'invoiceIds array is required' });
    }

    const result = await whatsappService.sendBulkInvoiceWhatsApp(invoiceIds);

    await logAudit({
      action: 'WHATSAPP_BULK_LINKS_SENT',
      entityType: 'RentInvoice',
      user: req.user,
      req,
      details: `Dispatched bulk WhatsApp payment links to ${result.total} invoices. Successful: ${result.successful}, Failed: ${result.failed}`,
    });

    res.status(200).json({
      success: true,
      message: `Dispatched ${result.successful} messages successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getMessageLogs = async (req, res, next) => {
  try {
    const { status, recipientPhone, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (recipientPhone) query.recipientPhone = new RegExp(recipientPhone, 'i');

    const skip = (Number(page) - 1) * Number(limit);

    const [messages, totalCount] = await Promise.all([
      WhatsAppMessage.find(query)
        .populate('invoiceId', 'invoiceNumber invoiceMonth totalPayable')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      WhatsAppMessage.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: messages.length,
      totalCount,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

const retryFailedMessage = async (req, res, next) => {
  try {
    const message = await WhatsAppMessage.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message record not found' });
    }

    message.retryCount = (message.retryCount || 0) + 1;

    const result = await whatsappService.sendWhatsAppMessage({
      recipientPhone: message.recipientPhone,
      recipientType: message.recipientType,
      recipientId: message.recipientId,
      recipientName: message.recipientName,
      templateName: message.templateName,
      templateVariables: message.templateVariables,
      invoiceId: message.invoiceId,
      paymentUrl: message.paymentUrl,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendSingleInvoiceLink,
  sendBulkInvoiceLinks,
  getMessageLogs,
  retryFailedMessage,
};
