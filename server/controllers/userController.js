const User = require('../models/User');
const { logAudit } = require('../middleware/auditLogger');

const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('ownerId', 'name ownerCode')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, ownerId, mobile, permissions } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'staff',
      ownerId: role === 'owner' ? ownerId : (ownerId || null),
      mobile,
      permissions: permissions || [],
      status: 'active',
    });

    await logAudit({
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user._id,
      user: req.user,
      req,
      details: `Created new user: ${user.name} (${user.role})`,
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({ success: true, data: userObj });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, role, ownerId, mobile, permissions, status, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (ownerId !== undefined) user.ownerId = ownerId;
    if (mobile) user.mobile = mobile;
    if (permissions) user.permissions = permissions;
    if (status) user.status = status;
    if (password) user.password = password;

    await user.save();

    await logAudit({
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user._id,
      user: req.user,
      req,
      details: `Updated user: ${user.name}`,
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({ success: true, data: userObj });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete / deactivate
    user.status = 'inactive';
    await user.save();

    await logAudit({
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: user._id,
      user: req.user,
      req,
      details: `Deactivated user: ${user.name}`,
    });

    res.status(200).json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
};
