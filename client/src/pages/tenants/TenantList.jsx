import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  User,
  Home,
  Plus,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  Building2,
  Shield,
  FileCheck,
  Download,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import FormModal from '../../components/common/FormModal';
import FilterToolbar from '../../components/common/FilterToolbar';
import SelectionToolbar from '../../components/common/SelectionToolbar';
import ConfirmDeleteDialog from '../../components/common/ConfirmDeleteDialog';
import Breadcrumb from '../../components/common/Breadcrumb';
import { tenantApi, propertyApi, ownerApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useRouter } from '../../context/RouterContext';
import { formatINR, formatDate } from '../../utils/formatters';

const TENANT_STATUSES = ['Active', 'Vacated', 'Blacklisted', 'Pending Verification'];

const TenantList = () => {
  const { isSuperAdmin, isOwner } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { route, navigate } = useRouter();

  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [owners, setOwners] = useState([]);
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    fatherName: '',
    mobileNumber: '',
    whatsappNumber: '',
    email: '',
    aadhaarNumber: '',
    panNumber: '',
    permanentAddress: {
      fullAddress: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001',
    },
    assignedPropertyId: '',
    assignedOwnerId: '',
    securityDepositPaid: 0,
    status: 'Active',
  });

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await tenantApi.getAll();
      setTenants(res.data.data || []);
    } catch (err) {
      toastError('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [propsRes, ownersRes] = await Promise.all([
        propertyApi.getAll(),
        isSuperAdmin ? ownerApi.getAll() : Promise.resolve({ data: { data: [] } }),
      ]);
      setProperties(propsRes.data.data || []);
      setOwners(ownersRes.data.data || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchDependencies();
  }, []);

  // Synchronize route action with view states
  useEffect(() => {
    if (route.section === 'tenants') {
      if (route.action === 'add') {
        setSelectedTenant(null);
        setFormData({
          fullName: '',
          fatherName: '',
          mobileNumber: '',
          whatsappNumber: '',
          email: '',
          aadhaarNumber: '',
          panNumber: '',
          permanentAddress: {
            fullAddress: '',
            city: 'Bengaluru',
            state: 'Karnataka',
            pinCode: '560001',
          },
          assignedPropertyId: properties.find((p) => p.availabilityStatus === 'Available')?._id || '',
          assignedOwnerId: owners[0]?._id || '',
          securityDepositPaid: 0,
          status: 'Active',
        });
        setViewMode('form');
        setIsViewModalOpen(false);
      } else if (route.action === 'edit') {
        setViewMode('form');
        setIsViewModalOpen(false);
      } else if (route.action === 'view') {
        setViewMode('list');
        if (!selectedTenant && tenants.length > 0) {
          const match = route.id ? tenants.find((t) => t._id === route.id || t.tenantId === route.id) : null;
          setSelectedTenant(match || tenants[0]);
        }
        setIsViewModalOpen(true);
      } else {
        setViewMode('list');
        setIsViewModalOpen(false);
      }
    }
  }, [route.action, route.section, route.id, tenants.length]);

  const handleOpenAdd = (tenant = null) => {
    if (tenant) {
      setSelectedTenant(tenant);
      setFormData({
        fullName: tenant.fullName,
        fatherName: tenant.fatherName || '',
        mobileNumber: tenant.mobileNumber,
        whatsappNumber: tenant.whatsappNumber || tenant.mobileNumber,
        email: tenant.email || '',
        aadhaarNumber: tenant.aadhaarNumber || '',
        panNumber: tenant.panNumber || '',
        permanentAddress: {
          fullAddress: tenant.permanentAddress?.fullAddress || '',
          city: tenant.permanentAddress?.city || 'Bengaluru',
          state: tenant.permanentAddress?.state || 'Karnataka',
          pinCode: tenant.permanentAddress?.pinCode || '',
        },
        assignedPropertyId: tenant.assignedPropertyId?._id || tenant.assignedPropertyId || '',
        assignedOwnerId: tenant.assignedOwnerId?._id || tenant.assignedOwnerId || '',
        securityDepositPaid: tenant.securityDepositPaid || 0,
        status: tenant.status || 'Active',
      });
      navigate('/tenant/edit');
    } else {
      setSelectedTenant(null);
      setFormData({
        fullName: '',
        fatherName: '',
        mobileNumber: '',
        whatsappNumber: '',
        email: '',
        aadhaarNumber: '',
        panNumber: '',
        permanentAddress: {
          fullAddress: '',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560001',
        },
        assignedPropertyId: properties.find((p) => p.availabilityStatus === 'Available')?._id || '',
        assignedOwnerId: owners[0]?._id || '',
        securityDepositPaid: 0,
        status: 'Active',
      });
      navigate('/tenant/add');
    }
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedTenant) {
        await tenantApi.update(selectedTenant._id, formData);
        toastSuccess('Tenant record updated');
      } else {
        await tenantApi.create(formData);
        toastSuccess('Tenant registered and property mapped');
      }
      navigate('/tenant');
      fetchTenants();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to save tenant');
    } finally {
      setSaving(false);
    }
  };

  const handlePropertyChange = (propId) => {
    const prop = properties.find((p) => p._id === propId);
    setFormData((prev) => ({
      ...prev,
      assignedPropertyId: propId,
      assignedOwnerId: prop?.ownerId?._id || prop?.ownerId || prev.assignedOwnerId,
      securityDepositPaid: prop?.securityDeposit || prev.securityDepositPaid,
    }));
  };

  const handleDelete = async () => {
    try {
      const res = await tenantApi.delete(selectedTenant._id);
      toastSuccess(res.data.message || 'Tenant deactivated');
      setIsDeleteModalOpen(false);
      setSelectedIds((prev) => prev.filter((id) => id !== selectedTenant._id));
      fetchTenants();
    } catch (err) {
      toastError(err.response?.data?.message || 'Cannot delete tenant');
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await tenantApi.delete(id);
      }
      toastSuccess(`Processed ${selectedIds.length} tenants with safeguard verification`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      fetchTenants();
    } catch (err) {
      toastError(err.response?.data?.message || 'Error processing bulk tenant deactivation');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTenants.length && filteredTenants.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTenants.map((t) => t._id));
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
      ? tenants.filter((t) => selectedIds.includes(t._id))
      : tenants;

    if (listToExport.length === 0) {
      toastError('No tenants to export');
      return;
    }

    const headers = ['Tenant ID', 'Full Name', 'Father Name', 'Mobile', 'Email', 'Assigned Property', 'Security Deposit', 'Status'];
    const rows = listToExport.map((t) => [
      `"${t.tenantId || ''}"`,
      `"${t.fullName || ''}"`,
      `"${t.fatherName || ''}"`,
      `"${t.mobileNumber || ''}"`,
      `"${t.email || ''}"`,
      `"${t.assignedPropertyId?.propertyName || 'Unassigned'}"`,
      t.securityDepositPaid || 0,
      `"${t.status || 'Active'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'tenants_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(`Exported ${listToExport.length} tenants to CSV`);
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(
        selectedIds.map((id) => tenantApi.update(id, { status: newStatus }))
      );
      toastSuccess(`Updated status to "${newStatus}" for ${selectedIds.length} tenant(s)`);
      setSelectedIds([]);
      fetchTenants();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update tenant status');
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (propertyFilter && (t.assignedPropertyId?._id !== propertyFilter && t.assignedPropertyId !== propertyFilter)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = t.fullName?.toLowerCase().includes(q);
        const matchesId = t.tenantId?.toLowerCase().includes(q);
        const matchesPhone = t.mobileNumber?.includes(q);
        const matchesEmail = t.email?.toLowerCase().includes(q);
        const matchesProp = t.assignedPropertyId?.propertyName?.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesPhone && !matchesEmail && !matchesProp) return false;
      }
      // Month filter on createdAt
      if (monthFilter && t.createdAt && !t.createdAt.startsWith(monthFilter)) return false;
      // Date range filter on createdAt
      const targetDate = t.createdAt?.slice(0, 10);
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      return true;
    });
  }, [tenants, statusFilter, propertyFilter, searchTerm, monthFilter, startDate, endDate]);

  const columns = [
    {
      header: 'Tenant ID & Name',
      key: 'fullName',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block">{val}</span>
          <span className="text-xs text-slate-400 font-mono">
            {row.tenantId} • Father: {row.fatherName || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      key: 'mobileNumber',
      render: (val, row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{val}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{row.email || '-'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Property',
      key: 'assignedPropertyId',
      render: (val) => (
        <div>
          <span className="font-semibold text-xs text-slate-800 block">
            {val?.propertyName || 'Not Assigned'}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">{val?.propertyNumber || ''}</span>
        </div>
      ),
    },
    {
      header: 'Assigned Owner',
      key: 'assignedOwnerId',
      render: (val) => (
        <span className="text-xs font-medium text-slate-700">{val?.name || '-'}</span>
      ),
    },
    {
      header: 'Security Deposit',
      key: 'securityDepositPaid',
      render: (val) => (
        <span className="font-bold text-slate-900 text-xs block">{formatINR(val)}</span>
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
          <button
            onClick={() => {
              setSelectedTenant(row);
              setIsViewModalOpen(true);
              navigate('/tenant/view');
            }}
            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!isOwner && (
            <button
              onClick={() => handleOpenAdd(row)}
              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Edit Tenant"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setSelectedTenant(row);
                setIsDeleteModalOpen(true);
              }}
              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              title="Deactivate Tenant"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Dedicated Full Page View for Registering / Editing Tenant with Breadcrumb (14+ fields)
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        <Breadcrumb
          onBack={() => navigate('/tenant')}
          items={[
            { label: 'Tenants', onClick: () => navigate('/tenant') },
            { label: selectedTenant ? `Edit Tenant: ${selectedTenant.fullName}` : 'Register New Tenant' },
          ]}
        />

        <PageHeader
          title={selectedTenant ? 'Edit Tenant Profile' : 'Register New Tenant'}
          subtitle="Manage KYC information, assigned unit, and security deposit details."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/tenant')}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="tenant-page-form"
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150 cursor-pointer"
              >
                <span>{saving ? 'Saving...' : selectedTenant ? 'Update Tenant Record' : 'Register Tenant'}</span>
              </button>
            </div>
          }
        />

        <form id="tenant-page-form" onSubmit={handleSaveTenant} className="space-y-6">
          {/* Card 1: Identity & KYC Details */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-sky-600" />
              <span>Tenant Personal Identification & KYC</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tenant Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Amitabh Sen"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Father's / Guardian's Name</label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  placeholder="e.g. Bimal Sen"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Aadhaar Number (Protected Masked)</label>
                <input
                  type="text"
                  value={formData.aadhaarNumber}
                  onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value })}
                  placeholder="XXXX-XXXX-1234"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                  placeholder="ABCDE1234F"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Contact & Communication */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Phone className="w-4 h-4 text-sky-600" />
              <span>Contact & Communication Numbers</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone (Primary) *</label>
                <input
                  type="text"
                  required
                  value={formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  placeholder="+91 98450 00000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="text"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+91 98450 00000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="amitabh.sen@example.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Property Assignment & Security Deposit */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Assigned Rental Unit & Deposit</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Property Unit to Assign *</label>
                <select
                  required
                  value={formData.assignedPropertyId}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="">Select Property Unit</option>
                  {properties.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.propertyName} ({p.propertyNumber}) - Rent: ₹{p.monthlyBaseRent}/mo • Deposit: ₹{p.securityDeposit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Security Deposit Paid (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.securityDepositPaid}
                  onChange={(e) =>
                    setFormData({ ...formData, securityDepositPaid: Number(e.target.value) })
                  }
                  placeholder="100000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Card 4: Permanent Residential Address */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Home className="w-4 h-4 text-sky-600" />
              <span>Permanent Residential Address</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Street Address</label>
                <input
                  type="text"
                  value={formData.permanentAddress.fullAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permanentAddress: { ...formData.permanentAddress, fullAddress: e.target.value },
                    })
                  }
                  placeholder="e.g. House No. 12, HSR Layout Sector 1"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.permanentAddress.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      permanentAddress: { ...formData.permanentAddress, city: e.target.value },
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
                    value={formData.permanentAddress.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permanentAddress: { ...formData.permanentAddress, state: e.target.value },
                      })
                    }
                    placeholder="Karnataka"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                  />
                  <input
                    type="text"
                    value={formData.permanentAddress.pinCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        permanentAddress: { ...formData.permanentAddress, pinCode: e.target.value },
                      })
                    }
                    placeholder="560102"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate('/tenant')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel & Return to List
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : selectedTenant ? 'Update Tenant Record' : 'Register New Tenant'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant Management"
        subtitle={`Total registered tenants: ${tenants.length}`}
        actions={
          !isOwner && (
            <button
              onClick={() => handleOpenAdd()}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Tenant</span>
            </button>
          )
        }
      />

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search tenants by name, mobile, email, property..."
        status={statusFilter || 'All'}
        onStatusChange={(val) => setStatusFilter(val === 'All' ? '' : val)}
        statusOptions={TENANT_STATUSES}
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
        totalResults={filteredTenants.length}
      />

      {/* Tenants Table with Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredTenants}
        loading={loading}
        selectable={!isOwner}
        selectedIds={selectedIds}
        onSelectRow={toggleSelectOne}
        onSelectAll={toggleSelectAll}
        searchPlaceholder={null}
      />

      {/* Floating Bottom Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={!isOwner ? () => setIsBulkDeleteModalOpen(true) : null}
        deleteLabel={`Deactivate Selected (${selectedIds.length})`}
        statusOptions={[
          { value: 'Active', label: 'Mark Active' },
          { value: 'Inactive', label: 'Mark Inactive' },
          { value: 'Notice', label: 'Mark On Notice' },
        ]}
        onStatusChange={!isOwner ? handleBulkStatusChange : null}
        onExportSelected={handleExportSelected}
      />

      {/* View Tenant Details Modal (Read-only summary - Kept as Modal Popup) */}
      {selectedTenant && (
        <FormModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            navigate('/tenant');
          }}
          title={`Tenant Record: ${selectedTenant.fullName}`}
          subtitle={`Tenant ID: ${selectedTenant.tenantId}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block mb-0.5">Mobile Phone</span>
                <span className="font-bold text-slate-800">{selectedTenant.mobileNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Email</span>
                <span className="font-bold text-slate-800">{selectedTenant.email || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Aadhaar (Masked)</span>
                <span className="font-mono text-slate-800">{selectedTenant.aadhaarNumber || 'Protected'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">PAN Number</span>
                <span className="font-mono text-slate-800">{selectedTenant.panNumber || '-'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Assigned Property</span>
              <p className="font-bold text-slate-800 text-sm">
                {selectedTenant.assignedPropertyId?.propertyName} ({selectedTenant.assignedPropertyId?.propertyNumber})
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Permanent Address</span>
              <p className="text-slate-700 leading-relaxed">
                {selectedTenant.permanentAddress?.fullAddress || 'Address on record'}
              </p>
            </div>
          </div>
        </FormModal>
      )}

      {/* Single Tenant Deactivate / Delete Confirm */}
      <ConfirmDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Deactivate Tenant Record"
        itemName={selectedTenant?.fullName}
        itemNumber={selectedTenant?.tenantId}
        itemType="Tenant"
        message={`Are you sure you want to deactivate tenant record for "${selectedTenant?.fullName}"?`}
        safeguardNote="ERP Safeguard Notice: Outstanding invoices must be cleared before tenancy is terminated. Historical payment receipts and agreement logs will remain permanently intact."
        confirmText="Confirm Deactivation"
      />

      {/* Bulk Tenant Deactivate Confirm */}
      <ConfirmDeleteDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Bulk Deactivate Selected Tenants"
        selectedCount={selectedIds.length}
        itemType="Tenant"
        message={`Are you sure you want to deactivate ${selectedIds.length} selected tenants?`}
        safeguardNote="Safeguards ensure tenants with pending active leases or uncollected balances cannot be accidentally purged."
        confirmText={`Deactivate ${selectedIds.length} Tenants`}
      />
    </div>
  );
};

export default TenantList;
