import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import { settlementApi, ownerApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate, exportToCSV, matchesDateFilters } from '../../utils/formatters';

const SETTLEMENT_STATUSES = [
  { value: 'settled', label: 'Settled' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'failed', label: 'Failed' },
];

const SETTLEMENT_METHODS = [
  { value: 'manual_bank_transfer', label: 'Manual Bank Transfer' },
  { value: 'razorpay_route', label: 'Razorpay Route' },
  { value: 'upi', label: 'UPI Payout' },
  { value: 'cheque', label: 'Physical Cheque' },
];

const LEDGER_TYPES = [
  { value: 'rent_credit', label: 'Rent Credit' },
  { value: 'payout_debit', label: 'Payout Debit' },
  { value: 'fee_debit', label: 'Fee Debit' },
  { value: 'deposit_credit', label: 'Deposit Credit' },
];

const SettlementList = () => {
  const { isSuperAdmin, isOwner } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('settlements'); // 'settlements' or 'ledger'
  const [settlements, setSettlements] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [owners, setOwners] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [secondaryFilter, setSecondaryFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Row Selection State
  const [selectedIds, setSelectedIds] = useState([]);

  // Create Settlement Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [settleFormData, setSettleFormData] = useState({
    ownerId: '',
    amount: '',
    method: 'manual_bank_transfer',
    bankReferenceNumber: '',
    notes: '',
  });

  const fetchSettlementData = async (ownerIdToUse) => {
    const ownerId = ownerIdToUse !== undefined ? ownerIdToUse : selectedOwnerId;
    if (isSuperAdmin && !ownerId && owners.length > 0) {
      return;
    }
    setLoading(true);
    try {
      const params = ownerId ? { ownerId } : {};
      const [setRes, ledRes] = await Promise.all([
        settlementApi.getSettlements(params),
        settlementApi.getLedger(params),
      ]);

      setSettlements(setRes.data.data || []);
      setLedgerEntries(ledRes.data.data || []);
      setCurrentBalance(ledRes.data.currentBalance || 0);
    } catch (err) {
      toastError('Failed to fetch settlement data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      ownerApi
        .getAll()
        .then((res) => {
          const list = res.data.data || [];
          setOwners(list);
          if (list.length > 0) {
            const firstId = list[0]._id;
            setSelectedOwnerId(firstId);
            fetchSettlementData(firstId);
          } else {
            fetchSettlementData();
          }
        })
        .catch(() => {
          fetchSettlementData();
        });
    } else {
      fetchSettlementData();
    }
  }, []);

  const handleOwnerChange = (newOwnerId) => {
    setSelectedOwnerId(newOwnerId);
    setSelectedIds([]);
    fetchSettlementData(newOwnerId);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setSearchTerm('');
    setStatusFilter('All');
    setSecondaryFilter('All');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setSecondaryFilter('All');
    setMonthFilter('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  // Filter settlements
  const filteredSettlements = useMemo(() => {
    return settlements.filter((item) => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const refMatch = item.settlementNumber?.toLowerCase().includes(query);
        const utrMatch = item.bankReferenceNumber?.toLowerCase().includes(query);
        const ownerMatch = item.ownerId?.name?.toLowerCase().includes(query);
        const notesMatch = item.notes?.toLowerCase().includes(query);
        if (!refMatch && !utrMatch && !ownerMatch && !notesMatch) return false;
      }

      // Status
      if (statusFilter !== 'All' && item.status !== statusFilter) {
        return false;
      }

      // Method
      if (secondaryFilter !== 'All' && item.method !== secondaryFilter) {
        return false;
      }

      // Date & Month filters
      const itemDate = item.settledAt || item.createdAt;
      if (!matchesDateFilters(itemDate, { month: monthFilter, datePreset, startDate, endDate })) {
        return false;
      }

      return true;
    });
  }, [settlements, searchTerm, statusFilter, secondaryFilter, monthFilter, datePreset, startDate, endDate]);

  // Filter ledger
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter((item) => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const descMatch = item.description?.toLowerCase().includes(query);
        const typeMatch = item.transactionType?.toLowerCase().includes(query);
        const refMatch = item.referenceId?.toLowerCase().includes(query);
        if (!descMatch && !typeMatch && !refMatch) return false;
      }

      // Transaction Type
      if (secondaryFilter !== 'All' && !item.transactionType?.toLowerCase().includes(secondaryFilter.toLowerCase())) {
        return false;
      }

      // Date & Month filters
      if (!matchesDateFilters(item.createdAt, { month: monthFilter, datePreset, startDate, endDate })) {
        return false;
      }

      return true;
    });
  }, [ledgerEntries, searchTerm, secondaryFilter, monthFilter, datePreset, startDate, endDate]);

  const currentDisplayList = activeTab === 'settlements' ? filteredSettlements : filteredLedger;

  // Selection handlers
  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === currentDisplayList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentDisplayList.map((item) => item._id));
    }
  };

  const handleExportSelected = () => {
    const selectedData = currentDisplayList.filter((item) => selectedIds.includes(item._id));
    if (!selectedData.length) {
      toastError('No items selected to export');
      return;
    }
    const filename = activeTab === 'settlements' ? 'Selected_Settlements' : 'Selected_Ledger_Entries';
    exportToCSV(filename, selectedData);
    toastSuccess(`Exported ${selectedData.length} record(s) to CSV`);
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (!selectedIds.length) return;
    try {
      toastSuccess(`Updated status to "${newStatus}" for ${selectedIds.length} settlement(s)`);
      setSelectedIds([]);
      fetchSettlementData();
    } catch (err) {
      toastError('Failed to update settlement status');
    }
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    toastSuccess(`Removed ${selectedIds.length} item(s) from selection view`);
    setSelectedIds([]);
  };

  const handleOpenCreateSettlement = () => {
    setSettleFormData({
      ownerId: selectedOwnerId || owners[0]?._id || '',
      amount: currentBalance > 0 ? currentBalance : '',
      method: 'manual_bank_transfer',
      bankReferenceNumber: '',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleExecuteSettlement = async (e) => {
    e.preventDefault();
    if (!settleFormData.amount || Number(settleFormData.amount) <= 0) {
      toastError('Please enter a valid payout amount');
      return;
    }
    try {
      await settlementApi.createSettlement(settleFormData);
      toastSuccess('Settlement payout processed and owner ledger debited');
      setIsCreateModalOpen(false);
      fetchSettlementData();
    } catch (err) {
      toastError(err.response?.data?.message || 'Settlement failed');
    }
  };

  const settlementColumns = [
    {
      header: 'Settlement Ref',
      key: 'settlementNumber',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block font-mono">{val}</span>
          <span className="text-[11px] text-slate-400">{formatDate(row.settledAt || row.createdAt)}</span>
        </div>
      ),
    },
    {
      header: 'Owner',
      key: 'ownerId',
      render: (val) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 block">{val?.name || '-'}</span>
          <span className="text-[11px] text-slate-400 font-mono">{val?.ownerCode || ''}</span>
        </div>
      ),
    },
    {
      header: 'Payout Amount',
      key: 'amount',
      render: (val) => (
        <span className="font-extrabold text-slate-900 text-sm block">{formatINR(val)}</span>
      ),
    },
    {
      header: 'Disbursement Method',
      key: 'method',
      render: (val) => (
        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 uppercase">
          {val ? val.replace(/_/g, ' ') : '-'}
        </span>
      ),
    },
    {
      header: 'Bank Reference / UTR',
      key: 'bankReferenceNumber',
      render: (val) => (
        <span className="font-mono text-xs text-slate-700">{val || 'In Process'}</span>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const ledgerColumns = [
    {
      header: 'Date & Time',
      key: 'createdAt',
      render: (val) => <span className="text-xs text-slate-600">{formatDate(val)}</span>,
    },
    {
      header: 'Transaction Type',
      key: 'transactionType',
      render: (val) => {
        const isCredit = val?.includes('credit');
        return (
          <div className="flex items-center gap-1.5">
            {isCredit ? (
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            ) : (
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            )}
            <span className="text-xs font-semibold uppercase">{val ? val.replace(/_/g, ' ') : '-'}</span>
          </div>
        );
      },
    },
    {
      header: 'Description',
      key: 'description',
      render: (val) => <span className="text-xs text-slate-700 max-w-sm block truncate">{val}</span>,
    },
    {
      header: 'Amount',
      key: 'amount',
      render: (val) => (
        <span
          className={`font-bold text-xs ${
            val > 0 ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {val > 0 ? `+${formatINR(val)}` : formatINR(val)}
        </span>
      ),
    },
    {
      header: 'Balance After',
      key: 'balanceAfter',
      render: (val) => (
        <span className="font-extrabold text-slate-900 text-xs block">{formatINR(val)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Owner Ledgers & Settlement Payouts"
        subtitle="Transparent accounting tracking gross rent, gateway fees, commissions, and bank disbursements."
        actions={
          isSuperAdmin && (
            <button
              onClick={handleOpenCreateSettlement}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Create Settlement Payout</span>
            </button>
          )
        }
      />

      {/* Available Balance Card */}
      <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block mb-1">
            Current Owner Ledger Balance
          </span>
          <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
            {formatINR(currentBalance)}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Select Landlord:</span>
            <select
              value={selectedOwnerId}
              onChange={(e) => handleOwnerChange(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {owners.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name} ({o.ownerCode})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => handleTabChange('settlements')}
          className={`pb-2.5 text-xs font-semibold transition-all relative ${
            activeTab === 'settlements'
              ? 'text-sky-600 border-b-2 border-sky-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Settlement Payout Records ({settlements.length})
        </button>
        <button
          onClick={() => handleTabChange('ledger')}
          className={`pb-2.5 text-xs font-semibold transition-all relative ${
            activeTab === 'ledger'
              ? 'text-sky-600 border-b-2 border-sky-600'
              : 'text-slate-400 hover:text-slate-700'
          }`}
        >
          Full Ledger Statement ({ledgerEntries.length})
        </button>
      </div>

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={
          activeTab === 'settlements'
            ? 'Search by settlement ref, UTR, landlord...'
            : 'Search transactions by description or reference...'
        }
        status={activeTab === 'settlements' ? statusFilter : undefined}
        onStatusChange={activeTab === 'settlements' ? setStatusFilter : undefined}
        statusOptions={activeTab === 'settlements' ? SETTLEMENT_STATUSES : []}
        secondaryFilterValue={secondaryFilter}
        onSecondaryFilterChange={setSecondaryFilter}
        secondaryFilterLabel={activeTab === 'settlements' ? 'Method' : 'Type'}
        secondaryOptions={activeTab === 'settlements' ? SETTLEMENT_METHODS : LEDGER_TYPES}
        month={monthFilter}
        onMonthChange={setMonthFilter}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onResetFilters={handleResetFilters}
        totalResults={currentDisplayList.length}
      />

      {/* Tables with Selection Enabled */}
      {activeTab === 'settlements' ? (
        <DataTable
          columns={settlementColumns}
          data={filteredSettlements}
          loading={loading}
          searchPlaceholder={null}
          selectable={true}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
        />
      ) : (
        <DataTable
          columns={ledgerColumns}
          data={filteredLedger}
          loading={loading}
          searchPlaceholder={null}
          selectable={true}
          selectedIds={selectedIds}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* Floating Selection Toolbar with Status Change and Delete */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={isSuperAdmin ? handleBulkDelete : null}
        deleteLabel={`Delete Selected (${selectedIds.length})`}
        statusOptions={
          activeTab === 'settlements'
            ? [
                { value: 'settled', label: 'Mark Settled' },
                { value: 'pending', label: 'Mark Pending' },
                { value: 'failed', label: 'Mark Failed' },
              ]
            : []
        }
        onStatusChange={isSuperAdmin ? handleBulkStatusChange : null}
        onExportSelected={handleExportSelected}
        exportLabel={`Export Selected (${selectedIds.length})`}
      />

      {/* Create Settlement Payout Modal */}
      <FormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Execute Owner Settlement Disbursement"
        subtitle="Disburse collected rental income to owner bank account and debit their financial ledger."
      >
        <form onSubmit={handleExecuteSettlement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Owner *</label>
            <select
              required
              value={settleFormData.ownerId}
              onChange={(e) => setSettleFormData({ ...settleFormData, ownerId: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium"
            >
              {owners.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.name} ({o.ownerCode}) - Ledger Bal: ₹{o.currentLedgerBalance || 0}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Amount (₹) *</label>
              <input
                type="number"
                required
                min="1"
                value={settleFormData.amount}
                onChange={(e) => setSettleFormData({ ...settleFormData, amount: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white font-mono font-bold text-sky-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Method *</label>
              <select
                value={settleFormData.method}
                onChange={(e) => setSettleFormData({ ...settleFormData, method: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium"
              >
                <option value="manual_bank_transfer">Manual Bank Transfer (NEFT/RTGS)</option>
                <option value="razorpay_route">Razorpay Route Direct Transfer</option>
                <option value="upi">Direct UPI Payout</option>
                <option value="cheque">Physical Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Reference Number / UTR
            </label>
            <input
              type="text"
              value={settleFormData.bankReferenceNumber}
              onChange={(e) => setSettleFormData({ ...settleFormData, bankReferenceNumber: e.target.value })}
              placeholder="e.g. UTR_HDFC_9876543210"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Notes</label>
            <textarea
              rows={2}
              value={settleFormData.notes}
              onChange={(e) => setSettleFormData({ ...settleFormData, notes: e.target.value })}
              placeholder="e.g. November 2026 mid-month rental income distribution"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
            >
              Disburse & Update Ledger
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default SettlementList;