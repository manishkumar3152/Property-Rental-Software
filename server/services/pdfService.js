const PDFDocument = require('pdfkit');
const { formatINR, formatDate, formatMonth } = require('../utils/formatters');

/**
 * Builds a professional PDF receipt and pipes it to a writable stream (e.g., res)
 */
const generateReceiptPDF = (receipt, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Stream directly to response
  doc.pipe(res);

  const primaryColor = '#0f392b';
  const secondaryColor = '#1b4332';
  const grayText = '#64748b';
  const lightBg = '#f1f5f9';

  // Header Banner
  doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);

  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('PROPRENT ERP SYSTEMS', 40, 30);
  doc.fontSize(10).font('Helvetica').text('Enterprise Property Rental Management & Collection ERP', 40, 58);
  doc.text('support@propertyerp.com | +91 98765 43210', 40, 72);

  // Receipt Badge
  const isDuplicate = receipt.isDuplicate;
  const badgeTitle = isDuplicate ? 'DUPLICATE RENT RECEIPT' : 'OFFICIAL RENT RECEIPT';
  const badgeColor = isDuplicate ? '#dc2626' : '#16a34a';

  doc.rect(400, 30, 160, 45).fill(badgeColor);
  doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold').text(badgeTitle, 405, 47, { width: 150, align: 'center' });

  let y = 120;

  // Invoice / Receipt Metadata
  doc.rect(40, y, 515, 65).fillAndStroke(lightBg, '#e2e8f0');

  doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold');
  doc.text('Receipt Number:', 55, y + 15);
  doc.text('Receipt Date:', 55, y + 38);

  doc.fillColor('#1e293b').font('Helvetica');
  doc.text(receipt.receiptNumber || 'N/A', 150, y + 15);
  doc.text(formatDate(receipt.receiptDate), 150, y + 38);

  doc.fillColor(primaryColor).font('Helvetica-Bold');
  doc.text('Invoice Ref:', 320, y + 15);
  doc.text('Payment Method:', 320, y + 38);

  doc.fillColor('#1e293b').font('Helvetica');
  doc.text(`${receipt.invoiceNumber} (${formatMonth(receipt.invoiceMonth)})`, 415, y + 15);
  doc.text(String(receipt.paymentMethod).toUpperCase(), 415, y + 38);

  y += 85;

  // Tenant & Property Information Block
  doc.rect(40, y, 250, 110).fillAndStroke('#ffffff', '#cbd5e1');
  doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('TENANT DETAILS', 50, y + 10);
  doc.fillColor(grayText).fontSize(9).font('Helvetica').text('Full Name:', 50, y + 30);
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(receipt.tenantName, 50, y + 42);
  doc.fillColor(grayText).fontSize(9).font('Helvetica').text('Transaction / Order ID:', 50, y + 62);
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica').text(receipt.transactionId || 'N/A', 50, y + 74);

  doc.rect(305, y, 250, 110).fillAndStroke('#ffffff', '#cbd5e1');
  doc.fillColor(secondaryColor).fontSize(11).font('Helvetica-Bold').text('PROPERTY & OWNER DETAILS', 315, y + 10);
  doc.fillColor(grayText).fontSize(9).font('Helvetica').text('Property:', 315, y + 30);
  doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold').text(receipt.propertyName, 315, y + 42);
  doc.fillColor(grayText).fontSize(9).font('Helvetica').text('Address:', 315, y + 58);
  doc.fillColor('#0f172a').fontSize(9).font('Helvetica').text(receipt.propertyAddress, 315, y + 70, { width: 230 });
  doc.fillColor(grayText).fontSize(9).font('Helvetica').text(`Landlord / Owner: ${receipt.ownerName}`, 315, y + 94);

  y += 130;

  // Payment Breakdown Table
  doc.rect(40, y, 515, 26).fill(primaryColor);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text('DESCRIPTION', 55, y + 8);
  doc.text('AMOUNT (INR)', 440, y + 8, { width: 100, align: 'right' });

  y += 26;

  const items = [
    { label: `Base Monthly Rent (${formatMonth(receipt.invoiceMonth)})`, amount: receipt.baseRent },
    { label: 'Late Payment Fine', amount: receipt.lateFine },
    { label: 'Other Utility / Maintenance Charges', amount: receipt.otherCharges },
    { label: 'Discount / Waiver Applied', amount: -receipt.discount },
  ];

  items.forEach((item, index) => {
    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    doc.rect(40, y, 515, 24).fillAndStroke(rowBg, '#e2e8f0');

    doc.fillColor('#334155').fontSize(9).font('Helvetica').text(item.label, 55, y + 7);
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold').text(formatINR(item.amount), 440, y + 7, { width: 100, align: 'right' });
    y += 24;
  });

  // Total Paid Row
  doc.rect(40, y, 515, 32).fill('#e8f5e9');
  doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('TOTAL AMOUNT PAID', 55, y + 10);
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text(formatINR(receipt.totalPaid), 415, y + 8, { width: 125, align: 'right' });

  y += 50;

  // Duplicate Warning Notice
  if (isDuplicate) {
    doc.rect(40, y, 515, 30).fill('#fee2e2');
    doc.fillColor('#b91c1c').fontSize(9).font('Helvetica-Bold').text(
      `NOTICE: This is a duplicate receipt copy re-issued on ${formatDate(receipt.duplicateIssuedAt)}. Reason: ${receipt.duplicateIssuedReason || 'Customer Request'}.`,
      50,
      y + 10
    );
    y += 45;
  }

  // Verification & Footer
  y = Math.max(y + 20, 680);
  doc.rect(40, y, 515, 60).fillAndStroke('#f8fafc', '#cbd5e1');

  doc.fillColor('#059669').fontSize(10).font('Helvetica-Bold').text('Payment Status: CONFIRMED & RECONCILED', 55, y + 12);
  doc.fillColor(grayText).fontSize(8).font('Helvetica').text(
    'This is a digitally generated and signed rent receipt authorized by PropRent ERP. No physical signature is required. For any inquiries, please contact support with the receipt reference number.',
    55,
    y + 28,
    { width: 485 }
  );

  doc.end();
};

