const cron = require('node-cron');
const { runDailyFineJob } = require('./dailyFineJob');
const { runMonthlyRentJob } = require('./monthlyRentJob');
const { runAgreementExpiryJob } = require('./expiryJob');

const initCronJobs = () => {
  console.log('[Scheduler] Initializing automated background jobs (Timezone: Asia/Kolkata)...');

  // Daily job at 00:30 AM IST (calculate fines, check overdue, check expiry)
  cron.schedule(
    '30 0 * * *',
    async () => {
      console.log('[Scheduler] Executing scheduled daily jobs...');
      await runDailyFineJob();
      await runAgreementExpiryJob();
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  // Monthly job: 1st of every month at 00:05 AM IST (generate recurring rent invoices)
  cron.schedule(
    '5 0 1 * *',
    async () => {
      console.log('[Scheduler] Executing scheduled monthly rent generation...');
      await runMonthlyRentJob();
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  console.log('[Scheduler] Background jobs successfully scheduled.');
};

module.exports = {
  initCronJobs,
  runDailyFineJob,
  runMonthlyRentJob,
  runAgreementExpiryJob,
};
