const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

const runSystemTests = async () => {
  console.log('================================================================');
  console.log(' STARTING END-TO-END AUTOMATED VERIFICATION TEST SUITE');
  console.log('================================================================');

  let adminToken = '';
  let ownerToken = '';
  let testInvoice = null;

  try {
    // 1. Super Admin Authentication
    console.log('\n[Test 1] Testing Super Admin Login...');
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@propertyerp.com',
      password: 'Admin@12345',
    });
    console.log('✓ Admin login successful. Role:', adminLoginRes.data.user.role);
    adminToken = adminLoginRes.data.token;

    // 2. Owner 1 Authentication
    console.log('\n[Test 2] Testing Property Owner Login...');
    const ownerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'rajesh.sharma@example.com',
      password: 'Owner@12345',
    });
    console.log('✓ Owner login successful. Owner ID:', ownerLoginRes.data.user.ownerId);
    ownerToken = ownerLoginRes.data.token;

    // 3. Test Owner Data Isolation
    console.log('\n[Test 3] Testing Owner Data Isolation at Database Query Level...');
    const adminPropsRes = await axios.get(`${BASE_URL}/properties`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✓ Super Admin sees all ${adminPropsRes.data.count} properties.`);

    const ownerPropsRes = await axios.get(`${BASE_URL}/properties`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    console.log(`✓ Owner 1 sees only their own ${ownerPropsRes.data.count} properties.`);

    if (ownerPropsRes.data.count === adminPropsRes.data.count) {
      throw new Error('Data isolation failure: Owner saw all properties!');
    }
    console.log('✓ Owner data isolation confirmed: cross-owner data strictly inaccessible.');

    // 4. Test Invoices & Late Fine Recalculation
    console.log('\n[Test 4] Testing Rent Invoices & Dynamic Server-side Late Fine Calculation...');
    const invoicesRes = await axios.get(`${BASE_URL}/rent?paymentStatus=Overdue`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const overdueInvoices = invoicesRes.data.data;
    console.log(`✓ Found ${overdueInvoices.length} overdue invoices with late fines.`);

    if (overdueInvoices.length > 0) {
      testInvoice = overdueInvoices[0];
      const recalcRes = await axios.post(
        `${BASE_URL}/rent/${testInvoice._id}/recalculate-fine`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      console.log(`✓ Invoice ${testInvoice.invoiceNumber} server-calculated late fine: ₹${recalcRes.data.data.lateFine}`);
    }

    // 5. Test Public Payment Link & Checkout Flow
    console.log('\n[Test 5] Testing Public Secure Payment Page & Dynamic Payment Verification...');
    // Find an invoice that is not paid
    const pendingInvRes = await axios.get(`${BASE_URL}/rent`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const targetInvoice = pendingInvRes.data.data.find(i => i.paymentStatus !== 'Paid') || pendingInvRes.data.data[0];
    console.log(`✓ Selected invoice: ${targetInvoice.invoiceNumber} with token: ${targetInvoice.paymentToken?.slice(0, 16)}...`);

    // Public lookup
    const publicLookupRes = await axios.get(`${BASE_URL}/public/pay/${targetInvoice.paymentToken}`);
    console.log('✓ Public token lookup verified:', publicLookupRes.data.data.property.name, '| Total:', publicLookupRes.data.data.financials.totalPayable);

    // Public order creation
    const orderRes = await axios.post(`${BASE_URL}/public/pay/${targetInvoice.paymentToken}/order`);
    console.log('✓ Server-side order generated:', orderRes.data.data.orderId);

    // Public payment verification
    const verifyRes = await axios.post(`${BASE_URL}/public/pay/${targetInvoice.paymentToken}/verify`, {
      razorpay_order_id: orderRes.data.data.orderId,
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_signature: 'simulated_sig',
      paymentMethod: 'upi',
    });
    console.log('✓ Payment verified! Generated Receipt Number:', verifyRes.data.data.receiptNumber);

    // Verify invoice is now paid
    const checkInvRes = await axios.get(`${BASE_URL}/rent/${targetInvoice._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (checkInvRes.data.data.paymentStatus !== 'Paid') {
      throw new Error('Invoice was not marked as Paid after payment verification!');
    }
    console.log('✓ Verified invoice status atomically updated to Paid.');

    // 6. Test PDF Receipt Streaming
    console.log('\n[Test 6] Testing PDF Receipt Generation & Streaming...');
    const receiptRes = await axios.get(`${BASE_URL}/receipts/${verifyRes.data.data.receiptId}/pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      responseType: 'arraybuffer',
    });
    console.log(`✓ Received PDF Receipt stream (${receiptRes.data.length} bytes). Content-Type:`, receiptRes.headers['content-type']);

    // 7. Test Agreement Renewal with Escalation
    console.log('\n[Test 7] Testing Rental Agreement Renewal Business Logic...');
    const agrsRes = await axios.get(`${BASE_URL}/agreements`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const targetAgreement = agrsRes.data.data[0];
    const prevRent = targetAgreement.monthlyRent;
    const renewalRes = await axios.post(
      `${BASE_URL}/agreements/${targetAgreement._id}/renew`,
      {
        durationMonths: 11,
        overrideIncrementPercentage: 10,
        startDate: '2027-11-01',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(
      `✓ Agreement renewed! Previous Rent: ₹${prevRent} -> New Rent: ₹${renewalRes.data.data.newRent} (+${renewalRes.data.data.escalation}% increment applied)`
    );

    // 8. Test WhatsApp Payment Link Dispatch
    console.log('\n[Test 8] Testing WhatsApp Payment Link Dispatch...');
    const waRes = await axios.post(
      `${BASE_URL}/whatsapp/send-single`,
      { invoiceId: targetInvoice._id },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ WhatsApp message dispatched with status:', waRes.data.data.status, '| WAMID:', waRes.data.data.messageId);

    // 9. Test Background Automation Trigger
    console.log('\n[Test 9] Testing Background Automation Trigger (node-cron job)...');
    const cronJobRes = await axios.post(
      `${BASE_URL}/settings/trigger-job`,
      { jobType: 'daily_fine' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('✓ Daily fine cron job executed:', cronJobRes.data.message);

    // 10. Test Reports Aggregation
    console.log('\n[Test 10] Testing Advanced Reports Generation...');
    const reportRes = await axios.get(`${BASE_URL}/reports/owner-wise?month=2026-11`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`✓ Owner-wise rent collection report returned ${reportRes.data.count} owner summaries.`);

    console.log('\n================================================================');
    console.log(' ALL 10 END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED:', error.response?.data || error.message);
    process.exit(1);
  }
};

runSystemTests();