/**
 * Generates an Agreement Summary PDF
 */
const generateAgreementPDF = (agreement, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  const primaryColor = '#0f392b';

  doc.rect(0, 0, doc.page.width, 90).fill(primaryColor);
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('RENTAL LEASE AGREEMENT', 40, 28);
  doc.fontSize(10).font('Helvetica').text(`Agreement Ref: ${agreement.agreementNumber}`, 40, 56);

  let y = 115;
  doc.fillColor('#1e293b').fontSize(11).font('Helvetica');
  doc.text(`This Rental Agreement is made and executed for duration of ${agreement.agreementDuration || 11} months:`, 40, y);
  y += 25;

  doc.rect(40, y, 515, 110).fillAndStroke('#f8fafc', '#e2e8f0');
  doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold');
  doc.text('Key Terms:', 55, y + 12);

  doc.fillColor('#1e293b').font('Helvetica').fontSize(9);
  doc.text(`• Agreement Period: ${formatDate(agreement.agreementStartDate)} to ${formatDate(agreement.agreementEndDate)}`, 55, y + 30);
  doc.text(`• Monthly Base Rent: ${formatINR(agreement.monthlyRent)} (Due on ${agreement.monthlyDueDate || 10}th of each month)`, 55, y + 46);
  doc.text(`• Security Deposit Paid: ${formatINR(agreement.securityDeposit)}`, 55, y + 62);
  doc.text(`• Grace Period for Late Payment: ${agreement.gracePeriod || 3} days`, 55, y + 78);
  doc.text(`• Annual Renewal Escalation: ${agreement.rentIncrementPercentage || 10}%`, 55, y + 94);

  y += 130;
  doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('Renewal Conditions:', 40, y);
  y += 18;
  doc.fillColor('#334155').fontSize(9).font('Helvetica').text(
    agreement.renewalConditions || 'Standard 11-month lease renewal subject to mutual agreement and rent escalation.',
    40,
    y,
    { width: 515 }
  );

  y += 60;
  doc.text('Landlord / Owner Signature: _______________________', 40, y);
  doc.text('Tenant Signature: _______________________', 320, y);

  doc.end();
};

module.exports = {
  generateReceiptPDF,
  generateAgreementPDF,
};
