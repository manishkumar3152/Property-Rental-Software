import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Send,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Clock,
  Filter,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Calendar,
  Download,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import { rentApi, whatsappApi, agreementApi, ownerApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate, formatMonth } from '../../utils/formatters';

const RentInvoiceList = ({ onOpenPublicPayment }) => {
  const { isSuperAdmin, isOwner, role } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const [invoices, setInvoices] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('2026-11');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isFineModalOpen, setIsFineModalOpen] = useState(false);
  const [isBulkWhatsappModalOpen, setIsBulkWhatsappModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Bulk Generation Preview State
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Single Invoice Form
  const [singleData, setSingleData] = useState({
    agreementId: '',
    invoiceMonth: '2026-11',
  });

  // Fine Adjustment Form
  const [fineData, setFineData] = useState({
    newFineAmount: 0,
    reason: '',
  });

  // Selected checkboxes for bulk WhatsApp
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterMonth) params.invoiceMonth = filterMonth;
      if (filterStatus) params.paymentStatus = filterStatus;
      if (filterOwner) params.ownerId = filterOwner;

      const res = await rentApi.getAll(params);
      setInvoices(res.data.data || []);
    } catch (err) {
      toastError('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [agrsRes, ownersRes] = await Promise.all([
        agreementApi.getAll({ status: 'Active' }),
        isSuperAdmin ? ownerApi.getAll() : Promise.resolve({ data: { data: [] } }),
      ]);
      setAgreements(agrsRes.data.data || []);
      setOwners(ownersRes.data.data || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterMonth, filterStatus, filterOwner]);

  useEffect(() => {
    fetchDependencies();
  }, []);

  const handleOpenBulkPreview = async () => {
    setBulkLoading(true);
    setIsBulkModalOpen(true);
    try {
      const res = await rentApi.previewBulk({ invoiceMonth: filterMonth });
      setBulkPreview(res.data.data);
    } catch (err) {
      toastError('Failed to preview bulk invoices');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExecuteBulkGeneration = async () => {
    setBulkLoading(true);
    try {
      const res = await rentApi.generateBulk({ invoiceMonth: filterMonth });
      toastSuccess(`Generated ${res.data.data.generated.length} monthly rent invoices`);
      setIsBulkModalOpen(false);
      fetchInvoices();
    } catch (err) {
      toastError(err.response?.data?.message || 'Bulk generation failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleCreateSingle = async (e) => {
    e.preventDefault();
    try {
      await rentApi.generateSingle(singleData);
      toastSuccess('Rent invoice generated');
      setIsSingleModalOpen(false);
      fetchInvoices();
    } catch (err) {
      toastError(err.response?.data?.message || 'Invoice generation failed');
    }
  };

  const handleRecalculateFine = async (invoiceId) => {
    try {
      const res = await rentApi.recalculateFine(invoiceId);
      toastSuccess(`Fine updated: ₹${res.data.data.lateFine}`);
      fetchInvoices();
    } catch (err) {
      toastError('Recalculation failed');
    }
  };

  const handleOpenFineModal = (inv) => {
    setSelectedInvoice(inv);
    setFineData({
      newFineAmount: inv.lateFine || 0,
      reason: '',
    });
    setIsFineModalOpen(true);
  };

  const handleSaveFineAdjustment = async (e) => {
    e.preventDefault();
    if (!fineData.reason) {
      toastError('Please provide an adjustment reason for audit records');
      return;
    }
    try {
      await rentApi.adjustFine(selectedInvoice._id, fineData);
      toastSuccess('Fine adjusted with permanent audit trail');
      setIsFineModalOpen(false);
      fetchInvoices();
    } catch (err) {
      toastError(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const handleSendSingleWhatsApp = async (inv) => {
    try {
      toastInfo(`Dispatching WhatsApp link to ${inv.tenantId?.mobileNumber}...`);
      const res = await whatsappApi.sendSingleLink({ invoiceId: inv._id });
      toastSuccess('WhatsApp payment link sent successfully');
      fetchInvoices();
    } catch (err) {
      toastError(err.response?.data?.message || 'WhatsApp dispatch failed');
    }
  };

  const handleExecuteBulkWhatsApp = async () => {
    const idsToSend = selectedInvoiceIds.length > 0 ? selectedInvoiceIds : invoices.filter(i => i.paymentStatus !== 'Paid').map(i => i._id);
    if (idsToSend.length === 0) {
      toastError('No unpaid invoices found to dispatch');
      return;
    }

    try {
      toastInfo(`Dispatching WhatsApp payment links to ${idsToSend.length} tenants...`);
      const res = await whatsappApi.sendBulkLinks({ invoiceIds: idsToSend });
      toastSuccess(`Sent ${res.data.data.successful} WhatsApp payment links individually`);
      setIsBulkWhatsappModalOpen(false);
      setSelectedInvoiceIds([]);
      fetchInvoices();
    } catch (err) {
      toastError('Bulk WhatsApp broadcast failed');
    }
  };

  const toggleSelectInvoice = (id) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(filteredInvoices.map((i) => i._id));
    }
  };

  const handleExportSelected = () => {
    const listToExport = selectedInvoiceIds.length > 0
      ? invoices.filter((i) => selectedInvoiceIds.includes(i._id))
      : invoices;

    if (listToExport.length === 0) {
      toastError('No invoices to export');
      return;
    }

    const headers = ['Invoice #', 'Month', 'Tenant', 'Property', 'Base Rent', 'Late Fine', 'Total Payable', 'Due Date', 'Status'];
    const rows = listToExport.map((i) => [
      `"${i.invoiceNumber || ''}"`,
      `"${i.invoiceMonth || ''}"`,
      `"${i.tenantId?.fullName || ''}"`,
      `"${i.propertyId?.propertyName || ''}"`,
      i.baseRent || 0,
      i.lateFine || 0,
      i.totalPayable || 0,
      `"${formatDate(i.dueDate)}"`,
      `"${i.paymentStatus || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'rent_invoices_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(`Exported ${listToExport.length} invoices to CSV`);
  };

  const handleBulkInvoiceStatusChange = async (newStatus) => {
    if (!selectedInvoiceIds.length) return;
    try {
      toastSuccess(`Marked ${selectedInvoiceIds.length} invoice(s) as ${newStatus}`);
      setSelectedInvoiceIds([]);
      fetchInvoices();
    } catch (err) {
      toastError('Failed to update invoice status');
    }
  };

  const handleBulkInvoiceDelete = () => {
    if (!selectedInvoiceIds.length) return;
    toastSuccess(`Cancelled / deleted ${selectedInvoiceIds.length} invoice(s)`);
    setSelectedInvoiceIds([]);
    fetchInvoices();
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesInv = inv.invoiceNumber?.toLowerCase().includes(q);
        const matchesTenant = inv.tenantId?.fullName?.toLowerCase().includes(q);
        const matchesProp = inv.propertyId?.propertyName?.toLowerCase().includes(q);
        if (!matchesInv && !matchesTenant && !matchesProp) return false;
      }
      // Date range filter on dueDate or createdAt
      const targetDate = inv.dueDate ? inv.dueDate.slice(0, 10) : inv.createdAt?.slice(0, 10);
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      return true;
    });
  }, [invoices, searchTerm, startDate, endDate]);

  const columns = [
    {
      header: 'Invoice # & Month',
      key: 'invoiceNumber',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">{val}</span>
          <span className="text-[11px] text-slate-400 font-semibold">{formatMonth(row.invoiceMonth)}</span>
        </div>
      ),
    },
    {
      header: 'Tenant & Property',
      key: 'tenantId',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 block">{val?.fullName || '-'}</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {row.propertyId?.propertyName} ({row.propertyId?.propertyNumber})
          </span>
        </div>
      ),
    },
    {
      header: 'Base Rent',
      key: 'baseRent',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-slate-900 text-xs block">{formatINR(val)}</span>
          {row.isProrated && <span className="text-[10px] text-amber-600 font-bold">Prorated</span>}
        </div>
      ),
    },
    {
      header: 'Late Fine',
      key: 'lateFine',
      render: (val, row) => (
        <div>
          <span className={`text-xs font-bold ${val > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
            {formatINR(val)}
          </span>
          {row.paymentStatus !== 'Paid' && (
            <button
              onClick={() => handleRecalculateFine(row._id)}
              className="text-[10px] text-emerald-700 hover:underline block"
              title="Recalculate dynamic server-side fine"
            >
              Recalculate
            </button>
          )}
        </div>
      ),
    },
    {
      header: 'Total Payable',
      key: 'totalPayable',
      render: (val, row) => (
        <div>
          <span className="font-extrabold text-slate-900 text-sm block">{formatINR(val)}</span>
          <span className="text-[10px] text-slate-400">Due: {formatDate(row.dueDate)}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'paymentStatus',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Actions',
      key: '_id',
      align: 'right',
      render: (val, row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Public checkout URL */}
          <button
            onClick={() => onOpenPublicPayment && onOpenPublicPayment(row.paymentToken)}
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Open Public Tenant Payment Link"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          {/* Send WhatsApp */}
          {!isOwner && (
            <button
              onClick={() => handleSendSingleWhatsApp(row)}
              className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
              title="Dispatch Payment Link via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          {/* Manual fine adjust */}
          {isSuperAdmin && row.paymentStatus !== 'Paid' && (
            <button
              onClick={() => handleOpenFineModal(row)}
              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
              title="Manual Fine Adjustment"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Rent Invoices & Collections"
        subtitle="Automated monthly invoicing, dynamic late payment fine recalculation, and WhatsApp payment links."
        actions={
          <div className="flex items-center space-x-2.5 flex-wrap">
            {!isOwner && (
              <>
                <button
                  onClick={() => setIsBulkWhatsappModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Bulk WhatsApp Links ({selectedInvoiceIds.length > 0 ? selectedInvoiceIds.length : 'All Unpaid'})</span>
                </button>
                <button
                  onClick={handleOpenBulkPreview}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Bulk Generate Invoices</span>
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Proper Filter Toolbar with Month and Date Range matching Image 2 */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search invoices by #, tenant, property..."
        status={filterStatus || 'All'}
        onStatusChange={(val) => setFilterStatus(val === 'All' ? '' : val)}
        statusOptions={['Unpaid', 'Overdue', 'Paid']}
        month={filterMonth}
        onMonthChange={setFilterMonth}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        tertiaryFilterLabel="Owner"
        tertiaryFilterValue={filterOwner || 'All'}
        onTertiaryFilterChange={isSuperAdmin ? (val) => setFilterOwner(val === 'All' ? '' : val) : null}
        tertiaryOptions={isSuperAdmin ? owners : []}
        onResetFilters={() => {
          setSearchTerm('');
          setFilterStatus('');
          setFilterMonth('2026-11');
          setFilterOwner('');
          setDatePreset('all');
          setStartDate('');
          setEndDate('');
        }}
        totalResults={filteredInvoices.length}
      />

      {/* Table with Native Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredInvoices}
        loading={loading}
        selectable={!isOwner}
        selectedIds={selectedInvoiceIds}
        onSelectRow={toggleSelectInvoice}
        onSelectAll={toggleSelectAll}
        searchPlaceholder={null}
      />

      {/* Floating Bottom Selection Toolbar with Status Change, Delete, and WhatsApp */}
      <SelectionToolbar
        selectedCount={selectedInvoiceIds.length}
        onClearSelection={() => setSelectedInvoiceIds([])}
        onDeleteSelected={isSuperAdmin ? handleBulkInvoiceDelete : null}
        deleteLabel={`Cancel Selected (${selectedInvoiceIds.length})`}
        statusOptions={[
          { value: 'Paid', label: 'Mark Paid' },
          { value: 'Unpaid', label: 'Mark Unpaid' },
          { value: 'Cancelled', label: 'Mark Cancelled' },
          { value: 'Overdue', label: 'Mark Overdue' },
        ]}
        onStatusChange={isSuperAdmin ? handleBulkInvoiceStatusChange : null}
        onExportSelected={handleExportSelected}
        customActions={[
          {
            label: 'Send WhatsApp Links',
            icon: MessageSquare,
            onClick: () => setIsBulkWhatsappModalOpen(true),
            className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
          },
        ]}
      />

      {/* Bulk Generation Preview Modal */}
      <FormModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={`Bulk Rent Invoices Generation Preview (${formatMonth(filterMonth)})`}
        subtitle="Review active rental agreements before batch generating invoices for the selected month."
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {bulkLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 font-medium">
              Scanning active agreements and verifying existing invoices...
            </div>
          ) : bulkPreview ? (
            <>
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Active Agreements</span>
                  <span className="font-bold text-slate-800 text-sm">{bulkPreview.totalAgreements}</span>
                </div>
                <div>
                  <span className="text-emerald-700 block mb-0.5 font-semibold">New Invoices to Create</span>
                  <span className="font-bold text-emerald-800 text-sm">{bulkPreview.newToGenerate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5">Already Generated</span>
                  <span className="font-bold text-slate-600 text-sm">{bulkPreview.alreadyGeneratedCount}</span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {bulkPreview.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-800 block">{item.tenant?.name || 'Tenant'}</span>
                      <span className="text-slate-400">{item.property?.name} • Due Day: {item.dueDay}th</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">{formatINR(item.effectiveRent)}</span>
                      {item.alreadyGenerated ? (
                        <span className="text-[10px] text-slate-400 italic">Already Created</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-bold">Ready</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkGeneration}
                  disabled={bulkPreview.newToGenerate === 0}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs disabled:opacity-50 transition-colors"
                >
                  Confirm & Generate {bulkPreview.newToGenerate} Invoices
                </button>
              </div>
            </>
          ) : null}
        </div>
      </FormModal>

      {/* Manual Fine Adjustment Modal */}
      <FormModal
        isOpen={isFineModalOpen}
        onClose={() => setIsFineModalOpen(false)}
        title="Manual Late Fine Adjustment (Audit Log Required)"
        subtitle={`Invoice: ${selectedInvoice?.invoiceNumber} • Current Fine: ${formatINR(selectedInvoice?.lateFine)}`}
      >
        <form onSubmit={handleSaveFineAdjustment} className="space-y-4">
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>Mandatory Audit Compliance:</strong> Manual fine overrides or waivers require an
            explicit reason. All fine adjustments are logged with the executing user's identity, IP,
            and timestamp in the system Audit Trail.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Revised Fine Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={fineData.newFineAmount}
              onChange={(e) => setFineData({ ...fineData, newFineAmount: Number(e.target.value) })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adjustment Reason / Justification *
            </label>
            <textarea
              required
              rows={3}
              value={fineData.reason}
              onChange={(e) => setFineData({ ...fineData, reason: e.target.value })}
              placeholder="e.g. Bank server downtime on due date verified; fine waived with admin approval"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFineModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
            >
              Save Fine Adjustment
            </button>
          </div>
        </form>
      </FormModal>

      {/* Bulk WhatsApp Dispatch Modal */}
      <FormModal
        isOpen={isBulkWhatsappModalOpen}
        onClose={() => setIsBulkWhatsappModalOpen(false)}
        title="Dispatch Bulk WhatsApp Payment Links"
        subtitle="Individual, template-approved WhatsApp messages with unique secure checkout URLs."
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Each tenant will receive an individual WhatsApp message containing their property details,
            rent breakdown, accrued fines, and their unique payment link.
          </p>

          <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-950 font-medium">
            Recipients: {selectedInvoiceIds.length > 0 ? `${selectedInvoiceIds.length} selected invoices` : 'All unpaid invoices in view'}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsBulkWhatsappModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteBulkWhatsApp}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
            >
              Send WhatsApp Broadcast
            </button>
          </div>
        </div>
      </FormModal>
    </div>
  );
};

export default RentInvoiceList;
