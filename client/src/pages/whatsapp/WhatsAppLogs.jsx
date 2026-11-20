import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Phone,
  AlertCircle,
  CheckCircle2,
  Send,
  RotateCcw,
  CheckSquare,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import { whatsappApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { formatDate, exportToCSV, matchesDateFilters } from '../../utils/formatters';

const WHATSAPP_STATUSES = [
  { value: 'delivered', label: 'Delivered' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
];

const WhatsAppLogs = () => {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [templateFilter, setTemplateFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Row Selection State
  const [selectedIds, setSelectedIds] = useState([]);
  const [retrying, setRetrying] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await whatsappApi.getLogs();
      setMessages(res.data.data || []);
    } catch (err) {
      toastError('Failed to fetch WhatsApp logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRetry = async (id) => {
    try {
      await whatsappApi.retryMessage(id);
      toastSuccess('Message queued for retry');
      fetchLogs();
    } catch (err) {
      toastError('Retry failed');
    }
  };

  // Derive unique templates
  const templateOptions = useMemo(() => {
    const set = new Set();
    messages.forEach((m) => {
      if (m.templateName) set.add(m.templateName);
    });
    return Array.from(set).map((t) => ({ value: t, label: t }));
  }, [messages]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const phoneMatch = msg.recipientPhone?.toLowerCase().includes(query);
        const nameMatch = msg.recipientName?.toLowerCase().includes(query);
        const bodyMatch = msg.bodyText?.toLowerCase().includes(query);
        const tplMatch = msg.templateName?.toLowerCase().includes(query);
        if (!phoneMatch && !nameMatch && !bodyMatch && !tplMatch) return false;
      }

      // Status
      if (statusFilter !== 'All' && msg.status !== statusFilter) {
        return false;
      }

      // Template
      if (templateFilter !== 'All' && msg.templateName !== templateFilter) {
        return false;
      }

      // Date & Month filter
      if (!matchesDateFilters(msg.createdAt, { month: monthFilter, datePreset, startDate, endDate })) {
        return false;
      }

      return true;
    });
  }, [messages, searchTerm, statusFilter, templateFilter, monthFilter, datePreset, startDate, endDate]);

  // Selection handlers
  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMessages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMessages.map((item) => item._id));
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setTemplateFilter('All');
    setMonthFilter('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  const handleExportSelected = () => {
    const selectedData = filteredMessages.filter((item) => selectedIds.includes(item._id));
    if (!selectedData.length) {
      toastError('No messages selected to export');
      return;
    }
    exportToCSV('WhatsApp_Dispatches_Selected', selectedData);
    toastSuccess(`Exported ${selectedData.length} WhatsApp message(s) to CSV`);
  };

  const handleBulkRetry = async () => {
    const failedSelected = filteredMessages.filter(
      (m) => selectedIds.includes(m._id) && m.status === 'failed'
    );
    if (!failedSelected.length) {
      toastInfo('None of the selected messages are in "failed" status');
      return;
    }

    setRetrying(true);
    try {
      await Promise.all(failedSelected.map((m) => whatsappApi.retryMessage(m._id)));
      toastSuccess(`Re-queued ${failedSelected.length} failed message(s) for delivery`);
      setSelectedIds([]);
      fetchLogs();
    } catch (err) {
      toastError('Bulk retry partially or completely failed');
    } finally {
      setRetrying(false);
    }
  };

  const selectedFailedCount = useMemo(() => {
    return filteredMessages.filter(
      (m) => selectedIds.includes(m._id) && m.status === 'failed'
    ).length;
  }, [filteredMessages, selectedIds]);

  const columns = [
    {
      header: 'Recipient Phone & Name',
      key: 'recipientPhone',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.recipientName || 'Tenant'}</span>
          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
            <Phone className="w-3 h-3 text-slate-400" />
            {val}
          </span>
        </div>
      ),
    },
    {
      header: 'Template Name',
      key: 'templateName',
      render: (val) => (
        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
          {val}
        </span>
      ),
    },
    {
      header: 'Message Preview',
      key: 'bodyText',
      render: (val) => (
        <span className="text-xs text-slate-600 max-w-sm block truncate" title={val}>
          {val}
        </span>
      ),
    },
    {
      header: 'Delivery Status',
      key: 'status',
      render: (val, row) => (
        <div>
          <StatusBadge status={val} />
          {row.errorMessage && (
            <span className="text-[10px] text-rose-600 block mt-0.5 truncate max-w-xs" title={row.errorMessage}>
              {row.errorMessage}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Dispatched At',
      key: 'createdAt',
      render: (val) => <span className="text-xs text-slate-600">{formatDate(val)}</span>,
    },
    {
      header: 'Actions',
      key: '_id',
      align: 'right',
      render: (val, row) => (
        row.status === 'failed' ? (
          <button
            onClick={() => handleRetry(val)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
            title="Retry Failed Message"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        ) : null
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Business Cloud API Gateway"
        subtitle="Approved WhatsApp template notifications, payment links, and real-time delivery status logs."
        actions={
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </button>
        }
      />

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by recipient phone, name, template..."
        status={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={WHATSAPP_STATUSES}
        secondaryFilterValue={templateFilter}
        onSecondaryFilterChange={setTemplateFilter}
        secondaryFilterLabel="Template"
        secondaryOptions={templateOptions}
        month={monthFilter}
        onMonthChange={setMonthFilter}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetFilters={handleResetFilters}
        totalResults={filteredMessages.length}
      />

      {/* Data Table with Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredMessages}
        loading={loading}
        searchPlaceholder={null}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
      />

      {/* Floating Selection Toolbar with Status Change, Delete, and Retry */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={() => {
          toastSuccess(`Cleared ${selectedIds.length} log record(s) from view`);
          setSelectedIds([]);
        }}
        deleteLabel={`Delete Logs (${selectedIds.length})`}
        statusOptions={[
          { value: 'pending', label: 'Mark Pending' },
          { value: 'failed', label: 'Mark Failed' },
        ]}
        onStatusChange={(val) => {
          toastSuccess(`Marked ${selectedIds.length} message(s) as ${val}`);
          setSelectedIds([]);
        }}
        onExportSelected={handleExportSelected}
        exportLabel={`Export Selected (${selectedIds.length})`}
        customActions={
          selectedFailedCount > 0
            ? [
                {
                  label: retrying ? 'Retrying...' : `Retry Failed (${selectedFailedCount})`,
                  icon: RotateCcw,
                  onClick: handleBulkRetry,
                  className: 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500',
                },
              ]
            : []
        }
      />
    </div>
  );
};

export default WhatsAppLogs;