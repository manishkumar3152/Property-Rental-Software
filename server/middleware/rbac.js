/**
 * Role-Based Access Control and Data Isolation Middleware
 */

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user?.role || 'Guest'}) is not authorized to access this resource. Required: [${roles.join(', ')}]`,
      });
    }
    next();
  };
};

/**
 * Enforces owner data isolation at database query level
 */
const enforceOwnerScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  // Super Admin has unrestricted access
  if (req.user.role === 'super_admin') {
    req.ownerFilter = {};
    return next();
  }

  // Property Owner can ONLY access their own data
  if (req.user.role === 'owner') {
    if (!req.user.ownerId) {
      return res.status(403).json({
        success: false,
        message: 'No Property Owner profile is linked to this account.',
      });
    }

    req.ownerFilter = { ownerId: req.user.ownerId };

    // Prevent tampering with requested ownerId in route params or query
    if (req.params.ownerId && req.params.ownerId !== req.user.ownerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Security Violation: Cannot access records belonging to another property owner.',
      });
    }

    // Force ownerId in body if creating resources
    if (req.body && req.method !== 'GET') {
      req.body.ownerId = req.user.ownerId;
    }

    return next();
  }

  // Staff role
  if (req.user.role === 'staff') {
    if (req.user.ownerId) {
      req.ownerFilter = { ownerId: req.user.ownerId };
    } else {
      req.ownerFilter = {};
    }
    return next();
  }

  return res.status(403).json({ success: false, message: 'Unauthorized role scope' });
};

/**
 * Check fine-grained permissions for staff
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (req.user.role === 'super_admin' || req.user.role === 'owner') {
      return next();
    }
    if (req.user.role === 'staff' && req.user.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: `Access denied. Missing required permission: '${permission}'`,
    });
  };
};

module.exports = {
  authorizeRoles,
  enforceOwnerScope,
  checkPermission,
};
