const ApplicationSettings = require('../models/ApplicationSettings');
const { runDailyFineJob } = require('../jobs/dailyFineJob');
const { runMonthlyRentJob } = require('../jobs/monthlyRentJob');
const { runAgreementExpiryJob } = require('../jobs/expiryJob');
const { logAudit } = require('../middleware/auditLogger');

const getSettings = async (req, res, next) => {
  try {
    let settings = await ApplicationSettings.findOne();
    if (!settings) {
      settings = await ApplicationSettings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    let settings = await ApplicationSettings.findOne();
    if (!settings) {
      settings = new ApplicationSettings();
    }

    const previousState = settings.toObject();
    Object.assign(settings, req.body);
    await settings.save();

    await logAudit({
      action: 'SETTINGS_UPDATED',
      entityType: 'Settings',
      entityId: settings._id,
      user: req.user,
      previousState,
      newState: settings.toObject(),
      req,
      details: 'Updated application settings and configuration',
    });

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

const triggerManualJob = async (req, res, next) => {
  try {
    const { jobType, targetMonth } = req.body;
    let result = null;

    if (jobType === 'daily_fine') {
      result = await runDailyFineJob();
    } else if (jobType === 'monthly_rent') {
      result = await runMonthlyRentJob(targetMonth);
    } else if (jobType === 'agreement_expiry') {
      result = await runAgreementExpiryJob();
    } else {
      return res.status(400).json({ success: false, message: 'Invalid jobType specified' });
    }

    res.status(200).json({
      success: true,
      message: `Job ${jobType} executed manually`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  triggerManualJob,
};
