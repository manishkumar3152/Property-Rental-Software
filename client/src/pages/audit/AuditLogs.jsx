import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, RefreshCw, Filter, User, Terminal } from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import { auditLogApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { formatDate, exportToCSV, matchesDateFilters } from '../../utils/formatters';

const ENTITY_OPTIONS = [
  { value: 'Property', label: 'Property' },
  { value: 'Tenant', label: 'Tenant' },
  { value: 'Agreement', label: 'Agreement' },
  { value: 'Invoice', label: 'Invoice' },
  { value: 'Payment', label: 'Payment' },
  { value: 'Settlement', label: 'Settlement' },
  { value: 'Owner', label: 'Owner' },
  { value: 'User', label: 'User' },
  { value: 'Settings', label: 'Settings' },
];

const USER_ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager / Staff' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'system', label: 'System Automation' },
];

const AuditLogs = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Row Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditLogApi.getAll({ limit: 200 });
      setLogs(res.data.data || []);
    } catch (err) {
      toastError('Failed to fetch audit trail');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const actionMatch = item.action?.toLowerCase().includes(query);
        const userMatch = item.userName?.toLowerCase().includes(query);
        const detailsMatch = item.details?.toLowerCase().includes(query);
        const ipMatch = item.ipAddress?.toLowerCase().includes(query);
        const entityMatch = item.entityType?.toLowerCase().includes(query);
        if (!actionMatch && !userMatch && !detailsMatch && !ipMatch && !entityMatch) return false;
      }

      // Entity
      if (entityFilter !== 'All' && item.entityType?.toLowerCase() !== entityFilter.toLowerCase()) {
        return false;
      }

      // Role
      if (roleFilter !== 'All' && item.userRole?.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }

      // Date & Month filters
      if (!matchesDateFilters(item.createdAt, { month: monthFilter, datePreset, startDate, endDate })) {
        return false;
      }

      return true;
    });
  }, [logs, searchTerm, entityFilter, roleFilter, monthFilter, datePreset, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setEntityFilter('All');
    setRoleFilter('All');
    setMonthFilter('');
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
    if (selectedIds.length === filteredLogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map((item) => item._id));
    }
  };

  const handleExportSelected = () => {
    const selectedData = filteredLogs.filter((item) => selectedIds.includes(item._id));
    if (!selectedData.length) {
      toastError('No audit events selected to export');
      return;
    }
    exportToCSV('Selected_Audit_Trail', selectedData);
    toastSuccess(`Exported ${selectedData.length} audit event(s) to CSV`);
  };

  const columns = [
    {
      header: 'Timestamp',
      key: 'createdAt',
      render: (val) => <span className="text-xs text-slate-500 font-mono">{formatDate(val)}</span>,
    },
    {
      header: 'Action Executed',
      key: 'action',
      render: (val) => (
        <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {val}
        </span>
      ),
    },
    {
      header: 'Entity',
      key: 'entityType',
      render: (val) => (
        <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
          {val}
        </span>
      ),
    },
    {
      header: 'User & Role',
      key: 'userName',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs block">{val || 'System'}</span>
          <span className="text-[10px] text-slate-400 capitalize">{row.userRole || 'automation'}</span>
        </div>
      ),
    },
    {
      header: 'Audit Description',
      key: 'details',
      render: (val) => (
        <span className="text-xs text-slate-600 block max-w-md truncate" title={val}>
          {val}
        </span>
      ),
    },
    {
      header: 'IP Address',
      key: 'ipAddress',
      render: (val) => <span className="font-mono text-[11px] text-slate-400">{val || '127.0.0.1'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Financial Audit Trail"
        subtitle="Immutable records of administrative actions, fine modifications, ownership transfers, and financial transactions."
        actions={
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Audit Log</span>
          </button>
        }
      />

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search audit events by action, user, details, IP..."
        status={entityFilter}
        onStatusChange={setEntityFilter}
        statusOptions={ENTITY_OPTIONS}
        secondaryFilterValue={roleFilter}
        onSecondaryFilterChange={setRoleFilter}
        secondaryFilterLabel="Role"
        secondaryOptions={USER_ROLES}
        month={monthFilter}
        onMonthChange={setMonthFilter}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetFilters={handleResetFilters}
        totalResults={filteredLogs.length}
      />

      {/* Data Table with Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        loading={loading}
        searchPlaceholder={null}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
      />

      {/* Floating Selection Toolbar with Status Change and Archive/Delete */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={() => {
          toastSuccess(`Archived ${selectedIds.length} audit event(s) from view`);
          setSelectedIds([]);
        }}
        deleteLabel={`Archive Selected (${selectedIds.length})`}
        statusOptions={[
          { value: 'reviewed', label: 'Mark Reviewed' },
          { value: 'flagged', label: 'Flag for Investigation' },
        ]}
        onStatusChange={(val) => {
          toastSuccess(`Marked ${selectedIds.length} audit event(s) as ${val}`);
          setSelectedIds([]);
        }}
        onExportSelected={handleExportSelected}
        exportLabel={`Export Selected (${selectedIds.length})`}
      />
    </div>
  );
};

export default AuditLogs;