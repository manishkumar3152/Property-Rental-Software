const Notification = require('../models/Notification');

const getMyNotifications = async (req, res, next) => {
  try {
    const recipientId = req.user.role === 'owner' ? req.user.ownerId : req.user._id;
    const recipientType = req.user.role === 'owner' ? 'owner' : (req.user.role === 'super_admin' ? 'admin' : 'staff');

    const notifications = await Notification.find({
      $or: [
        { recipientId },
        { recipientType: 'admin' },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.status(200).json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

const markNotificationAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const recipientId = req.user.role === 'owner' ? req.user.ownerId : req.user._id;

    await Notification.updateMany(
      { $or: [{ recipientId }, { recipientType: 'admin' }], isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  markNotificationAsRead,
  markAllAsRead,
};
