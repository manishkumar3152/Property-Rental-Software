const axios = require('axios');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const RentInvoice = require('../models/RentInvoice');
const { formatINR, formatDate, formatMonth } = require('../utils/formatters');

/**
 * Clean phone number to WhatsApp international format (e.g. +91XXXXXXXXXX -> 91XXXXXXXXXX)
 */
const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    return `91${cleaned}`; // Default to India country code if 10 digits
  }
  return cleaned;
};

/**
 * Builds formatted text message from template parameters
 */
const buildMessageBody = (templateName, variables) => {
  switch (templateName) {
    case 'rent_invoice_generated':
      return `Hello ${variables.tenantName},\n\nYour rent invoice for ${variables.propertyName} is generated.\n\nRent Month: ${variables.month}\nRent: ${variables.rent}\nDue Date: ${variables.dueDate}\nTotal Payable: ${variables.totalAmount}\n\nPay securely here:\n${variables.paymentUrl}\n\nThank you.\nPropRent ERP`;

    case 'rent_overdue_reminder':
      return `⚠️ URGENT: Rent Overdue Reminder\n\nDear ${variables.tenantName},\n\nYour rent for ${variables.propertyName} is overdue.\n\nRent Month: ${variables.month}\nBase Rent: ${variables.rent}\nLate Fine Accrued: ${variables.fine}\nTotal Outstanding: ${variables.totalAmount}\n\nPlease pay immediately to avoid additional daily fines:\n${variables.paymentUrl}\n\nPropRent ERP`;

    case 'payment_success_receipt':
      return `✅ Payment Received with Thanks!\n\nDear ${variables.tenantName},\n\nWe have received your rent payment of ${variables.amountPaid} for ${variables.propertyName} (${variables.month}).\n\nReceipt Number: ${variables.receiptNumber}\nTransaction ID: ${variables.transactionId}\n\nYou can download your official receipt here:\n${variables.receiptUrl}\n\nPropRent ERP`;

    case 'agreement_expiry_alert':
      return `📢 Lease Agreement Expiry Notice\n\nDear ${variables.tenantName},\n\nYour rental agreement for ${variables.propertyName} is expiring on ${variables.expiryDate}.\n\nProposed renewal escalation is ${variables.escalationRate}%. Please contact property management to finalize agreement renewal.\n\nPropRent ERP`;

    default:
      return variables.customText || `Notification from PropRent ERP: ${JSON.stringify(variables)}`;
  }
};

/**
 * Sends a WhatsApp message via WhatsApp Cloud API or handles test simulation
 */
