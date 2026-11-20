import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Landmark,
  CreditCard,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { propertyApi, tenantApi, rentApi, paymentApi, settlementApi } from '../../api';
import { formatINR, formatDate, formatMonth } from '../../utils/formatters';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [metrics, setMetrics] = useState({
    totalProperties: 0,
    occupiedProperties: 0,
    activeTenants: 0,
    expectedIncome: 0,
    collectedIncome: 0,
    outstandingRent: 0,
    lateFines: 0,
    currentLedgerBalance: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [settlementHistory, setSettlementHistory] = useState([]);

  useEffect(() => {
    const fetchOwnerData = async () => {
      setLoading(true);
      try {
        const [
          propsRes,
          tenantsRes,
          invoicesRes,
          paymentsRes,
          ledgerRes,
          settlementsRes,
        ] = await Promise.all([
          propertyApi.getAll(),
          tenantApi.getAll(),
          rentApi.getAll({ invoiceMonth: selectedMonth }),
          paymentApi.getAll({ limit: 6 }),
          settlementApi.getLedger(),
          settlementApi.getSettlements(),
        ]);

        const props = propsRes.data.data || [];
        const invSummary = invoicesRes.data.summary || {};

        setMetrics({
          totalProperties: props.length,
          occupiedProperties: props.filter((p) => p.availabilityStatus === 'Occupied').length,
          activeTenants: tenantsRes.data.count || 0,
          expectedIncome: invSummary.totalInvoiced || 0,
          collectedIncome: invSummary.totalCollected || 0,
          outstandingRent: invSummary.totalPending || 0,
          lateFines: invSummary.totalLateFines || 0,
          currentLedgerBalance: ledgerRes.data.currentBalance || 0,
        });

        setRecentTransactions(paymentsRes.data.data || []);
        setSettlementHistory(settlementsRes.data.data || []);
      } catch (err) {
        console.error('[Owner Dashboard Error]', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOwnerData();
  }, [selectedMonth]);

  if (loading) return <LoadingSpinner text="Loading your owner financial dashboard..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.name || 'Property Owner'}`}
        subtitle={`Owner Portfolio & Financial Settlement Dashboard • ${formatMonth(selectedMonth)}`}
        actions={
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="2026-11">November 2026</option>
              <option value="2026-10">October 2026</option>
            </select>
          </div>
        }
      />

      {/* Available Balance Banner */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-700 text-white p-5 rounded-xl shadow-xs border border-sky-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-sky-200 block mb-1">
            Available Ledger Balance For Payout
          </span>
          <div className="text-3xl font-extrabold tracking-tight font-mono">{formatINR(metrics.currentLedgerBalance)}</div>
          <p className="text-xs text-sky-100 mt-1">
            Reconciled net rent income credited to your account ledger after platform processing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-white/15 text-xs font-semibold backdrop-blur-xs border border-white/20 flex items-center gap-1.5">
            <Landmark className="w-4 h-4 text-sky-200" />
            Direct Bank Route Linked
          </span>
        </div>
      </div>

      {/* Owner Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="My Properties"
          value={metrics.totalProperties}
          subtitle={`${metrics.occupiedProperties} Occupied`}
          icon={Building2}
          color="sky"
        />
        <StatCard
          title="Active Tenants"
          value={metrics.activeTenants}
          subtitle="Signed 11-month leases"
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Expected Rent"
          value={formatINR(metrics.expectedIncome)}
          subtitle={formatMonth(selectedMonth)}
          icon={CreditCard}
          color="blue"
        />
        <StatCard
          title="Collected Income"
          value={formatINR(metrics.collectedIncome)}
          subtitle={`${metrics.expectedIncome > 0 ? Math.round((metrics.collectedIncome / metrics.expectedIncome) * 100) : 0}% Realized`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Outstanding Rent"
          value={formatINR(metrics.outstandingRent)}
          subtitle="Awaiting tenant payment"
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Late Fines"
          value={formatINR(metrics.lateFines)}
          subtitle="Accrued delayed fees"
          icon={AlertCircle}
          color="rose"
        />
      </div>

      {/* Tables: Recent Collections & Payout History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Collections */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Tenant Rent Payments</h3>
          <div className="divide-y divide-slate-100">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No recent payments received.</p>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{tx.tenantId?.fullName}</span>
                    <span className="text-[11px] text-slate-400">
                      {tx.propertyId?.propertyName} • {formatDate(tx.paymentDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 block font-mono">{formatINR(tx.amount)}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{tx.paymentMethod}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Settlement History */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Bank Settlement Payout History</h3>
          <div className="divide-y divide-slate-100">
            {settlementHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No settlement payouts recorded yet.</p>
            ) : (
              settlementHistory.map((set) => (
                <div key={set._id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{set.settlementNumber}</span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(set.settledAt || set.createdAt)} • Ref: {set.bankReferenceNumber || 'In Process'}
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <span className="font-bold text-slate-900 block font-mono">{formatINR(set.amount)}</span>
                      <StatusBadge status={set.status} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
