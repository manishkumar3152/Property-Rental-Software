import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Filter,
  FileSpreadsheet,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import { reportApi, ownerApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate, exportToCSV, matchesDateFilters } from '../../utils/formatters';

const REPORT_TABS = [
  { id: 'owner_wise', label: '1. Owner Collection' },
  { id: 'property_wise', label: '2. Property Income' },
  { id: 'monthly_rent', label: '3. Monthly Trends' },
  { id: 'pending_rent', label: '4. Pending Rent' },
  { id: 'overdue_rent', label: '5. Overdue Rent' },
  { id: 'fine_collection', label: '6. Fine Collection' },
  { id: 'agreement_expiry', label: '7. Agreement Expiry' },
  { id: 'agreement_renewal', label: '8. Renewal History' },
  { id: 'razorpay_tx', label: '9. Razorpay Tx' },
  { id: 'settlements', label: '10. Settlements' },
  { id: 'occupancy', label: '11. Occupancy' },
];

const ReportsHub = () => {
  const { isSuperAdmin, isOwner } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('owner_wise');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('2026-11');
  const [filterOwner, setFilterOwner] = useState('All');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [owners, setOwners] = useState([]);

  // Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      ownerApi.getAll().then((res) => setOwners(res.data.data || []));
    }
  }, [isSuperAdmin]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterMonth && filterMonth !== 'All') params.month = filterMonth;
      if (filterOwner && filterOwner !== 'All') params.ownerId = filterOwner;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      let res;
      switch (activeTab) {
        case 'owner_wise':
          res = await reportApi.getOwnerWise(params);
          setData(res.data.data || []);
          break;
        case 'property_wise':
          res = await reportApi.getPropertyWise(params);
          setData(res.data.data || []);
          break;
        case 'monthly_rent':
          res = await reportApi.getMonthlyRent(params);
          setData(res.data.data || []);
          break;
        case 'pending_rent':
          res = await reportApi.getPending(params);
          setData(res.data.data || []);
          break;
        case 'overdue_rent':
          res = await reportApi.getOverdue(params);
          setData(res.data.data || []);
          break;
        case 'fine_collection':
          res = await reportApi.getFineCollection(params);
          setData(res.data.data || []);
          break;
        case 'agreement_expiry':
          res = await reportApi.getAgreementExpiry(params);
          setData(res.data.data || []);
          break;
        case 'agreement_renewal':
          res = await reportApi.getAgreementRenewal(params);
          setData(res.data.data || []);
          break;
        case 'razorpay_tx':
          res = await reportApi.getRazorpayTransactions(params);
          setData(res.data.data || []);
          break;
        case 'settlements':
          res = await reportApi.getOwnerSettlements(params);
          setData(res.data.data || []);
          break;
        case 'occupancy':
          res = await reportApi.getPropertyOccupancy(params);
          setData(res.data.data?.properties || []);
          break;
        default:
          setData([]);
      }
    } catch (err) {
      toastError('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedIds([]);
    fetchReport();
  }, [activeTab, filterMonth, filterOwner, startDate, endDate]);

  // Give each row a consistent `_id` for DataTable selection
  const preparedData = useMemo(() => {
    return data.map((item, idx) => ({
      ...item,
      _id: item._id || item.propertyId || item.agreementNumber || item.invoiceNumber || item.ownerCode || `rep_${idx}`,
    }));
  }, [data]);

  // Client-side text search over row fields
  const filteredData = useMemo(() => {
    if (!searchTerm) return preparedData;
    const q = searchTerm.toLowerCase();
    return preparedData.filter((row) => {
      return Object.values(row).some((val) => {
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(q);
        }
        if (typeof val === 'object' && val !== null) {
          return Object.values(val).some((subVal) =>
            typeof subVal === 'string' && subVal.toLowerCase().includes(q)
          );
        }
        return false;
      });
    });
  }, [preparedData, searchTerm]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedIds([]);
    setSearchTerm('');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterMonth('');
    setFilterOwner('All');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  // Selection handlers
  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((item) => item._id));
    }
  };

  const handleExportSelected = () => {
    const selectedRows = filteredData.filter((r) => selectedIds.includes(r._id));
    if (!selectedRows.length) {
      toastError('No rows selected to export');
      return;
    }
    exportToCSV(`Report_${activeTab}_Selected`, selectedRows);
    toastSuccess(`Exported ${selectedRows.length} selected row(s) to CSV`);
  };

  const handleExportAll = () => {
    if (!filteredData.length) {
      toastError('No data available to export');
      return;
    }
    exportToCSV(`Report_${activeTab}_${filterMonth || 'Full'}`, filteredData);
    toastSuccess('Full report exported to CSV');
  };

  const getColumns = () => {
    switch (activeTab) {
      case 'owner_wise':
        return [
          { header: 'Landlord Code & Name', key: 'ownerName', render: (val, r) => `${val} (${r.ownerCode || ''})` },
          { header: 'Billed Rent', key: 'totalInvoiced', render: (val) => formatINR(val) },
          { header: 'Collected Rent', key: 'totalCollected', render: (val) => <span className="font-bold text-emerald-800">{formatINR(val)}</span> },
          { header: 'Pending Rent', key: 'totalPending', render: (val) => formatINR(val) },
          { header: 'Fines Collected', key: 'totalFineCollected', render: (val) => formatINR(val) },
          { header: 'Realization %', key: 'collectionRate', render: (val) => `${val}%` },
        ];
      case 'property_wise':
        return [
          { header: 'Property Name', key: 'propertyName', render: (val, r) => `${val} (${r.propertyNumber || ''})` },
          { header: 'Type', key: 'propertyType' },
          { header: 'Owner', key: 'ownerName' },
          { header: 'Income Realized', key: 'totalIncome', render: (val) => <span className="font-bold text-emerald-800">{formatINR(val)}</span> },
          { header: 'Pending Balance', key: 'pendingRent', render: (val) => formatINR(val) },
          { header: 'Fines Realized', key: 'finesCollected', render: (val) => formatINR(val) },
        ];
      case 'monthly_rent':
        return [
          { header: 'Billing Month', key: '_id' },
          { header: 'Total Invoiced', key: 'totalInvoiced', render: (val) => formatINR(val) },
          { header: 'Total Collected', key: 'totalCollected', render: (val) => <span className="font-bold text-emerald-800">{formatINR(val)}</span> },
          { header: 'Overdue Balance', key: 'totalOverdue', render: (val) => formatINR(val) },
          { header: 'Fines Realized', key: 'finesCollected', render: (val) => formatINR(val) },
          { header: 'Invoices Count', key: 'totalInvoices' },
        ];
      case 'pending_rent':
      case 'overdue_rent':
        return [
          { header: 'Invoice #', key: 'invoiceNumber' },
          { header: 'Tenant', key: 'tenantId', render: (val) => val?.fullName || '-' },
          { header: 'Property', key: 'propertyId', render: (val) => val?.propertyName || '-' },
          { header: 'Due Date', key: 'dueDate', render: (val) => formatDate(val) },
          { header: 'Late Fine', key: 'lateFine', render: (val) => formatINR(val) },
          { header: 'Total Payable', key: 'totalPayable', render: (val) => <span className="font-bold text-rose-700">{formatINR(val)}</span> },
          { header: 'Status', key: 'paymentStatus', render: (val) => <StatusBadge status={val} /> },
        ];
      case 'fine_collection':
        return [
          { header: 'Invoice #', key: 'invoiceNumber' },
          { header: 'Month', key: 'invoiceMonth' },
          { header: 'Tenant', key: 'tenantId', render: (val) => val?.fullName || '-' },
          { header: 'Property', key: 'propertyId', render: (val) => val?.propertyName || '-' },
          { header: 'Base Rent', key: 'baseRent', render: (val) => formatINR(val) },
          { header: 'Late Fine Accrued', key: 'lateFine', render: (val) => <span className="font-bold text-rose-700">{formatINR(val)}</span> },
          { header: 'Status', key: 'paymentStatus', render: (val) => <StatusBadge status={val} /> },
        ];
      case 'agreement_expiry':
        return [
          { header: 'Agreement Ref', key: 'agreementNumber' },
          { header: 'Tenant', key: 'tenantId', render: (val) => val?.fullName || '-' },
          { header: 'Property', key: 'propertyId', render: (val) => val?.propertyName || '-' },
          { header: 'End Date', key: 'agreementEndDate', render: (val) => <span className="font-bold text-amber-700">{formatDate(val)}</span> },
          { header: 'Monthly Rent', key: 'monthlyRent', render: (val) => formatINR(val) },
          { header: 'Renewal Escalation', key: 'rentIncrementPercentage', render: (val) => `+${val}%` },
          { header: 'Status', key: 'status', render: (val) => <StatusBadge status={val} /> },
        ];
      case 'occupancy':
        return [
          { header: 'Property ID', key: 'propertyId' },
          { header: 'Property Name', key: 'propertyName', render: (val, r) => `${val} (${r.propertyNumber || ''})` },
          { header: 'Type', key: 'propertyType' },
          { header: 'Owner', key: 'ownerId', render: (val) => val?.name || '-' },
          { header: 'Status', key: 'availabilityStatus', render: (val) => <StatusBadge status={val} /> },
          { header: 'Current Tenant', key: 'currentTenantId', render: (val) => val?.fullName || 'Vacant' },
          { header: 'Monthly Rent', key: 'monthlyBaseRent', render: (val) => formatINR(val) },
        ];
      default:
        return [
          { header: 'ID', key: '_id' },
          { header: 'Created', key: 'createdAt', render: (val) => formatDate(val) },
        ];
    }
  };

  const landlordOptions = useMemo(() => {
    return owners.map((o) => ({
      value: o._id,
      label: `${o.name} (${o.ownerCode})`,
    }));
  }, [owners]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Financial & Operational Reports"
        subtitle="12 advanced real-time audit reports with customizable date ranges and one-click CSV export."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
              title="Refresh Report Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportAll}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Report (CSV)</span>
            </button>
          </div>
        }
      />

      {/* Tabs Selector Bar */}
      <div className="bg-white p-1.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-1 overflow-x-auto custom-scroll">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-sky-50 text-sky-700 font-semibold border-l-2 sm:border-l-0 sm:border-b-2 border-sky-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Filter report records by name, property, tenant..."
        month={filterMonth}
        onMonthChange={setFilterMonth}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        secondaryFilterValue={filterOwner}
        onSecondaryFilterChange={isSuperAdmin ? setFilterOwner : undefined}
        secondaryFilterLabel="Landlord"
        secondaryOptions={landlordOptions}
        onResetFilters={handleResetFilters}
        totalResults={filteredData.length}
      />

      {/* Report Data Table with Checkbox Selection */}
      <DataTable
        columns={getColumns()}
        data={filteredData}
        loading={loading}
        searchPlaceholder={null}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
      />

      {/* Floating Selection Toolbar with Status Change and Delete/Clear */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={() => {
          toastSuccess(`Removed ${selectedIds.length} row(s) from report selection`);
          setSelectedIds([]);
        }}
        deleteLabel={`Clear Selected (${selectedIds.length})`}
        statusOptions={[
          { value: 'reviewed', label: 'Mark Reviewed' },
          { value: 'audited', label: 'Mark Audited' },
        ]}
        onStatusChange={(val) => {
          toastSuccess(`Marked ${selectedIds.length} report row(s) as ${val}`);
          setSelectedIds([]);
        }}
        onExportSelected={handleExportSelected}
        exportLabel={`Export Selected Rows (${selectedIds.length})`}
      />
    </div>
  );
};

export default ReportsHub;