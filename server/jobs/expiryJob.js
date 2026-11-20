const Agreement = require('../models/Agreement');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/auditLogger');
const { formatDate } = require('../utils/formatters');

const runAgreementExpiryJob = async () => {
  console.log('[Cron Job] Checking Agreement Expirations...');
  const now = new Date();
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  try {
    // 1. Mark expired agreements
    const expiredResult = await Agreement.updateMany(
      {
        status: { $in: ['Active', 'Expiring'] },
        agreementEndDate: { $lt: now },
      },
      {
        $set: { status: 'Expired' },
      }
    );

    // 2. Mark expiring agreements within 30 days
    const expiringAgreements = await Agreement.find({
      status: 'Active',
      agreementEndDate: { $gte: now, $lte: thirtyDaysAhead },
    }).populate('tenantId').populate('propertyId');

    let notifiedCount = 0;
    for (const agr of expiringAgreements) {
      agr.status = 'Expiring';
      await agr.save();

      // Notify Admin and Owner
      await Notification.create({
        recipientType: 'owner',
        recipientId: agr.ownerId,
        title: 'Agreement Expiring Soon',
        message: `Rental agreement for ${agr.propertyId?.propertyName || 'Property'} with ${agr.tenantId?.fullName || 'Tenant'} expires on ${formatDate(agr.agreementEndDate)}.`,
        notificationType: 'agreement_expiry',
        channel: 'in_app',
        link: `/agreements/${agr._id}`,
      });

      notifiedCount++;
    }

    console.log(`[Cron Job] Expiry Job complete. Expired marked: ${expiredResult.modifiedCount}, Expiring flagged: ${notifiedCount}`);

    return {
      success: true,
      expiredCount: expiredResult.modifiedCount,
      expiringCount: notifiedCount,
    };
  } catch (error) {
    console.error('[Cron Job Error] Expiry job failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  runAgreementExpiryJob,
};