const sendWhatsAppMessage = async ({
  recipientPhone,
  recipientType = 'tenant',
  recipientId = null,
  recipientName = '',
  templateName,
  templateVariables = {},
  invoiceId = null,
  agreementId = null,
  paymentUrl = '',
}) => {
  const sanitizedPhone = sanitizePhoneNumber(recipientPhone);
  const bodyText = buildMessageBody(templateName, templateVariables);

  // Create message record
  const messageDoc = new WhatsAppMessage({
    recipientPhone: sanitizedPhone,
    recipientType,
    recipientId,
    recipientName,
    templateName,
    templateVariables,
    bodyText,
    invoiceId,
    agreementId,
    paymentUrl,
    status: 'queued',
  });

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  // Check if live Meta credentials are configured
  const isMockCredentials = !accessToken || accessToken.includes('mock') || !phoneNumberId || phoneNumberId.includes('10001234');

  if (isMockCredentials) {
    // Development / Demonstration Mode: Log and simulate successful dispatch
    messageDoc.messageId = `wamid_simulated_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    messageDoc.status = 'delivered';
    messageDoc.sentAt = new Date();
    messageDoc.deliveredAt = new Date();
    await messageDoc.save();

    if (invoiceId) {
      await RentInvoice.findByIdAndUpdate(invoiceId, {
        $inc: { whatsappShareCount: 1 },
        lastWhatsappSentAt: new Date(),
      });
    }

    console.log(`[WhatsApp Simulated Dispatch] -> To: ${sanitizedPhone} | Template: ${templateName}`);
    return {
      success: true,
      simulated: true,
      messageId: messageDoc.messageId,
      status: 'delivered',
      bodyText,
    };
  }

  // Official Meta WhatsApp Business Cloud API Endpoint
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: sanitizedPhone,
      type: 'text',
      text: {
        body: bodyText,
      },
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    const metaMessageId = response.data?.messages?.[0]?.id || `wamid_${Date.now()}`;
    messageDoc.messageId = metaMessageId;
    messageDoc.status = 'sent';
    messageDoc.sentAt = new Date();
    await messageDoc.save();

    if (invoiceId) {
      await RentInvoice.findByIdAndUpdate(invoiceId, {
        $inc: { whatsappShareCount: 1 },
        lastWhatsappSentAt: new Date(),
      });
    }

    return {
      success: true,
      simulated: false,
      messageId: metaMessageId,
      status: 'sent',
    };
  } catch (error) {
    const errorDetails = error.response?.data?.error?.message || error.message;
    messageDoc.status = 'failed';
    messageDoc.errorMessage = errorDetails;
    await messageDoc.save();

    return {
      success: false,
      error: errorDetails,
    };
  }
};

/**
 * Dispatches bulk WhatsApp rent payment links individually
 */
const sendBulkInvoiceWhatsApp = async (invoiceIds) => {
  const invoices = await RentInvoice.find({ _id: { $in: invoiceIds } })
    .populate('tenantId')
    .populate('propertyId');

  const results = {
    total: invoices.length,
    successful: 0,
    failed: 0,
    items: [],
  };

  const clientUrl = process.env.PUBLIC_PAYMENT_URL || 'http://localhost:5173/pay';

  for (const inv of invoices) {
    if (!inv.tenantId || !inv.tenantId.mobileNumber) {
      results.failed += 1;
      results.items.push({
        invoiceNumber: inv.invoiceNumber,
        status: 'skipped',
        reason: 'No tenant phone number found',
      });
      continue;
    }

    const paymentUrl = `${clientUrl}/${inv.paymentToken}`;
    const templateVariables = {
      tenantName: inv.tenantId.fullName,
      propertyName: inv.propertyId ? `${inv.propertyId.propertyName} (${inv.propertyId.propertyNumber})` : 'Your Property',
      month: formatMonth(inv.invoiceMonth),
      rent: formatINR(inv.baseRent),
      fine: formatINR(inv.lateFine),
      dueDate: formatDate(inv.dueDate),
      totalAmount: formatINR(inv.totalPayable),
      paymentUrl,
    };

    const isOverdue = inv.paymentStatus === 'Overdue';
    const templateName = isOverdue ? 'rent_overdue_reminder' : 'rent_invoice_generated';

    const sendRes = await sendWhatsAppMessage({
      recipientPhone: inv.tenantId.whatsappNumber || inv.tenantId.mobileNumber,
      recipientType: 'tenant',
      recipientId: inv.tenantId._id,
      recipientName: inv.tenantId.fullName,
      templateName,
      templateVariables,
      invoiceId: inv._id,
      agreementId: inv.agreementId,
      paymentUrl,
    });

    if (sendRes.success) {
      results.successful += 1;
      results.items.push({
        invoiceNumber: inv.invoiceNumber,
        tenant: inv.tenantId.fullName,
        phone: inv.tenantId.mobileNumber,
        status: 'sent',
      });
    } else {
      results.failed += 1;
      results.items.push({
        invoiceNumber: inv.invoiceNumber,
        tenant: inv.tenantId.fullName,
        phone: inv.tenantId.mobileNumber,
        status: 'failed',
        reason: sendRes.error,
      });
    }
  }

  return results;
};

module.exports = {
  sanitizePhoneNumber,
  buildMessageBody,
  sendWhatsAppMessage,
  sendBulkInvoiceWhatsApp,
};
