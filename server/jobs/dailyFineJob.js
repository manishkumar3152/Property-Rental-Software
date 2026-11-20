const RentInvoice = require('../models/RentInvoice');
const fineService = require('../services/fineService');
const { logAudit } = require('../middleware/auditLogger');

const runDailyFineJob = async () => {
  console.log('[Cron Job] Starting Daily Fine & Overdue Check...');
  const now = new Date();

  try {
    // Find all invoices that are not paid or cancelled
    const invoices = await RentInvoice.find({
      paymentStatus: { $in: ['Unpaid', 'Overdue', 'Partially Paid'] },
    });

    let updatedCount = 0;
    let fineAddedCount = 0;

    for (const inv of invoices) {
      const prevFine = inv.lateFine || 0;
      const updated = await fineService.recalculateInvoiceFine(inv._id, now);

      if (updated.lateFine > prevFine) {
        fineAddedCount++;
      }
      updatedCount++;
    }

    console.log(`[Cron Job] Daily Fine Check complete. Checked: ${updatedCount}, Fines updated: ${fineAddedCount}`);

    await logAudit({
      action: 'DAILY_FINE_JOB_EXECUTED',
      entityType: 'System',
      details: `Daily fine job processed ${updatedCount} invoices. Fines accrued on ${fineAddedCount} invoices.`,
    });

    return { success: true, updatedCount, fineAddedCount };
  } catch (error) {
    console.error('[Cron Job Error] Daily fine job failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  runDailyFineJob,
};
