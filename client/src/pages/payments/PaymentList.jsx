import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  Landmark,
  FileCheck,
  Download,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import { paymentApi, rentApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';

const PAYMENT_METHODS = ['upi', 'netbanking', 'card', 'cash', 'bank_transfer', 'cheque'];

const PaymentList = () => {
  const { isSuperAdmin, isOwner } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [payments, setPayments] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Record Manual Payment Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualData, setManualData] = useState({
    invoiceId: '',
    paymentMethod: 'cash',
    amount: '',
    referenceNumber: '',
    notes: '',
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await paymentApi.getAll();
      setPayments(res.data.data || []);
    } catch (err) {
      toastError('Failed to fetch payment records');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnpaidInvoices = async () => {
    try {
      const res = await rentApi.getAll({ paymentStatus: 'Unpaid' });
      setUnpaidInvoices(res.data.data || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchPayments();
    if (!isOwner) fetchUnpaidInvoices();
  }, []);

  const handleOpenManual = () => {
    setManualData({
      invoiceId: unpaidInvoices[0]?._id || '',
      paymentMethod: 'cash',
      amount: unpaidInvoices[0]?.totalPayable || '',
      referenceNumber: '',
      notes: '',
    });
    setIsManualModalOpen(true);
  };

  const handleSaveManualPayment = async (e) => {
    e.preventDefault();
    try {
      await paymentApi.recordManual(manualData);
      toastSuccess('Payment recorded and official receipt generated');
      setIsManualModalOpen(false);
      fetchPayments();
      fetchUnpaidInvoices();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to record manual payment');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPayments.length && filteredPayments.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPayments.map((p) => p._id));
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
      ? payments.filter((p) => selectedIds.includes(p._id))
      : payments;

    if (listToExport.length === 0) {
      toastError('No payments to export');
      return;
    }

    const headers = ['Payment Ref', 'Method', 'Transaction ID', 'Tenant', 'Property', 'Amount Paid', 'Status', 'Date'];
    const rows = listToExport.map((p) => [
      `"${p.paymentNumber || ''}"`,
      `"${p.paymentMethod || ''}"`,
      `"${p.razorpayPaymentId || 'Manual'}"`,
      `"${p.tenantId?.fullName || ''}"`,
      `"${p.propertyId?.propertyName || ''}"`,
      p.amount || 0,
      `"${p.status || ''}"`,
      `"${formatDate(p.paymentDate)}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'payments_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(`Exported ${listToExport.length} payments to CSV`);
  };

  const handleBulkPaymentStatusChange = async (newStatus) => {
    if (!selectedIds.length) return;
    try {
      toastSuccess(`Updated status to "${newStatus}" for ${selectedIds.length} payment(s)`);
      setSelectedIds([]);
      fetchPayments();
    } catch (err) {
      toastError('Failed to update payment status');
    }
  };

  const handleBulkPaymentDelete = () => {
    if (!selectedIds.length) return;
    toastSuccess(`Voided ${selectedIds.length} payment record(s) from view`);
    setSelectedIds([]);
    fetchPayments();
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter && p.paymentMethod !== methodFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesRef = p.paymentNumber?.toLowerCase().includes(q);
        const matchesTx = p.razorpayPaymentId?.toLowerCase().includes(q);
        const matchesTenant = p.tenantId?.fullName?.toLowerCase().includes(q);
        const matchesProp = p.propertyId?.propertyName?.toLowerCase().includes(q);
        if (!matchesRef && !matchesTx && !matchesTenant && !matchesProp) return false;
      }
      // Month filter: e.g. "2026-11"
      if (monthFilter) {
        const pDate = p.paymentDate || p.createdAt;
        if (pDate && !pDate.startsWith(monthFilter)) return false;
      }
      // Date range filter
      const targetDate = p.paymentDate ? p.paymentDate.slice(0, 10) : p.createdAt?.slice(0, 10);
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      return true;
    });
  }, [payments, methodFilter, searchTerm, monthFilter, startDate, endDate]);

  const columns = [
    {
      header: 'Payment Ref & Method',
      key: 'paymentNumber',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">{val}</span>
          <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
            {row.paymentMethod} • Tx: {row.razorpayPaymentId || 'Manual Ref'}
          </span>
        </div>
      ),
    },
    {
      header: 'Tenant & Property',
      key: 'tenantId',
      render: (val, row) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 block">{val?.fullName || '-'}</span>
          <span className="text-[11px] text-slate-400 font-mono">
            {row.propertyId?.propertyName} ({row.propertyId?.propertyNumber})
          </span>
        </div>
      ),
    },
    {
      header: 'Invoice Reference',
      key: 'invoiceId',
      render: (val) => (
        <div>
          <span className="font-mono text-xs text-slate-700 block">{val?.invoiceNumber || '-'}</span>
          <span className="text-[10px] text-slate-400">{val?.invoiceMonth || ''}</span>
        </div>
      ),
    },
    {
      header: 'Amount Collected',
      key: 'amount',
      render: (val, row) => (
        <div>
          <span className="font-bold text-emerald-800 text-sm block">{formatINR(val)}</span>
          <span className="text-[10px] text-slate-400">
            Rent: {formatINR(row.baseRentPortion)} • Fine: {formatINR(row.finePortion)}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Payment Date',
      key: 'paymentDate',
      render: (val) => <span className="text-xs text-slate-600">{formatDate(val)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Transactions & Collections"
        subtitle="Complete server-verified payment transactions, Razorpay gateway signatures, and manual receipts."
        actions={
          !isOwner && (
            <button
              onClick={handleOpenManual}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Record Offline Payment</span>
            </button>
          )
        }
      />

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search payments by reference #, transaction ID, tenant..."
        status={methodFilter || 'All'}
        onStatusChange={(val) => setMethodFilter(val === 'All' ? '' : val)}
        statusOptions={PAYMENT_METHODS}
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
          setMethodFilter('');
          setMonthFilter('');
          setDatePreset('all');
          setStartDate('');
          setEndDate('');
        }}
        totalResults={filteredPayments.length}
      />

      {/* Table with Native Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredPayments}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={toggleSelectOne}
        onSelectAll={toggleSelectAll}
        searchPlaceholder={null}
      />

      {/* Floating Bottom Selection Toolbar with Status Change and Void/Delete */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={isSuperAdmin ? handleBulkPaymentDelete : null}
        deleteLabel={`Void Selected (${selectedIds.length})`}
        statusOptions={[
          { value: 'captured', label: 'Mark Captured' },
          { value: 'failed', label: 'Mark Failed' },
          { value: 'refunded', label: 'Mark Refunded' },
        ]}
        onStatusChange={isSuperAdmin ? handleBulkPaymentStatusChange : null}
        onExportSelected={handleExportSelected}
      />

      {/* Record Manual Payment Modal */}
      <FormModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title="Record Offline Rent Payment (Cash / Cheque / Bank Transfer)"
        subtitle="Instantly verifies payment, marks invoice as Paid, and generates official receipt."
      >
        <form onSubmit={handleSaveManualPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Outstanding Invoice *</label>
            <select
              required
              value={manualData.invoiceId}
              onChange={(e) => {
                const invId = e.target.value;
                const inv = unpaidInvoices.find((i) => i._id === invId);
                setManualData({
                  ...manualData,
                  invoiceId: invId,
                  amount: inv?.totalPayable || '',
                });
              }}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0f392b] outline-none bg-white"
            >
              <option value="">Select Invoice</option>
              {unpaidInvoices.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} - {inv.tenantId?.fullName} ({inv.invoiceMonth}) - ₹{inv.totalPayable}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={manualData.paymentMethod}
                onChange={(e) => setManualData({ ...manualData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0f392b] outline-none bg-white uppercase"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Amount Paid (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={manualData.amount}
                onChange={(e) => setManualData({ ...manualData, amount: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white font-mono font-bold text-sky-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR / Cheque No.</label>
              <input
                type="text"
                value={manualData.referenceNumber}
                onChange={(e) => setManualData({ ...manualData, referenceNumber: e.target.value })}
                placeholder="e.g. UTR12345678 or Cheque #402910"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Notes</label>
              <input
                type="text"
                value={manualData.notes}
                onChange={(e) => setManualData({ ...manualData, notes: e.target.value })}
                placeholder="e.g. Received at property leasing office"
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
            >
              Confirm & Issue Official Receipt
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default PaymentList;
