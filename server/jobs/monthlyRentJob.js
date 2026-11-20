const rentService = require('../services/rentService');
const { logAudit } = require('../middleware/auditLogger');

const runMonthlyRentJob = async (specificMonth = null) => {
  let targetMonth = specificMonth;

  if (!targetMonth) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    targetMonth = `${year}-${month}`;
  }

  console.log(`[Cron Job] Starting Monthly Rent Invoice Generation for: ${targetMonth}...`);

  try {
    const results = await rentService.generateBulkRentInvoices(targetMonth);

    console.log(`[Cron Job] Monthly Rent Generation complete for ${targetMonth}: Generated: ${results.generated.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`);

    await logAudit({
      action: 'MONTHLY_RENT_JOB_EXECUTED',
      entityType: 'System',
      details: `Generated ${results.generated.length} invoices for ${targetMonth}. Skipped: ${results.skipped.length}.`,
    });

    return {
      success: true,
      targetMonth,
      results,
    };
  } catch (error) {
    console.error(`[Cron Job Error] Monthly rent generation failed for ${targetMonth}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  runMonthlyRentJob,
};
