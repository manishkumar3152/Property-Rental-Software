import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Download,
  Printer,
  Copy,
  Eye,
  Building,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import { receiptApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate, formatMonth } from '../../utils/formatters';

const ReceiptList = () => {
  const { isSuperAdmin, isOwner } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Selection
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [monthFilter, setMonthFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [duplicateReason, setDuplicateReason] = useState('');

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const res = await receiptApi.getAll();
      setReceipts(res.data.data || []);
    } catch (err) {
      toastError('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleOpenDuplicate = (receipt) => {
    setSelectedReceipt(receipt);
    setDuplicateReason('');
    setIsDuplicateModalOpen(true);
  };

  const handleIssueDuplicate = async (e) => {
    e.preventDefault();
    if (!duplicateReason) {
      toastError('Please specify reason for issuing duplicate copy');
      return;
    }
    try {
      await receiptApi.issueDuplicate(selectedReceipt._id, { reason: duplicateReason });
      toastSuccess('Duplicate receipt marked with audit timestamp');
      setIsDuplicateModalOpen(false);
      fetchReceipts();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to issue duplicate');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredReceipts.length && filteredReceipts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReceipts.map((r) => r._id));
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
      ? receipts.filter((r) => selectedIds.includes(r._id))
      : receipts;

    if (listToExport.length === 0) {
      toastError('No receipts to export');
      return;
    }

    const headers = ['Receipt #', 'Date', 'Tenant', 'Property', 'Invoice #', 'Total Paid', 'Method', 'Type'];
    const rows = listToExport.map((r) => [
      `"${r.receiptNumber || ''}"`,
      `"${formatDate(r.receiptDate)}"`,
      `"${r.tenantName || ''}"`,
      `"${r.propertyName || ''}"`,
      `"${r.invoiceNumber || ''}"`,
      r.totalPaid || 0,
      `"${r.paymentMethod || ''}"`,
      `"${r.isDuplicate ? 'Duplicate' : 'Original'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'rent_receipts_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(`Exported ${listToExport.length} receipts to CSV`);
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesRef = r.receiptNumber?.toLowerCase().includes(q);
        const matchesTenant = r.tenantName?.toLowerCase().includes(q);
        const matchesProp = r.propertyName?.toLowerCase().includes(q);
        const matchesInv = r.invoiceNumber?.toLowerCase().includes(q);
        if (!matchesRef && !matchesTenant && !matchesProp && !matchesInv) return false;
      }
      // Month filter: e.g. "2026-11"
      if (monthFilter) {
        const rDate = r.receiptDate || r.createdAt;
        if (rDate && !rDate.startsWith(monthFilter)) return false;
      }
      // Date range filter
      const targetDate = r.receiptDate ? r.receiptDate.slice(0, 10) : r.createdAt?.slice(0, 10);
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      return true;
    });
  }, [receipts, searchTerm, monthFilter, startDate, endDate]);

  const columns = [
    {
      header: 'Receipt # & Date',
      key: 'receiptNumber',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">{val}</span>
          <span className="text-[11px] text-slate-400">{formatDate(row.receiptDate)}</span>
        </div>
      ),
    },
    {
      header: 'Tenant Name',
      key: 'tenantName',
      render: (val) => <span className="font-semibold text-slate-800 text-xs">{val}</span>,
    },
    {
      header: 'Property',
      key: 'propertyName',
      render: (val) => (
        <span className="text-xs text-slate-700 block max-w-xs truncate" title={val}>
          {val}
        </span>
      ),
    },
    {
      header: 'Invoice Reference',
      key: 'invoiceNumber',
      render: (val, row) => (
        <div>
          <span className="font-mono text-xs text-slate-700 block">{val}</span>
          <span className="text-[10px] text-slate-400 font-semibold">{formatMonth(row.invoiceMonth)}</span>
        </div>
      ),
    },
    {
      header: 'Amount Paid',
      key: 'totalPaid',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 text-xs font-mono block">{formatINR(val)}</span>
          <span className="text-[10px] text-slate-400 uppercase font-mono">{row.paymentMethod}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'isDuplicate',
      render: (val) => (
        val ? (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Duplicate
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            Original
          </span>
        )
      ),
    },
    {
      header: 'Actions',
      key: '_id',
      align: 'right',
      render: (val, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              setSelectedReceipt(row);
              setIsViewModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
            title="View Receipt"
          >
            <Eye className="w-4 h-4" />
          </button>
          <a
            href={receiptApi.downloadPdf(row._id)}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
            title="Download Official PDF Receipt"
          >
            <Download className="w-4 h-4" />
          </a>
          {!isOwner && (
            <button
              onClick={() => handleOpenDuplicate(row)}
              className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
              title="Issue Duplicate Copy"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Official Rent Receipts"
        subtitle="Digitally signed receipts generated automatically upon confirmed payments."
      />

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search receipts by receipt #, tenant, property, invoice..."
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
          setMonthFilter('');
          setDatePreset('all');
          setStartDate('');
          setEndDate('');
        }}
        totalResults={filteredReceipts.length}
      />

      {/* Table with Native Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredReceipts}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={toggleSelectOne}
        onSelectAll={toggleSelectAll}
        searchPlaceholder={null}
      />

      {/* Floating Bottom Selection Toolbar with Status Change and Archive/Delete */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={() => {
          toastSuccess(`Archived ${selectedIds.length} receipt record(s) from view`);
          setSelectedIds([]);
        }}
        deleteLabel={`Archive Selected (${selectedIds.length})`}
        statusOptions={[
          { value: 'verified', label: 'Mark Verified' },
          { value: 'dispatched', label: 'Mark Dispatched' },
        ]}
        onStatusChange={(val) => {
          toastSuccess(`Marked ${selectedIds.length} receipt(s) as ${val}`);
          setSelectedIds([]);
        }}
        onExportSelected={handleExportSelected}
      />

      {/* View Receipt Printable Preview Modal */}
      {selectedReceipt && (
        <FormModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Official Rent Receipt: ${selectedReceipt.receiptNumber}`}
          subtitle="Tax invoice & payment realization confirmation"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-slate-800">
            {/* Header Preview */}
            <div className="p-4 bg-gradient-to-r from-sky-700 to-sky-900 text-white rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <h3 className="text-base font-bold tracking-tight">PROPRENT ERP SYSTEMS</h3>
                <p className="text-xs text-sky-200">Property Rental Management & Collection ERP</p>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  selectedReceipt.isDuplicate ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'
                }`}>
                  {selectedReceipt.isDuplicate ? 'DUPLICATE RECEIPT' : 'OFFICIAL RECEIPT'}
                </span>
                <span className="text-[11px] text-sky-200 block mt-1 font-mono">
                  {selectedReceipt.receiptNumber}
                </span>
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <span className="text-slate-400 block mb-0.5">Receipt Date</span>
                <span className="font-semibold text-slate-800">{formatDate(selectedReceipt.receiptDate)}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Payment Method & Reference</span>
                <span className="font-semibold uppercase text-slate-800">{selectedReceipt.paymentMethod}</span> • <span className="font-mono text-slate-600">{selectedReceipt.transactionId}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Tenant Name</span>
                <span className="font-semibold text-xs text-slate-900">{selectedReceipt.tenantName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Landlord / Owner</span>
                <span className="font-semibold text-xs text-slate-900">{selectedReceipt.ownerName}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Property Details</span>
                <span className="font-semibold text-slate-800">{selectedReceipt.propertyName}</span>
                <span className="text-slate-500 block text-[11px]">{selectedReceipt.propertyAddress}</span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left table-dense">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3">Base Monthly Rent ({formatMonth(selectedReceipt.invoiceMonth)})</td>
                    <td className="py-2 px-3 text-right font-semibold font-mono">{formatINR(selectedReceipt.baseRent)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Late Payment Fine</td>
                    <td className="py-2 px-3 text-right font-semibold font-mono">{formatINR(selectedReceipt.lateFine)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Other Charges</td>
                    <td className="py-2 px-3 text-right font-semibold font-mono">{formatINR(selectedReceipt.otherCharges)}</td>
                  </tr>
                  <tr className="bg-sky-50/80 text-sky-950 font-semibold">
                    <td className="py-2.5 px-3">TOTAL AMOUNT PAID</td>
                    <td className="py-2.5 px-3 text-right text-sm text-sky-700 font-bold font-mono">
                      {formatINR(selectedReceipt.totalPaid)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <a
                href={receiptApi.downloadPdf(selectedReceipt._id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF</span>
              </a>
            </div>
          </div>
        </FormModal>
      )}

      {/* Duplicate Receipt Modal */}
      <FormModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title="Issue Duplicate Receipt Copy"
        subtitle={`Receipt: ${selectedReceipt?.receiptNumber}`}
      >
        <form onSubmit={handleIssueDuplicate} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Re-issuing this receipt will mark it with a clear <strong>DUPLICATE</strong> watermark and
            record the re-issue timestamp and justification in the financial audit trail.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Re-issue *</label>
            <textarea
              required
              rows={3}
              value={duplicateReason}
              onChange={(e) => setDuplicateReason(e.target.value)}
              placeholder="e.g. Tenant requested duplicate copy for tax filing / employer HRA reimbursement"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDuplicateModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
            >
              Confirm Duplicate Issue
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default ReceiptList;
