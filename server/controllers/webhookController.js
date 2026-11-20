const razorpayService = require('../services/razorpayService');

const handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  // Razorpay requires verifying HMAC against raw request payload
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!razorpayService.isMockRazorpay()) {
    const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[Webhook Warning] Invalid Razorpay webhook signature');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
  }

  try {
    const result = await razorpayService.handleWebhookEvent(req.body);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error('[Webhook Error]', error.message);
    // Still respond 200 so Razorpay does not endlessly retry, but error is logged in WebhookEvent
    return res.status(200).json({ success: false, error: error.message });
  }
};

module.exports = {
  handleRazorpayWebhook,
};
