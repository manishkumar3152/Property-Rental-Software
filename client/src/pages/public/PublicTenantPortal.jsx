import React, { useState } from 'react';
import {
  Phone,
  Search,
  Building2,
  Calendar,
  CreditCard,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { publicApi, receiptApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import { formatINR, formatDate, formatMonth } from '../../utils/formatters';

const PublicTenantPortal = ({ onBackToLogin, onOpenPaymentLink }) => {
  const { error: toastError } = useToast();
  const [phoneNumber, setPhoneNumber] = useState('9845000000');
  const [portalData, setPortalData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      toastError('Please enter your 10-digit registered mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await publicApi.getTenantPortalData(phoneNumber);
      setPortalData(res.data.data);
    } catch (err) {
      toastError(err.response?.data?.message || 'No rental records found for this phone number');
      setPortalData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Public Tenant Rent Portal</h1>
              <p className="text-xs text-slate-500">Check outstanding rent, view late fines, pay online & download receipts</p>
            </div>
          </div>
          {onBackToLogin && (
            <button
              onClick={onBackToLogin}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 bg-white rounded-lg border border-slate-200 shadow-2xs transition-colors"
            >
              Management Sign In
            </button>
          )}
        </div>

        {/* Search Phone Box */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Lookup Rental Records by Mobile Phone
          </h2>
          <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter 10-digit mobile number (e.g. 9845000000)"
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Looking up...'
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Fetch Rent Details</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Portal Results */}
        {portalData && (
          <div className="space-y-5 animate-scale-up">
            {/* Tenant Property Banner */}
            <div className="bg-gradient-to-r from-sky-700 to-sky-900 p-5 rounded-xl text-white shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 block mb-1">
                    Active Rental Lease
                  </span>
                  <h3 className="text-lg font-bold">{portalData.tenant.fullName}</h3>
                  <p className="text-xs text-sky-100/80 mt-1">
                    {portalData.tenant.property?.propertyName} ({portalData.tenant.property?.propertyNumber})
                  </p>
                  <p className="text-[11px] text-sky-200/70 mt-0.5">
                    {portalData.tenant.property?.address?.fullAddress}
                  </p>
                </div>
                <div className="text-left sm:text-right p-3 bg-white/10 rounded-xl backdrop-blur-xs border border-white/10">
                  <span className="text-[10px] text-sky-200 uppercase block font-semibold">Security Deposit on Record</span>
                  <span className="text-base font-bold text-white font-mono">{formatINR(portalData.tenant.securityDepositPaid)}</span>
                  <span className="text-[10px] text-sky-200/80 block mt-0.5">Landlord: {portalData.tenant.owner?.name}</span>
                </div>
              </div>
            </div>

            {/* Outstanding & Monthly Rent Invoices */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Monthly Rent Invoices & Payment Links
              </h3>

              <div className="divide-y divide-slate-100">
                {portalData.invoices.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No rent invoices generated yet.</p>
                ) : (
                  portalData.invoices.map((inv) => (
                    <div key={inv._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900 text-xs font-mono">{inv.invoiceNumber}</span>
                          <StatusBadge status={inv.paymentStatus} />
                        </div>
                        <span className="text-xs text-slate-500 block">
                          Rent Month: <strong className="text-slate-700">{formatMonth(inv.invoiceMonth)}</strong> • Due: {formatDate(inv.dueDate)}
                        </span>
                        {inv.lateFine > 0 && inv.paymentStatus !== 'Paid' && (
                          <span className="text-[11px] text-rose-600 font-bold block mt-0.5 font-mono">
                            Late fine accrued: +{formatINR(inv.lateFine)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Payable</span>
                          <span className="text-sm font-bold text-slate-900 font-mono block">{formatINR(inv.totalPayable)}</span>
                        </div>

                        {inv.paymentStatus !== 'Paid' ? (
                          <button
                            onClick={() => onOpenPaymentLink && onOpenPaymentLink(inv.paymentToken)}
                            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                          >
                            <span>PAY ONLINE</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Paid</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Official Receipts History */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Official Receipts History
              </h3>

              <div className="divide-y divide-slate-100">
                {portalData.receipts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No confirmed receipts yet.</p>
                ) : (
                  portalData.receipts.map((rec) => (
                    <div key={rec._id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block font-mono">{rec.receiptNumber}</span>
                        <span className="text-slate-400 text-[11px]">
                          {formatMonth(rec.invoiceMonth)} • Paid on {formatDate(rec.receiptDate)} ({rec.paymentMethod})
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-xs font-mono">{formatINR(rec.totalPaid)}</span>
                        <a
                          href={receiptApi.downloadPdf(rec._id)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicTenantPortal;
