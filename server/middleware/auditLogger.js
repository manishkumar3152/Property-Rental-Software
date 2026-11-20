const AuditLog = require('../models/AuditLog');

const logAudit = async ({
  action,
  entityType,
  entityId,
  user,
  previousState,
  newState,
  req,
  details,
}) => {
  try {
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'System';

    await AuditLog.create({
      action,
      entityType,
      entityId,
      userId: user?._id || user?.id,
      userRole: user?.role || 'system',
      userName: user?.name || 'System Worker',
      previousState,
      newState,
      ipAddress,
      userAgent,
      details,
    });
  } catch (error) {
    console.error('[AuditLog Error]', error.message);
  }
};

module.exports = {
  logAudit,
};
