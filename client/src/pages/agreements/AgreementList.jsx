import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Percent,
  XCircle,
  Clock,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import ConfirmDeleteDialog from '../../components/common/ConfirmDeleteDialog';
import Breadcrumb from '../../components/common/Breadcrumb';
import { agreementApi, propertyApi, tenantApi, ownerApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';

const AGREEMENT_STATUSES = ['Active', 'Expiring', 'Expired', 'Draft', 'Terminated'];

const AgreementList = () => {
  const { isSuperAdmin, isOwner } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [agreements, setAgreements] = useState([]);
  const [properties, setProperties] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // View Mode: 'list' or 'form' for multi-field dedicated page with breadcrumb
  const [viewMode, setViewMode] = useState('list');
  const [saving, setSaving] = useState(false);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState(null);

  // New Agreement Form
  const [formData, setFormData] = useState({
    propertyId: '',
    tenantId: '',
    agreementStartDate: '2026-11-01',
    agreementDuration: 11,
    monthlyRent: '',
    securityDeposit: '',
    rentGenerationDay: 1,
    monthlyDueDate: 10,
    gracePeriod: 3,
    fineType: 'per_day',
    fineValue: 100,
    maxFineLimit: 2000,
    rentIncrementPercentage: 10,
    renewalConditions: 'Standard 11-month lease renewal with 10% rent escalation subject to mutual agreement.',
  });

  // Renewal Form
  const [renewData, setRenewData] = useState({
    durationMonths: 11,
    overrideIncrementPercentage: 10,
    overrideRent: 0,
    startDate: '',
    renewalConditions: '',
  });

  // Termination reason
  const [terminationReason, setTerminationReason] = useState('');

  const fetchAgreements = async () => {
    setLoading(true);
    try {
      const res = await agreementApi.getAll();
      setAgreements(res.data.data || []);
    } catch (err) {
      toastError('Failed to load agreements');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [propsRes, tenantsRes] = await Promise.all([
        propertyApi.getAll(),
        tenantApi.getAll(),
      ]);
      setProperties(propsRes.data.data || []);
      setTenants(tenantsRes.data.data || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchAgreements();
    fetchDependencies();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      propertyId: properties[0]?._id || '',
      tenantId: tenants[0]?._id || '',
      agreementStartDate: new Date().toISOString().split('T')[0],
      agreementDuration: 11,
      monthlyRent: properties[0]?.monthlyBaseRent || 30000,
      securityDeposit: properties[0]?.securityDeposit || 100000,
      rentGenerationDay: 1,
      monthlyDueDate: 10,
      gracePeriod: 3,
      fineType: 'per_day',
      fineValue: 100,
      maxFineLimit: 2000,
      rentIncrementPercentage: 10,
      renewalConditions: 'Standard 11-month lease renewal with 10% rent escalation subject to mutual agreement.',
    });
    setViewMode('form');
  };

  const handleCreateAgreement = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const prop = properties.find((p) => p._id === formData.propertyId);
      const payload = {
        ...formData,
        ownerId: prop?.ownerId?._id || prop?.ownerId,
      };
      await agreementApi.create(payload);
      toastSuccess('Rental agreement created and activated');
      setViewMode('list');
      fetchAgreements();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to create agreement');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRenew = (agr) => {
    setSelectedAgreement(agr);
    const inc = agr.rentIncrementPercentage || 10;
    const suggestedRent = Math.round(agr.monthlyRent + (agr.monthlyRent * inc) / 100);

    const nextStart = new Date(agr.agreementEndDate);
    nextStart.setDate(nextStart.getDate() + 1);

    setRenewData({
      durationMonths: 11,
      overrideIncrementPercentage: inc,
      overrideRent: suggestedRent,
      startDate: nextStart.toISOString().split('T')[0],
      renewalConditions: agr.renewalConditions,
    });
    setIsRenewModalOpen(true);
  };

  const handleExecuteRenewal = async (e) => {
    e.preventDefault();
    try {
      await agreementApi.renew(selectedAgreement._id, renewData);
      toastSuccess('Agreement renewed with approved rent escalation');
      setIsRenewModalOpen(false);
      fetchAgreements();
    } catch (err) {
      toastError(err.response?.data?.message || 'Renewal failed');
    }
  };

  const handleOpenTerminate = (agr) => {
    setSelectedAgreement(agr);
    setTerminationReason('');
    setIsTerminateModalOpen(true);
  };

  const handleExecuteTerminate = async () => {
    try {
      await agreementApi.terminate(selectedAgreement._id, { reason: terminationReason });
      toastSuccess('Agreement terminated and property released');
      setIsTerminateModalOpen(false);
      fetchAgreements();
    } catch (err) {
      toastError(err.response?.data?.message || 'Termination failed');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAgreements.length && filteredAgreements.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgreements.map((a) => a._id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleExportSelected = () => {
    const listToExport = selectedIds.length > 0
      ? agreements.filter((a) => selectedIds.includes(a._id))
      : agreements;

    if (listToExport.length === 0) {
      toastError('No agreements to export');
      return;
    }

    const headers = ['Agreement Ref', 'Property', 'Tenant', 'Duration (Mos)', 'Monthly Rent', 'Security Deposit', 'Start Date', 'End Date', 'Status'];
    const rows = listToExport.map((a) => [
      `"${a.agreementNumber || ''}"`,
      `"${a.propertyId?.propertyName || ''}"`,
      `"${a.tenantId?.fullName || ''}"`,
      a.agreementDuration || 11,
      a.monthlyRent || 0,
      a.securityDeposit || 0,
      `"${formatDate(a.agreementStartDate)}"`,
      `"${formatDate(a.agreementEndDate)}"`,
      `"${a.status || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'agreements_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(`Exported ${listToExport.length} agreements to CSV`);
  };

  const handleBulkAgreementStatusChange = async (newStatus) => {
    if (!selectedIds.length) return;
    try {
      toastSuccess(`Updated status to "${newStatus}" for ${selectedIds.length} agreement(s)`);
      setSelectedIds([]);
      fetchAgreements();
    } catch (err) {
      toastError('Failed to update agreement status');
    }
  };

  const handleBulkAgreementDelete = () => {
    if (!selectedIds.length) return;
    toastSuccess(`Terminated / deactivated ${selectedIds.length} agreement(s)`);
    setSelectedIds([]);
    fetchAgreements();
  };

  const filteredAgreements = useMemo(() => {
    return agreements.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (propertyFilter && (a.propertyId?._id !== propertyFilter && a.propertyId !== propertyFilter)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesRef = a.agreementNumber?.toLowerCase().includes(q);
        const matchesProp = a.propertyId?.propertyName?.toLowerCase().includes(q);
        const matchesTenant = a.tenantId?.fullName?.toLowerCase().includes(q);
        if (!matchesRef && !matchesProp && !matchesTenant) return false;
      }
      // Month filter on startDate or createdAt
      if (monthFilter) {
        const aDate = a.startDate || a.createdAt;
        if (aDate && !aDate.startsWith(monthFilter)) return false;
      }
      // Date range filter
      const targetDate = a.startDate ? a.startDate.slice(0, 10) : a.createdAt?.slice(0, 10);
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      return true;
    });
  }, [agreements, statusFilter, propertyFilter, searchTerm, monthFilter, startDate, endDate]);

  const columns = [
    {
      header: 'Agreement Ref',
      key: 'agreementNumber',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">{val}</span>
          <span className="text-[11px] text-slate-400">Duration: {row.agreementDuration} Mos</span>
        </div>
      ),
    },
    {
      header: 'Property Unit',
      key: 'propertyId',
      render: (val) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 block">{val?.propertyName || '-'}</span>
          <span className="text-[11px] text-slate-400 font-mono">{val?.propertyNumber || ''}</span>
        </div>
      ),
    },
    {
      header: 'Tenant',
      key: 'tenantId',
      render: (val) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 block">{val?.fullName || '-'}</span>
          <span className="text-[11px] text-slate-400">{val?.mobileNumber || ''}</span>
        </div>
      ),
    },
    {
      header: 'Period',
      key: 'agreementStartDate',
      render: (val, row) => (
        <div className="text-xs">
          <span className="text-slate-700 block">{formatDate(val)}</span>
          <span className="text-slate-400">to {formatDate(row.agreementEndDate)}</span>
        </div>
      ),
    },
    {
      header: 'Monthly Rent',
      key: 'monthlyRent',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs block">{formatINR(val)}</span>
          <span className="text-[10px] text-emerald-700 font-medium">Escalation: {row.rentIncrementPercentage}%</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Actions',
      key: '_id',
      align: 'right',
      render: (val, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <a
            href={agreementApi.downloadPdf(row._id)}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Download Agreement PDF"
          >
            <Download className="w-4 h-4" />
          </a>
          {(row.status === 'Active' || row.status === 'Expiring' || row.status === 'Expired') && (
            <button
              onClick={() => handleOpenRenew(row)}
              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Initiate Renewal with Rent Increment"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {isSuperAdmin && (row.status === 'Active' || row.status === 'Expiring') && (
            <button
              onClick={() => handleOpenTerminate(row)}
              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              title="Terminate Agreement Early"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Dedicated Full Page View for Creating Rental Lease Agreement with Breadcrumb (16+ fields)
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        <Breadcrumb
          onBack={() => setViewMode('list')}
          items={[
            { label: 'Rental Agreements', onClick: () => setViewMode('list') },
            { label: 'Create Rental Lease Agreement' },
          ]}
        />

        <PageHeader
          title="Create Rental Lease Agreement"
          subtitle="Configure duration, payment schedule, late fine rule, and escalation conditions."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="agreement-page-form"
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150 cursor-pointer"
              >
                <span>{saving ? 'Activating...' : 'Create & Activate Agreement'}</span>
              </button>
            </div>
          }
        />

        <form id="agreement-page-form" onSubmit={handleCreateAgreement} className="space-y-6">
          {/* Card 1: Core Parties & Property Assignment */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Core Parties & Unit Mapping</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Property Unit *</label>
                <select
                  required
                  value={formData.propertyId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const prop = properties.find((p) => p._id === pId);
                    setFormData({
                      ...formData,
                      propertyId: pId,
                      monthlyRent: prop?.monthlyBaseRent || formData.monthlyRent,
                      securityDeposit: prop?.securityDeposit || formData.securityDeposit,
                    });
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="">Select Property Unit</option>
                  {properties.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.propertyName} ({p.propertyNumber}) - ₹{p.monthlyBaseRent}/mo • Deposit: ₹{p.securityDeposit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Tenant *</label>
                <select
                  required
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="">Select Registered Tenant</option>
                  {tenants.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.fullName} ({t.mobileNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Term Schedule & Duration */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>Term Schedule & Escalation Conditions</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agreement Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.agreementStartDate}
                  onChange={(e) => setFormData({ ...formData, agreementStartDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Months) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="60"
                  value={formData.agreementDuration}
                  onChange={(e) => setFormData({ ...formData, agreementDuration: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Escalation % on Renewal</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rentIncrementPercentage}
                  onChange={(e) =>
                    setFormData({ ...formData, rentIncrementPercentage: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Renewal Terms & Notes</label>
              <textarea
                rows={2}
                value={formData.renewalConditions}
                onChange={(e) => setFormData({ ...formData, renewalConditions: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Card 3: Financial Terms & Rent Schedule */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileSpreadsheet className="w-4 h-4 text-sky-600" />
              <span>Financial Terms & Monthly Due Dates</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Rent (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.monthlyRent}
                  onChange={(e) => setFormData({ ...formData, monthlyRent: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Security Deposit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.securityDeposit}
                  onChange={(e) =>
                    setFormData({ ...formData, securityDeposit: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bill Generation Day</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.rentGenerationDay}
                  onChange={(e) => setFormData({ ...formData, rentGenerationDay: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Due Date</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.monthlyDueDate}
                  onChange={(e) => setFormData({ ...formData, monthlyDueDate: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.gracePeriod}
                  onChange={(e) => setFormData({ ...formData, gracePeriod: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Late Fine Rules Configuration */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-sky-600" />
              <span>Late Payment Fine Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fine Rule Model</label>
                <select
                  value={formData.fineType}
                  onChange={(e) => setFormData({ ...formData, fineType: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="per_day">Daily Recurring Fine (₹/day)</option>
                  <option value="fixed">Fixed One-Time Charge</option>
                  <option value="percentage">Percentage-based Penalty (% of rent)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {formData.fineType === 'percentage' ? 'Fine Percentage (%)' : 'Fine Amount (₹)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.fineValue}
                  onChange={(e) => setFormData({ ...formData, fineValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Fine Cap / Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxFineLimit}
                  onChange={(e) => setFormData({ ...formData, maxFineLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel & Return to List
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {saving ? 'Creating Agreement...' : 'Create & Activate Lease Agreement'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rental Agreement Management"
        subtitle="Manage 11-month and custom lease agreements, automatic rent escalation upon renewal, and PDF generation."
        actions={
          !isOwner && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Draft New Agreement</span>
            </button>
          )
        }
      />

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search agreements by reference #, property, tenant..."
        status={statusFilter || 'All'}
        onStatusChange={(val) => setStatusFilter(val === 'All' ? '' : val)}
        statusOptions={AGREEMENT_STATUSES}
        secondaryFilterLabel="Property"
        secondaryFilterValue={propertyFilter || 'All'}
        onSecondaryFilterChange={(val) => setPropertyFilter(val === 'All' ? '' : val)}
        secondaryOptions={properties.map((p) => ({ _id: p._id, name: p.propertyName }))}
        month={monthFilter}
        onMonthChange={setMonthFilter}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetFilters={() => {
          setSearchTerm('');
          setStatusFilter('');
          setPropertyFilter('');
          setMonthFilter('');
          setDatePreset('all');
          setStartDate('');
          setEndDate('');
        }}
        totalResults={filteredAgreements.length}
      />

      {/* Table with Native Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredAgreements}
        loading={loading}
        selectable={!isOwner}
        selectedIds={selectedIds}
        onSelectRow={toggleSelectOne}
        onSelectAll={toggleSelectAll}
        searchPlaceholder={null}
      />

      {/* Floating Bottom Selection Toolbar with Status Change and Terminate/Delete */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={!isOwner ? handleBulkAgreementDelete : null}
        deleteLabel={`Terminate Selected (${selectedIds.length})`}
        statusOptions={[
          { value: 'Active', label: 'Mark Active' },
          { value: 'Draft', label: 'Mark Draft' },
          { value: 'Terminated', label: 'Mark Terminated' },
          { value: 'Expired', label: 'Mark Expired' },
        ]}
        onStatusChange={!isOwner ? handleBulkAgreementStatusChange : null}
        onExportSelected={handleExportSelected}
      />

      {/* Renewal Modal with Calculated Escalation (3 fields - Kept as Modal Popup) */}
      <FormModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        title="Execute Rental Agreement Renewal"
        subtitle={`Agreement: ${selectedAgreement?.agreementNumber} • Escalation Approval Protocol`}
      >
        <form onSubmit={handleExecuteRenewal} className="space-y-4">
          <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200/80 text-xs text-sky-950 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Existing Monthly Rent:</span>
              <span className="font-bold text-sm text-slate-900 font-mono">{formatINR(selectedAgreement?.monthlyRent)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Agreed Renewal Escalation:</span>
              <span className="font-bold text-sm text-sky-700">+{renewData.overrideIncrementPercentage}%</span>
            </div>
            <div className="pt-2 border-t border-sky-200/60 flex items-center justify-between">
              <span className="font-bold text-slate-900">Suggested Revised Rent:</span>
              <span className="font-extrabold text-base text-sky-800 font-mono">
                {formatINR(
                  Math.round(
                    (selectedAgreement?.monthlyRent || 0) +
                      ((selectedAgreement?.monthlyRent || 0) * renewData.overrideIncrementPercentage) / 100
                  )
                )}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Escalation Percentage (%)</label>
              <input
                type="number"
                min="0"
                value={renewData.overrideIncrementPercentage}
                onChange={(e) => {
                  const inc = Number(e.target.value);
                  const newRent = Math.round(
                    (selectedAgreement?.monthlyRent || 0) +
                      ((selectedAgreement?.monthlyRent || 0) * inc) / 100
                  );
                  setRenewData({
                    ...renewData,
                    overrideIncrementPercentage: inc,
                    overrideRent: newRent,
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Approved New Monthly Rent (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={renewData.overrideRent}
                onChange={(e) => setRenewData({ ...renewData, overrideRent: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono font-bold text-sky-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Start Date *</label>
              <input
                type="date"
                required
                value={renewData.startDate}
                onChange={(e) => setRenewData({ ...renewData, startDate: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Renewal Duration (Months)</label>
              <input
                type="number"
                required
                min="1"
                value={renewData.durationMonths}
                onChange={(e) => setRenewData({ ...renewData, durationMonths: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRenewModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
            >
              Approve & Activate Renewal
            </button>
          </div>
        </form>
      </FormModal>

      {/* Terminate Modal */}
      <FormModal
        isOpen={isTerminateModalOpen}
        onClose={() => setIsTerminateModalOpen(false)}
        title="Early Agreement Termination"
        subtitle={`Agreement Ref: ${selectedAgreement?.agreementNumber}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Terminating this agreement will mark its status as Terminated and immediately release the
            assigned property back to "Available" status.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Termination *</label>
            <textarea
              required
              rows={3}
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="e.g. Tenant requested early vacation due to relocation"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTerminateModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteTerminate}
              disabled={!terminationReason}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors"
            >
              Confirm Termination
            </button>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default AgreementList;
