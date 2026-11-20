const crypto = require('crypto');

/**
 * Generates a cryptographically secure random token for public URLs
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string} - Hex string
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Generates sequential formatted code
 * e.g., 'PROP-1001', 'TEN-1001', 'INV-202611-0001', 'PAY-202611-0001'
 */
const generateFormattedId = async (model, fieldName, prefix, padLength = 4) => {
  try {
    const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const lastDoc = await model.findOne({ [fieldName]: new RegExp(`^${escapedPrefix}`) })
      .sort({ [fieldName]: -1 })
      .select(fieldName)
      .lean();

    let nextNumber = 1;
    if (lastDoc && lastDoc[fieldName]) {
      const match = lastDoc[fieldName].match(/(\d+)$/);
      if (match && match[1]) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    let candidate = `${prefix}${String(nextNumber).padStart(padLength, '0')}`;

    // Extra collision safeguard loop
    let collision = await model.findOne({ [fieldName]: candidate }).select('_id').lean();
    while (collision) {
      nextNumber++;
      candidate = `${prefix}${String(nextNumber).padStart(padLength, '0')}`;
      collision = await model.findOne({ [fieldName]: candidate }).select('_id').lean();
    }

    return candidate;
  } catch (error) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomSuffix}`;
  }
};

module.exports = {
  generateSecureToken,
  generateFormattedId,
};
