import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Play,
  CheckCircle2,
  AlertTriangle,
  Building,
  CreditCard,
  MessageSquare,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { settingsApi } from '../../api';
import { useToast } from '../../context/ToastContext';

const ApplicationSettings = () => {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobLoading, setJobLoading] = useState(false);

  const [settings, setSettings] = useState({
    companyName: 'PropRent ERP Systems',
    address: 'Prestige Tech Park, Outer Ring Rd, Bengaluru, Karnataka 560103',
    contactEmail: 'support@propertyerp.com',
    contactPhone: '+91 98765 43210',
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    razorpaySettings: {
      isLiveMode: false,
      autoTransferEnabled: false,
      defaultTransferMode: 'manual',
    },
    whatsappSettings: {
      autoSendInvoiceReminders: true,
      autoSendPaymentReceipts: true,
    },
    rentSettings: {
      defaultDueDay: 10,
      defaultGracePeriod: 3,
      proratedRentCalculation: true,
    },
    lateFineSettings: {
      defaultRuleType: 'per_day',
      defaultAmount: 100,
      maxFineLimit: 2000,
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsApi.get();
      if (res.data.data) {
        setSettings(res.data.data);
      }
    } catch (err) {
      toastError('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(settings);
      toastSuccess('Application settings saved successfully');
    } catch (err) {
      toastError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerJob = async (jobType) => {
    setJobLoading(true);
    toastInfo(`Initiating background job: ${jobType}...`);
    try {
      const res = await settingsApi.triggerJob({ jobType });
      toastSuccess(`Job finished: ${res.data.message}`);
    } catch (err) {
      toastError('Job execution failed');
    } finally {
      setJobLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application Settings & Background Automation"
        subtitle="Configure enterprise payment gateways, WhatsApp templates, rent rules, and manually trigger cron tasks."
      />

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-sky-600" />
            <span>Organization Profile</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Entity Name</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Currency</label>
              <input
                type="text"
                disabled
                value={settings.defaultCurrency}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg outline-none text-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Timezone</label>
              <input
                type="text"
                disabled
                value={settings.timezone}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg outline-none font-mono text-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Payment & Rent Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Rent Rules */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Rent & Late Fine Policy</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Due Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={settings.rentSettings?.defaultDueDay || 10}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rentSettings: { ...settings.rentSettings, defaultDueDay: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.rentSettings?.defaultGracePeriod || 3}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      rentSettings: { ...settings.rentSettings, defaultGracePeriod: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Fine Amount (₹/day)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.lateFineSettings?.defaultAmount || 100}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lateFineSettings: { ...settings.lateFineSettings, defaultAmount: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Late Fine Cap (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={settings.lateFineSettings?.maxFineLimit || 2000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lateFineSettings: { ...settings.lateFineSettings, maxFineLimit: Number(e.target.value) },
                    })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Gateways Status */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-600" />
              <span>Payment Gateway & Route Configuration</span>
            </h3>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span>Razorpay Orders & Checkout:</span>
                <span className="font-bold text-emerald-700">ONLINE (Standard + UPI)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Webhook Signature Verification:</span>
                <span className="font-bold text-emerald-700">ACTIVE (HMAC-SHA256)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Settlement Mode:</span>
                <span className="font-semibold text-slate-800 uppercase">
                  {settings.razorpaySettings?.defaultTransferMode || 'Manual'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoReceipts"
                checked={settings.whatsappSettings?.autoSendPaymentReceipts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    whatsappSettings: {
                      ...settings.whatsappSettings,
                      autoSendPaymentReceipts: e.target.checked,
                    },
                  })
                }
                className="rounded text-sky-600 focus:ring-sky-500 border-slate-300 w-3.5 h-3.5"
              />
              <label htmlFor="autoReceipts" className="text-xs font-medium text-slate-700">
                Automatically send WhatsApp receipts on confirmed payments
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Manual Background Job Test Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Play className="w-4 h-4 text-sky-600" />
            <span>Automated Cron Job Execution Panel (node-cron)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manually trigger and verify background scheduler workers on demand.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 text-xs block mb-1">Daily Late Fine Accrual</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Checks overdue invoices and dynamically recalculates server-side late fines.
              </p>
            </div>
            <button
              onClick={() => handleTriggerJob('daily_fine')}
              disabled={jobLoading}
              className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Run Daily Fine Job Now
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 text-xs block mb-1">Monthly Rent Invoicing</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Batch creates recurring rent invoices for all active agreements with unique locks.
              </p>
            </div>
            <button
              onClick={() => handleTriggerJob('monthly_rent')}
              disabled={jobLoading}
              className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              Run Monthly Invoicing Now
            </button>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 text-xs block mb-1">Agreement Expiry Checker</span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Flags leases expiring in &lt;30 days and triggers renewal alerts.
              </p>
            </div>
            <button
              onClick={() => handleTriggerJob('agreement_expiry')}
              disabled={jobLoading}
              className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Run Expiry Check Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationSettings;
