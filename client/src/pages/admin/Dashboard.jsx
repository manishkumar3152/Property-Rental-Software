import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  UserCheck,
  FileText,
  Clock,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  TrendingUp,
  Percent,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { rentApi, propertyApi, ownerApi, tenantApi, agreementApi, paymentApi, reportApi } from '../../api';
import { formatINR, formatDate, formatMonth } from '../../utils/formatters';

const COLORS = ['#0284c7', '#0369a1', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [stats, setStats] = useState({
    totalOwners: 0,
    totalProperties: 0,
    availableProperties: 0,
    occupiedProperties: 0,
    totalTenants: 0,
    activeAgreements: 0,
    expiringAgreements: 0,
    expectedRent: 0,
    collectedRent: 0,
    pendingRent: 0,
    overdueRent: 0,
    fineCollected: 0,
  });

  const [monthlyTrendData, setMonthlyTrendData] = useState([]);
  const [ownerIncomeData, setOwnerIncomeData] = useState([]);
  const [paidVsUnpaidData, setPaidVsUnpaidData] = useState([]);
  const [occupancyData, setOccupancyData] = useState([]);

  const [recentPayments, setRecentPayments] = useState([]);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [expiringAgreementsList, setExpiringAgreementsList] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [
        ownersRes,
        propertiesRes,
        tenantsRes,
        agreementsRes,
        invoicesRes,
        paymentsRes,
        monthlyRes,
        ownerReportRes,
      ] = await Promise.all([
        ownerApi.getAll(),
        propertyApi.getAll(),
        tenantApi.getAll(),
        agreementApi.getAll(),
        rentApi.getAll({ invoiceMonth: selectedMonth }),
        paymentApi.getAll({ limit: 6 }),
        reportApi.getMonthlyRent(),
        reportApi.getOwnerWise({ month: selectedMonth }),
      ]);

      const props = propertiesRes.data.data || [];
      const invSummary = invoicesRes.data.summary || {};
      const agrs = agreementsRes.data.data || [];

      const occupiedCount = props.filter((p) => p.availabilityStatus === 'Occupied').length;
      const availableCount = props.filter((p) => p.availabilityStatus === 'Available').length;
      const expiringCount = agrs.filter((a) => a.status === 'Expiring').length;
      const activeCount = agrs.filter((a) => a.status === 'Active').length;

      setStats({
        totalOwners: ownersRes.data.count || 0,
        totalProperties: props.length,
        availableProperties: availableCount,
        occupiedProperties: occupiedCount,
        totalTenants: tenantsRes.data.count || 0,
        activeAgreements: activeCount,
        expiringAgreements: expiringCount,
        expectedRent: invSummary.totalInvoiced || 0,
        collectedRent: invSummary.totalCollected || 0,
        pendingRent: invSummary.totalPending || 0,
        overdueRent: (invoicesRes.data.data || [])
          .filter((i) => i.paymentStatus === 'Overdue')
          .reduce((sum, i) => sum + i.balanceAmount, 0),
        fineCollected: invSummary.totalLateFines || 0,
      });

      // Chart 1: Monthly Rent Collections
      const trends = (monthlyRes.data.data || []).map((m) => ({
        month: m._id,
        Billed: m.totalInvoiced,
        Collected: m.totalCollected,
        Overdue: m.totalOverdue,
      }));
      setMonthlyTrendData(trends);

      // Chart 2: Owner Income
      const ownerChart = (ownerReportRes.data.data || []).map((o) => ({
        name: o.ownerName,
        Collected: o.totalCollected,
        Pending: o.totalPending,
      }));
      setOwnerIncomeData(ownerChart);

      // Chart 3: Paid vs Unpaid Pie
      const paidAmt = invSummary.totalCollected || 0;
      const pendingAmt = invSummary.totalPending || 0;
      setPaidVsUnpaidData([
        { name: 'Collected Rent', value: paidAmt },
        { name: 'Pending / Overdue', value: pendingAmt },
      ]);

      // Chart 4: Occupancy
      setOccupancyData([
        { name: 'Occupied', value: occupiedCount },
        { name: 'Available', value: availableCount },
        { name: 'Maintenance', value: props.filter((p) => p.availabilityStatus === 'Maintenance').length },
      ]);

      // Tables
      setRecentPayments(paymentsRes.data.data || []);
      setOverdueInvoices(
        (invoicesRes.data.data || []).filter((i) => i.paymentStatus === 'Overdue').slice(0, 5)
      );
      setExpiringAgreementsList(
        agrs.filter((a) => a.status === 'Expiring' || a.status === 'Active').slice(0, 5)
      );
    } catch (err) {
      console.error('[Dashboard Fetch Error]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedMonth]);

  if (loading) return <LoadingSpinner text="Aggregating enterprise metrics..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Super Admin Executive Dashboard"
        subtitle="Consolidated real-time operational metrics across all owners and properties."
        actions={
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="2026-11">November 2026 (Current)</option>
                <option value="2026-10">October 2026</option>
                <option value="2026-09">September 2026</option>
              </select>
            </div>
            <button
              onClick={fetchDashboardData}
              className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 shadow-2xs transition-colors"
              title="Refresh Metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Row 1: Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Owners"
          value={stats.totalOwners}
          subtitle="Registered landlords"
          icon={Users}
          color="sky"
        />
        <StatCard
          title="Total Properties"
          value={stats.totalProperties}
          subtitle={`${stats.occupiedProperties} Occupied / ${stats.availableProperties} Vacant`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Active Tenants"
          value={stats.totalTenants}
          subtitle="Mapped to properties"
          icon={UserCheck}
          color="indigo"
        />
        <StatCard
          title="Agreements"
          value={stats.activeAgreements}
          subtitle={`${stats.expiringAgreements} Expiring soon`}
          icon={FileText}
          color="slate"
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats.totalProperties > 0 ? Math.round((stats.occupiedProperties / stats.totalProperties) * 100) : 0}%`}
          subtitle="Portfolio utilization"
          icon={Percent}
          color="emerald"
        />
        <StatCard
          title="Fines Collected"
          value={formatINR(stats.fineCollected)}
          subtitle="Late payment fines"
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Row 2: Financial High-Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-sky-600 to-sky-700 text-white p-4.5 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-sky-100 uppercase tracking-wider block mb-1">
            Total Invoiced ({formatMonth(selectedMonth)})
          </span>
          <div className="text-2xl font-bold tracking-tight">{formatINR(stats.expectedRent)}</div>
          <span className="text-[11px] text-sky-200 mt-1.5 block">Gross rent & fees billed</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block mb-1">
            Rent Collected
          </span>
          <div className="text-2xl font-bold text-emerald-700 tracking-tight">{formatINR(stats.collectedRent)}</div>
          <span className="text-[11px] text-slate-500 mt-1.5 block">
            {stats.expectedRent > 0 ? `${Math.round((stats.collectedRent / stats.expectedRent) * 100)}% realization` : '0%'}
          </span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block mb-1">
            Pending Rent
          </span>
          <div className="text-2xl font-bold text-amber-700 tracking-tight">{formatINR(stats.pendingRent)}</div>
          <span className="text-[11px] text-slate-500 mt-1.5 block">Awaiting payment</span>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block mb-1">
            Overdue Rent
          </span>
          <div className="text-2xl font-bold text-rose-700 tracking-tight">{formatINR(stats.overdueRent)}</div>
          <span className="text-[11px] text-rose-500 font-medium mt-1.5 block">Due date past + fines accrued</span>
        </div>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly Collection Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Rent Collections</h3>
              <p className="text-xs text-slate-500">Historical comparison of invoiced vs collected rent</p>
            </div>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(value) => [formatINR(value), '']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Billed" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Collected" fill="#0284c7" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Paid vs Pending Pie */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Rent Realization</h3>
            <p className="text-xs text-slate-500">Current month collection ratio</p>
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paidVsUnpaidData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#0284c7" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip formatter={(v) => formatINR(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Owner Income Breakdown & Property Occupancy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Owner-wise Income Breakdown</h3>
            <p className="text-xs text-slate-500">Rental income realization per registered property owner</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ownerIncomeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={130} />
                <Tooltip formatter={(value) => [formatINR(value), '']} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Collected" fill="#0284c7" radius={[0, 3, 3, 0]} />
                <Bar dataKey="Pending" fill="#fbbf24" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Property Occupancy</h3>
            <p className="text-xs text-slate-500">Occupied vs available inventory</p>
          </div>
          <div className="h-56 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#0284c7" />
                  <Cell fill="#10b981" />
                  <Cell fill="#94a3b8" />
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 5: Actionable Operational Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Payments */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Recent Payments Received</h3>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {recentPayments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No recent payments recorded.</p>
            ) : (
              recentPayments.map((p) => (
                <div key={p._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{p.tenantId?.fullName || 'Tenant'}</span>
                    <span className="text-[11px] text-slate-400">
                      {p.propertyId?.propertyName} • {formatDate(p.paymentDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700 block font-mono">{formatINR(p.amount)}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{p.paymentMethod}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Overdue Invoices with Late Fines */}
        <div className="bg-white rounded-xl p-4.5 border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Critical Overdue Rent with Fines</h3>
          <div className="divide-y divide-slate-100 overflow-x-auto">
            {overdueInvoices.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No overdue rent invoices currently.</p>
            ) : (
              overdueInvoices.map((inv) => (
                <div key={inv._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{inv.tenantId?.fullName}</span>
                    <span className="text-[11px] text-slate-400">
                      Due {formatDate(inv.dueDate)} • {inv.invoiceNumber}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-600 block font-mono">{formatINR(inv.totalPayable)}</span>
                    <span className="text-[11px] text-amber-700 font-medium">Fine: +{formatINR(inv.lateFine)}</span>
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

export default AdminDashboard;
