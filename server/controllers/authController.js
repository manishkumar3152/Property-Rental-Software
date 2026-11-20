const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Owner = require('../models/Owner');
const { logAudit } = require('../middleware/auditLogger');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_jwt_key_property_rental_erp_2026_xyz', {
    expiresIn: '30d',
  });
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Populate owner info if role is owner
    let ownerDetails = null;
    if (user.role === 'owner' && user.ownerId) {
      ownerDetails = await Owner.findById(user.ownerId);
    }

    const token = signToken(user._id);

    await logAudit({
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      user,
      req,
      details: `User logged in with role: ${user.role}`,
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerId: user.ownerId,
        ownerDetails,
        permissions: user.permissions,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let ownerDetails = null;
    if (user.role === 'owner' && user.ownerId) {
      ownerDetails = await Owner.findById(user.ownerId);
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerId: user.ownerId,
        ownerDetails,
        permissions: user.permissions,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
  updatePassword,
};
