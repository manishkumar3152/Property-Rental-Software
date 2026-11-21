import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Landmark,
  CreditCard,
  Edit2,
  Phone,
  Mail,
  ShieldCheck,
  Building,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import ConfirmDeleteDialog from '../../components/common/ConfirmDeleteDialog';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ownerApi, settlementApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useRouter } from '../../context/RouterContext';
import { formatINR, formatDate } from '../../utils/formatters';

const LINKED_ACCOUNT_STATUSES = ['unlinked', 'pending', 'active', 'suspended'];

const OwnerList = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const { route, navigate } = useRouter();

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const BULK_STATUS_OPTIONS = [
    { value: 'active', label: 'Mark Status: Active' },
    { value: 'inactive', label: 'Mark Status: Inactive' },
    { value: 'route_active', label: 'Route: Set Active' },
    { value: 'route_pending', label: 'Route: Set Pending' },
    { value: 'route_suspended', label: 'Route: Set Suspended' },
  ];

  // View Mode: 'list' for table or 'form' for multi-field dedicated page with breadcrumb
  const [viewMode, setViewMode] = useState('list');
  const [saving, setSaving] = useState(false);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);

  // Owner Form
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    whatsappNumber: '',
    email: '',
    panNumber: '',
    commissionRate: 0,
    address: {
      street: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001',
    },
    bankDetails: {
      accountHolder: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branch: '',
      isVerified: true,
    },
  });

  // Razorpay Route Form
  const [routeData, setRouteData] = useState({
    razorpayLinkedAccountId: '',
    linkedAccountStatus: 'pending',
  });

  const fetchOwners = async () => {
    setLoading(true);
    try {
      const res = await ownerApi.getAll();
      setOwners(res.data.data || []);
    } catch (err) {
      toastError('Failed to fetch property owners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  // Synchronize route action with view states
  useEffect(() => {
    if (route.section === 'owners') {
      if (route.action === 'add') {
        setSelectedOwner(null);
        setFormData({
          name: '',
          mobile: '',
          whatsappNumber: '',
          email: '',
          panNumber: '',
          commissionRate: 0,
          address: {
            street: '',
            city: 'Bengaluru',
            state: 'Karnataka',
            pinCode: '560001',
          },
          bankDetails: {
            accountHolder: '',
            accountNumber: '',
            ifscCode: '',
            bankName: '',
            branch: '',
            isVerified: false,
          },
        });
        setViewMode('form');
      } else if (route.action === 'edit') {
        setViewMode('form');
      } else {
        setViewMode('list');
      }
    }
  }, [route.action, route.section]);

  const handleOpenAdd = (owner = null) => {
    if (owner) {
      setSelectedOwner(owner);
      setFormData({
        name: owner.name,
        mobile: owner.mobile,
        whatsappNumber: owner.whatsappNumber || owner.mobile,
        email: owner.email,
        panNumber: owner.panNumber || '',
        commissionRate: owner.commissionRate || 0,
        address: {
          street: owner.address?.street || '',
          city: owner.address?.city || 'Bengaluru',
          state: owner.address?.state || 'Karnataka',
          pinCode: owner.address?.pinCode || '',
        },
        bankDetails: {
          accountHolder: owner.bankDetails?.accountHolder || owner.name,
          accountNumber: owner.bankDetails?.accountNumber || '',
          ifscCode: owner.bankDetails?.ifscCode || '',
          bankName: owner.bankDetails?.bankName || '',
          branch: owner.bankDetails?.branch || '',
          isVerified: owner.bankDetails?.isVerified || false,
        },
      });
      navigate('/owners/edit');
    } else {
      setSelectedOwner(null);
      setFormData({
        name: '',
        mobile: '',
        whatsappNumber: '',
        email: '',
        panNumber: '',
        commissionRate: 0,
        address: {
          street: '',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560001',
        },
        bankDetails: {
          accountHolder: '',
          accountNumber: '',
          ifscCode: '',
          bankName: '',
          branch: '',
          isVerified: false,
        },
      });
      navigate('/owners/add');
    }
  };

  const handleSaveOwner = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedOwner) {
        await ownerApi.update(selectedOwner._id, formData);
        toastSuccess('Owner updated successfully');
      } else {
        await ownerApi.create(formData);
        toastSuccess('New owner onboarded successfully');
      }
      navigate('/owners');
      fetchOwners();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to save owner');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRoute = (owner) => {
    setSelectedOwner(owner);
    setRouteData({
      razorpayLinkedAccountId: owner.razorpayLinkedAccountId || '',
      linkedAccountStatus: owner.linkedAccountStatus || 'unlinked',
    });
    setIsRouteModalOpen(true);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    try {
      await ownerApi.updateRouteAccount(selectedOwner._id, routeData);
      toastSuccess('Razorpay Route linked account configured');
      setIsRouteModalOpen(false);
      fetchOwners();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update Route account');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredOwners.length && filteredOwners.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOwners.map((o) => o._id));
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
      ? owners.filter((o) => selectedIds.includes(o._id))
      : owners;

    if (listToExport.length === 0) {
      toastError('No owners to export');
      return;
    }

    const headers = ['Owner Code', 'Name', 'Mobile', 'Email', 'Bank Name', 'A/C Number', 'IFSC', 'Route Status', 'Ledger Balance'];
    const rows = listToExport.map((o) => [
      `"${o.ownerCode || ''}"`,
      `"${o.name || ''}"`,
      `"${o.mobile || ''}"`,
      `"${o.email || ''}"`,
      `"${o.bankDetails?.bankName || ''}"`,
      `"${o.bankDetails?.accountNumber || ''}"`,
      `"${o.bankDetails?.ifscCode || ''}"`,
      `"${o.linkedAccountStatus || 'unlinked'}"`,
      o.currentLedgerBalance || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'owners_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(`Exported ${listToExport.length} owners to CSV`);
  };

  const handleBulkStatusChange = async (val) => {
    if (!selectedIds.length) return;
    try {
      if (val.startsWith('route_')) {
        const routeStatus = val.replace('route_', '');
        await Promise.all(
          selectedIds.map((id) => {
            const owner = owners.find((o) => o._id === id);
            return ownerApi.updateRouteAccount(id, {
              razorpayLinkedAccountId: owner?.razorpayLinkedAccountId || '',
              linkedAccountStatus: routeStatus,
            });
          })
        );
        toastSuccess(`Updated Route status to "${routeStatus}" for ${selectedIds.length} owner(s)`);
      } else {
        await Promise.all(
          selectedIds.map((id) => ownerApi.update(id, { status: val }))
        );
        toastSuccess(`Updated status to "${val}" for ${selectedIds.length} owner(s)`);
      }
      setSelectedIds([]);
      fetchOwners();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update owner status');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => ownerApi.delete(id)));
      toastSuccess(`Processed deletion / deactivation for ${selectedIds.length} owner(s)`);
      setIsBulkDeleteModalOpen(false);
      setSelectedIds([]);
      fetchOwners();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to delete selected owners');
    } finally {
      setBulkDeleting(false);
    }
  };

  const filteredOwners = useMemo(() => {
    return owners.filter((o) => {
      if (statusFilter && o.linkedAccountStatus !== statusFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = o.name?.toLowerCase().includes(q);
        const matchesCode = o.ownerCode?.toLowerCase().includes(q);
        const matchesPhone = o.mobile?.includes(q);
        const matchesEmail = o.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesEmail) return false;
      }
      // Month filter on createdAt
      if (monthFilter && o.createdAt && !o.createdAt.startsWith(monthFilter)) return false;
      // Date range filter on createdAt
      const targetDate = o.createdAt?.slice(0, 10);
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      return true;
    });
  }, [owners, statusFilter, searchTerm, monthFilter, startDate, endDate]);

  const columns = [
    {
      header: 'Owner Code & Name',
      key: 'name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block">{val}</span>
          <span className="text-xs text-slate-400 font-mono">
            {row.ownerCode} • PAN: {row.panNumber || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'mobile',
      render: (val, row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{val}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Bank Settlement Account',
      key: 'bankDetails',
      render: (val) => (
        <div>
          <span className="font-bold text-xs text-slate-800 block">
            {val?.bankName || 'No bank assigned'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            A/C: {val?.accountNumber ? `••••${val.accountNumber.slice(-4)}` : '-'} • {val?.ifscCode || ''}
          </span>
        </div>
      ),
    },
    {
      header: 'Razorpay Route',
      key: 'linkedAccountStatus',
      render: (val, row) => (
        <div>
          <StatusBadge status={val} />
          {row.razorpayLinkedAccountId && (
            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
              {row.razorpayLinkedAccountId}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Properties / Tenants',
      key: 'propertyCount',
      render: (val, row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 block">{val} Properties</span>
          <span className="text-slate-500">{row.tenantCount || 0} Active Tenants</span>
        </div>
      ),
    },
    {
      header: 'Ledger Balance',
      key: 'currentLedgerBalance',
      render: (val) => (
        <span className="font-bold text-emerald-800 text-sm block">{formatINR(val)}</span>
      ),
    },
    {
      header: 'Actions',
      key: '_id',
      align: 'right',
      render: (val, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenRoute(row)}
            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            title="Configure Razorpay Route Linked Account"
          >
            <Landmark className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenAdd(row)}
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Edit Owner Profile"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Dedicated Full Page View for Onboarding / Editing Owner with Breadcrumb (15+ fields)
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        <Breadcrumb
          onBack={() => navigate('/owners')}
          items={[
            { label: 'Property Owners', onClick: () => navigate('/owners') },
            { label: selectedOwner ? `Edit Profile: ${selectedOwner.name}` : 'Onboard New Owner' },
          ]}
        />

        <PageHeader
          title={selectedOwner ? 'Edit Owner Profile' : 'Onboard Property Owner'}
          subtitle="Configure owner KYC, communication numbers, and bank account for automated payouts."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/owners')}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="owner-page-form"
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150 cursor-pointer"
              >
                <span>{saving ? 'Saving Profile...' : selectedOwner ? 'Update Owner Profile' : 'Complete Onboarding'}</span>
              </button>
            </div>
          }
        />

        <form id="owner-page-form" onSubmit={handleSaveOwner} className="space-y-6">
          {/* Card 1: Identity & KYC Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-4 h-4 text-sky-600" />
              <span>Owner Identification & Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rajesh.sharma@example.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="+91 98450 11223"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+91 98450 11223"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                  placeholder="ABCPS1234A"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Management Commission Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Permanent Postal Address */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building className="w-4 h-4 text-sky-600" />
              <span>Permanent Postal Address</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  placeholder="e.g. #42, 12th Main Road, HAL 2nd Stage"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  placeholder="Bengaluru"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State / PIN Code</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                    placeholder="Karnataka"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                  />
                  <input
                    type="text"
                    value={formData.address.pinCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, pinCode: e.target.value },
                      })
                    }
                    placeholder="560001"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Bank Settlement Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Landmark className="w-4 h-4 text-sky-600" />
              <span>Bank Settlement Account Details (Payout Ledger)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.accountHolder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, accountHolder: e.target.value },
                    })
                  }
                  placeholder="Rajesh Sharma"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.bankName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, bankName: e.target.value },
                    })
                  }
                  placeholder="e.g. HDFC Bank"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, accountNumber: e.target.value },
                    })
                  }
                  placeholder="50100234567890"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="HDFC0001234"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.branch}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, branch: e.target.value },
                    })
                  }
                  placeholder="Indiranagar Branch"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.bankDetails.isVerified}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, isVerified: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                  />
                  <span>Mark Bank Account as Verified / Penny-Tested</span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/owners')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel & Return to List
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : selectedOwner ? 'Save Changes' : 'Onboard Property Owner'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Owner Management"
        subtitle="Manage landlord accounts, secure banking credentials, and Razorpay Route linked-account settlements."
        actions={
          <button
            onClick={() => handleOpenAdd()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Owner</span>
          </button>
        }
      />

      {/* Info Card on Route Settlement */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs text-xs text-slate-600 flex items-start gap-3">
        <Landmark className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Owner Ledger & Settlement Policy:</strong> Each registered owner maintains an
          independent financial ledger. If Razorpay Route is active, transfers are dispatched to the
          linked account ID. Otherwise, the software provides a full manual settlement reconciliation
          workflow without falsely marking a bank transfer as completed.
        </p>
      </div>

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search owners by name, code, phone, email..."
        status={statusFilter || 'All'}
        onStatusChange={(val) => setStatusFilter(val === 'All' ? '' : val)}
        statusOptions={LINKED_ACCOUNT_STATUSES}
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
          setMonthFilter('');
          setDatePreset('all');
          setStartDate('');
          setEndDate('');
        }}
        totalResults={filteredOwners.length}
      />

      {/* Owners Table with Native Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredOwners}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={toggleSelectOne}
        onSelectAll={toggleSelectAll}
        searchPlaceholder={null}
      />

      {/* Floating Bottom Selection Toolbar with Status Change and Delete */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={() => setIsBulkDeleteModalOpen(true)}
        deleteLabel={`Delete Selected (${selectedIds.length})`}
        statusOptions={BULK_STATUS_OPTIONS}
        onStatusChange={handleBulkStatusChange}
        onExportSelected={handleExportSelected}
      />

      {/* Bulk Delete / Deactivate Safeguard Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
        title={`Delete / Deactivate ${selectedIds.length} Owner(s)`}
        message={`Are you sure you want to delete or deactivate ${selectedIds.length} selected owner profile(s)?`}
        targetName={`${selectedIds.length} Selected Owner Profile(s)`}
        financialSafeguardNotice="ERP Safeguard: Landlords with active properties, occupied rental units, or non-zero ledger balances will be safely set to 'Inactive' rather than hard-deleted to guarantee complete tax, billing, and audit history preservation."
      />

      {/* Razorpay Route Modal (2 fields - Kept as Modal Popup) */}
      <FormModal
        isOpen={isRouteModalOpen}
        onClose={() => setIsRouteModalOpen(false)}
        title="Configure Razorpay Route Linked Account"
        subtitle={`Owner: ${selectedOwner?.name} (${selectedOwner?.ownerCode})`}
      >
        <form onSubmit={handleSaveRoute} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Razorpay Route allows direct automated split-payouts to the owner bank account upon rent
            collection. Enter the verified Razorpay Linked Account ID from your Razorpay Dashboard.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Razorpay Linked Account ID *
            </label>
            <input
              type="text"
              required
              value={routeData.razorpayLinkedAccountId}
              onChange={(e) =>
                setRouteData({ ...routeData, razorpayLinkedAccountId: e.target.value })
              }
              placeholder="e.g. acc_RzpOwnerRajesh01"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Linked Account Verification Status
            </label>
            <select
              value={routeData.linkedAccountStatus}
              onChange={(e) =>
                setRouteData({ ...routeData, linkedAccountStatus: e.target.value })
              }
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium capitalize cursor-pointer"
            >
              {LINKED_ACCOUNT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRouteModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Update Route Link
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
};

export default OwnerList;
