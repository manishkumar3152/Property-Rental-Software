import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Lock,
  ArrowRight,
  Receipt,
  User,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { publicApi, receiptApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate, formatMonth } from '../../utils/formatters';

const PublicPaymentPage = ({ token: propToken, onBackToLogin }) => {
  // If token is in URL path: e.g. /pay/:token
  const token = propToken || window.location.pathname.split('/pay/')[1] || '';
  const { success: toastSuccess, error: toastError } = useToast();

  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  // Simulated Checkout Modal for Sandbox/Test mode
  const [isTestCheckoutModalOpen, setIsTestCheckoutModalOpen] = useState(false);
  const [testMethod, setTestMethod] = useState('upi');

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await publicApi.getInvoiceByToken(token);
      setInvoiceData(res.data.data);
      if (res.data.data.paymentStatus === 'Paid') {
        setPaymentSuccess({
          receiptNumber: res.data.data.receipt?.receiptNumber,
          receiptId: res.data.data.receipt?._id,
          amountPaid: res.data.data.financials.amountPaid,
          transactionId: res.data.data.receipt?.transactionId,
        });
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Invalid or expired payment link');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchInvoice();
    }
  }, [token]);

  const handleInitiatePayment = async () => {
    if (!invoiceData) return;
    setPaying(true);

    try {
      const res = await publicApi.createOrder(token);
      const order = res.data.data;

      // Check if standard Razorpay Checkout JS is loaded
      if (window.Razorpay && !order.isSimulated) {
        const options = {
          key: order.keyId,
          amount: order.amountInPaise,
          currency: order.currency,
          name: 'PropRent ERP Systems',
          description: `Rent payment for ${order.invoice.invoiceNumber}`,
          order_id: order.orderId,
          handler: async function (response) {
            try {
              const verifyRes = await publicApi.verifyPayment(token, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setPaymentSuccess(verifyRes.data.data);
              toastSuccess('Payment successful!');
              fetchInvoice();
            } catch (vErr) {
              toastError('Payment signature verification failed');
            }
          },
          prefill: {
            name: order.tenant.name,
            email: order.tenant.email,
            contact: order.tenant.phone,
          },
          theme: {
            color: '#0284c7',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Test / Sandbox Checkout Flow
        setIsTestCheckoutModalOpen(true);
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Could not initiate payment order');
    } finally {
      setPaying(false);
    }
  };

  const handleConfirmTestPayment = async () => {
    setPaying(true);
    try {
      const simulatedPaymentId = `pay_sim_${Date.now()}`;
      const verifyRes = await publicApi.verifyPayment(token, {
        razorpay_order_id: `order_sim_${invoiceData.invoiceNumber}`,
        razorpay_payment_id: simulatedPaymentId,
        razorpay_signature: 'simulated_sig',
        paymentMethod: testMethod,
      });

      setPaymentSuccess(verifyRes.data.data);
      setIsTestCheckoutModalOpen(false);
      toastSuccess('Payment processed successfully!');
      fetchInvoice();
    } catch (err) {
      toastError('Payment confirmation failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Verifying secure payment token...</p>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-7 rounded-2xl border border-slate-200/80 text-center shadow-xs">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-800">Invalid or Expired Payment Link</h2>
          <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
            This invoice payment URL could not be verified or has exceeded its validity period.
            Please request an updated link from your property manager.
          </p>
          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              Back to ERP Portal
            </button>
          )}
        </div>
      </div>
    );
  }

  const { property, tenant, financials, dueDate, paymentStatus, invoiceNumber, invoiceMonth } =
    invoiceData;
  const isPaid = paymentStatus === 'Paid';

  return (
    <div className="min-h-screen bg-slate-50/80 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block">
                PropRent ERP Systems
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Verified Tenant Rent Collection Portal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 shadow-2xs">
            <Lock className="w-3 h-3 text-sky-600" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* Payment Confirmation Card (If Paid) */}
        {isPaid && (
          <div className="bg-gradient-to-r from-sky-700 to-sky-900 text-white p-6 rounded-2xl shadow-md space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sky-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Rent Payment Confirmed!</h3>
                <p className="text-xs text-sky-200">
                  Payment of {formatINR(financials.amountPaid || financials.totalPayable)} successfully received.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-900/40 rounded-xl border border-white/10 text-xs text-sky-100 grid grid-cols-2 gap-3">
              <div>
                <span className="text-sky-300/70 block mb-0.5">Receipt Reference</span>
                <span className="font-mono font-bold text-white">{paymentSuccess?.receiptNumber || 'REC-CONFIRMED'}</span>
              </div>
              <div>
                <span className="text-sky-300/70 block mb-0.5">Transaction ID</span>
                <span className="font-mono text-white truncate block">{paymentSuccess?.transactionId || 'Confirmed'}</span>
              </div>
            </div>

            {paymentSuccess?.receiptId && (
              <a
                href={receiptApi.downloadPdf(paymentSuccess.receiptId)}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-white text-sky-800 hover:bg-sky-50 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Official Tax PDF Receipt</span>
              </a>
            )}
          </div>
        )}

        {/* Invoice Summary Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          {/* Header Strip */}
          <div className="bg-gradient-to-r from-sky-700 to-sky-900 p-5 text-white flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-semibold tracking-wider text-sky-200 block mb-1">
                Rent Invoice • {formatMonth(invoiceMonth)}
              </span>
              <h2 className="text-base font-bold text-white">{property?.name}</h2>
              <p className="text-xs text-sky-200/80 mt-0.5">{property?.address}</p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-sky-200 font-mono block">Inv: {invoiceNumber}</span>
              <span className="text-[11px] text-sky-200/80 mt-1 block">Due: {formatDate(dueDate)}</span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Tenant details banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <span className="text-slate-400 block text-[10px]">Tenant</span>
                  <span className="font-semibold text-slate-800">{tenant?.name}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Unit Number</span>
                <span className="font-semibold text-slate-800">{property?.number}</span>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Base Monthly Rent ({formatMonth(invoiceMonth)})</span>
                <span className="font-semibold text-slate-800 font-mono">{formatINR(financials.baseRent)}</span>
              </div>

              {financials.previousOutstanding > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Previous Unpaid Outstanding</span>
                  <span className="font-semibold text-slate-800 font-mono">{formatINR(financials.previousOutstanding)}</span>
                </div>
              )}

              {financials.lateFine > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Late Payment Fine Accrued</span>
                  </span>
                  <span className="font-mono">+{formatINR(financials.lateFine)}</span>
                </div>
              )}

              {financials.otherCharges > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Maintenance / Utility Charges</span>
                  <span className="font-semibold text-slate-800 font-mono">{formatINR(financials.otherCharges)}</span>
                </div>
              )}

              {financials.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount / Waiver</span>
                  <span className="font-mono">-{formatINR(financials.discount)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-bold text-slate-900 block">Total Payable</span>
                  <span className="text-[10px] text-slate-400">Server verified • Zero extra convenience fee</span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {formatINR(financials.totalPayable)}
                </div>
              </div>
            </div>

            {/* Action Button */}
            {!isPaid ? (
              <button
                onClick={handleInitiatePayment}
                disabled={paying}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {paying ? (
                  'Preparing Secure Gateway...'
                ) : (
                  <>
                    <span>PAY NOW WITH RAZORPAY / UPI</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <div className="text-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Invoice Fully Paid</span>
              </div>
            )}

            {/* Trust Badges */}
            <div className="pt-1 flex items-center justify-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                RBI Compliant
              </span>
              <span>•</span>
              <span>UPI / Cards / NetBanking</span>
              <span>•</span>
              <span>Instant PDF Receipt</span>
            </div>
          </div>
        </div>

        {/* Footer / Back */}
        {onBackToLogin && (
          <div className="text-center">
            <button
              onClick={onBackToLogin}
              className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
            >
              Management Portal Login
            </button>
          </div>
        )}
      </div>

      {/* Test / Sandbox Checkout Modal */}
      {isTestCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Razorpay Test Checkout</h3>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                Sandbox Mode
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select your simulated payment method to test real-time backend signature verification,
              receipt generation, and owner ledger crediting.
            </p>

            <div className="space-y-2">
              {[
                { id: 'upi', name: 'Instant UPI (Google Pay / PhonePe / Paytm)' },
                { id: 'netbanking', name: 'Net Banking (HDFC / ICICI / SBI)' },
                { id: 'card', name: 'Debit / Credit Card (Visa / MasterCard)' },
              ].map((m) => (
                <label
                  key={m.id}
                  onClick={() => setTestMethod(m.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    testMethod === m.id
                      ? 'bg-sky-50 border-sky-500 text-sky-900 font-semibold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{m.name}</span>
                  <input
                    type="radio"
                    name="testMethod"
                    checked={testMethod === m.id}
                    onChange={() => setTestMethod(m.id)}
                    className="text-sky-600 focus:ring-sky-600"
                  />
                </label>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Payable Amount</span>
                <span className="text-base font-bold text-slate-900 font-mono">{formatINR(financials.totalPayable)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTestCheckoutModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTestPayment}
                  disabled={paying}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
                >
                  {paying ? 'Verifying...' : 'Confirm Test Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPaymentPage;
