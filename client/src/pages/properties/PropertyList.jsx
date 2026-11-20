import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
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
import { propertyApi, ownerApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatINR, formatDate } from '../../utils/formatters';

const PROPERTY_TYPES = ['Shop', 'House', 'Flat', 'Office', 'Warehouse', 'Plot', 'Other'];
const AVAILABILITY_STATUSES = ['Available', 'Occupied', 'Maintenance', 'Inactive'];

const PropertyList = () => {
  const { isSuperAdmin, isOwner, role } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [properties, setProperties] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);

  // View Mode: 'list' or 'form' for multi-field dedicated page with breadcrumb
  const [viewMode, setViewMode] = useState('list');
  const [saving, setSaving] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    propertyName: '',
    propertyNumber: '',
    propertyType: 'Flat',
    ownerId: '',
    address: {
      fullAddress: '',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001',
    },
    monthlyBaseRent: '',
    securityDeposit: '',
    description: '',
    allowMultiTenancy: false,
  });

  const [transferData, setTransferData] = useState({
    newOwnerId: '',
    transferReason: '',
  });

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterOwner) params.ownerId = filterOwner;

      const res = await propertyApi.getAll(params);
      setProperties(res.data.data || []);
    } catch (err) {
      toastError('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    if (isSuperAdmin) {
      try {
        const res = await ownerApi.getAll();
        setOwners(res.data.data || []);
      } catch (err) {
        // ignore
      }
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [filterType, filterStatus, filterOwner]);

  const handleOpenAdd = (prop = null) => {
    if (prop) {
      setSelectedProperty(prop);
      setFormData({
        propertyName: prop.propertyName,
        propertyNumber: prop.propertyNumber,
        propertyType: prop.propertyType,
        ownerId: prop.ownerId?._id || prop.ownerId,
        address: {
          fullAddress: prop.address?.fullAddress || '',
          city: prop.address?.city || 'Bengaluru',
          state: prop.address?.state || 'Karnataka',
          pinCode: prop.address?.pinCode || '',
        },
        monthlyBaseRent: prop.monthlyBaseRent,
        securityDeposit: prop.securityDeposit,
        description: prop.description || '',
        allowMultiTenancy: prop.allowMultiTenancy || false,
      });
    } else {
      setSelectedProperty(null);
      setFormData({
        propertyName: '',
        propertyNumber: '',
        propertyType: 'Flat',
        ownerId: owners[0]?._id || '',
        address: {
          fullAddress: '',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560001',
        },
        monthlyBaseRent: '',
        securityDeposit: '',
        description: '',
        allowMultiTenancy: false,
      });
    }
    setViewMode('form');
  };

  const handleSaveProperty = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedProperty) {
        await propertyApi.update(selectedProperty._id, formData);
        toastSuccess('Property updated successfully');
      } else {
        await propertyApi.create(formData);
        toastSuccess('Property created successfully');
      }
      setViewMode('list');
      fetchProperties();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTransfer = (prop) => {
    setSelectedProperty(prop);
    setTransferData({
      newOwnerId: '',
      transferReason: '',
    });
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.newOwnerId) {
      toastError('Please select a new owner');
      return;
    }
    try {
      await propertyApi.update(selectedProperty._id, {
        ownerId: transferData.newOwnerId,
        transferReason: transferData.transferReason,
      });
      toastSuccess('Property ownership transferred with audit history');
      setIsTransferModalOpen(false);
      fetchProperties();
    } catch (err) {
      toastError(err.response?.data?.message || 'Transfer failed');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await propertyApi.delete(selectedProperty._id);
      toastSuccess(res.data.message || 'Property removed successfully');
      setIsDeleteModalOpen(false);
      setSelectedIds((prev) => prev.filter((id) => id !== selectedProperty._id));
      fetchProperties();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await propertyApi.delete(id);
      }
      toastSuccess(`Processed ${selectedIds.length} properties with ERP financial safeguards`);
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);
      fetchProperties();
    } catch (err) {
      toastError(err.response?.data?.message || 'Error processing bulk deletion');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (!selectedIds.length) return;
    try {
      await Promise.all(
        selectedIds.map((id) => propertyApi.update(id, { availabilityStatus: newStatus }))
      );
      toastSuccess(`Updated status to "${newStatus}" for ${selectedIds.length} properties`);
      setSelectedIds([]);
      fetchProperties();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update property status');
    }
  };

  // Selection toggles
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProperties.length && filteredProperties.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProperties.map((p) => p._id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  // Export selected / all to CSV
  const handleExportSelected = () => {
    const listToExport = selectedIds.length > 0
      ? properties.filter((p) => selectedIds.includes(p._id))
      : properties;

    if (listToExport.length === 0) {
      toastError('No properties to export');
      return;
    }

    const headers = ['Property ID', 'Name', 'Number', 'Type', 'Owner', 'Base Rent', 'Security Deposit', 'Status', 'Tenant'];
    const rows = listToExport.map((p) => [
      `"${p.propertyId || ''}"`,
      `"${p.propertyName || ''}"`,
      `"${p.propertyNumber || ''}"`,
      `"${p.propertyType || ''}"`,
      `"${p.ownerId?.name || ''}"`,
      p.monthlyBaseRent || 0,
      p.securityDeposit || 0,
      `"${p.availabilityStatus || ''}"`,
      `"${p.currentTenantId?.fullName || 'Vacant'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', 'properties_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess(`Exported ${listToExport.length} properties to CSV`);
  };

  // Client-side search and filters combined
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = p.propertyName?.toLowerCase().includes(query);
        const matchesId = p.propertyId?.toLowerCase().includes(query);
        const matchesNum = p.propertyNumber?.toLowerCase().includes(query);
        const matchesAddr = p.address?.fullAddress?.toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesNum && !matchesAddr) return false;
      }
      if (filterType && p.propertyType !== filterType) return false;
      if (filterStatus && p.availabilityStatus !== filterStatus) return false;
      if (filterOwner && (p.ownerId?._id || p.ownerId) !== filterOwner) return false;

      // Month filter on createdAt
      if (monthFilter && p.createdAt && !p.createdAt.startsWith(monthFilter)) return false;
      // Date range filter on createdAt
      const targetDate = p.createdAt?.slice(0, 10);
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      return true;
    });
  }, [properties, searchTerm, filterType, filterStatus, filterOwner, monthFilter, startDate, endDate]);

  const columns = [
    {
      header: 'Property ID & Name',
      key: 'propertyId',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.propertyName}</span>
          <span className="text-xs text-slate-400 font-mono">
            {val} • {row.propertyNumber}
          </span>
        </div>
      ),
    },
    {
      header: 'Type',
      key: 'propertyType',
      render: (val) => (
        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {val}
        </span>
      ),
    },
    {
      header: 'Owner',
      key: 'ownerId',
      render: (val) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">{val?.name || '-'}</span>
          <span className="text-[11px] text-slate-400 font-mono">{val?.ownerCode || ''}</span>
        </div>
      ),
    },
    {
      header: 'Monthly Rent',
      key: 'monthlyBaseRent',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 text-sm block">{formatINR(val)}</span>
          <span className="text-[11px] text-slate-400">Dep: {formatINR(row.securityDeposit)}</span>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'availabilityStatus',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Current Tenant',
      key: 'currentTenantId',
      render: (val) => (
        <span className="text-xs font-medium text-slate-700">
          {val ? val.fullName : <span className="text-slate-400 italic">None (Vacant)</span>}
        </span>
      ),
    },
    {
      header: 'Actions',
      key: '_id',
      align: 'right',
      render: (val, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenAdd(row)}
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Edit Property"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => handleOpenTransfer(row)}
              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="Transfer Ownership"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => {
                setSelectedProperty(row);
                setIsDeleteModalOpen(true);
              }}
              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Property"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Dedicated Full Page View for Registering / Editing Property with Breadcrumb (12+ fields)
  if (viewMode === 'form') {
    return (
      <div className="space-y-6">
        <Breadcrumb
          onBack={() => setViewMode('list')}
          items={[
            { label: 'Properties', onClick: () => setViewMode('list') },
            { label: selectedProperty ? `Edit Property: ${selectedProperty.propertyName}` : 'Register New Property' },
          ]}
        />

        <PageHeader
          title={selectedProperty ? 'Edit Property Details' : 'Register New Property'}
          subtitle="Configure property identification, rental valuation, and ownership assignment."
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
                form="property-page-form"
                disabled={saving}
                className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150 cursor-pointer"
              >
                <span>{saving ? 'Saving...' : selectedProperty ? 'Update Property' : 'Register Property'}</span>
              </button>
            </div>
          }
        />

        <form id="property-page-form" onSubmit={handleSaveProperty} className="space-y-6">
          {/* Card 1: Identification & Ownership */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Property Identification & Ownership</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Property Name *</label>
                <input
                  type="text"
                  required
                  value={formData.propertyName}
                  onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                  placeholder="e.g. Prestige Tech Park Suite 302"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Property / Unit Number *</label>
                <input
                  type="text"
                  required
                  value={formData.propertyNumber}
                  onChange={(e) => setFormData({ ...formData, propertyNumber: e.target.value })}
                  placeholder="e.g. Unit 302 / Shop 5"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Property Type *</label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {isSuperAdmin && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Property Landlord / Owner *</label>
                  <select
                    required
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="">Select Landlord</option>
                    {owners.map((o) => (
                      <option key={o._id} value={o._id}>
                        {o.name} ({o.ownerCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Financial Valuation & Status */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>Rental Valuation & Deposit</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Monthly Base Rent (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.monthlyBaseRent}
                  onChange={(e) => setFormData({ ...formData, monthlyBaseRent: e.target.value })}
                  placeholder="35000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Security Deposit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.securityDeposit}
                  onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                  placeholder="150000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.allowMultiTenancy}
                    onChange={(e) =>
                      setFormData({ ...formData, allowMultiTenancy: e.target.checked })
                    }
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                  />
                  <span>Allow Multi-Tenancy (Co-living / Shared desks)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Card 3: Address & Location */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span>Physical Address & Location</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Physical Street Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address.fullAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, fullAddress: e.target.value },
                    })
                  }
                  placeholder="e.g. 100 Feet Road, Indiranagar"
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
                    placeholder="560038"
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Property Description & Features</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Key specifications, furnishing details, electrical sanction, and amenities..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              Cancel & Return to Inventory
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : selectedProperty ? 'Update Property' : 'Register New Property'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Inventory Management"
        subtitle={`Total registered properties: ${properties.length}`}
        actions={
          !isOwner && (
            <button
              onClick={() => handleOpenAdd()}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Property</span>
            </button>
          )
        }
      />

      {/* Proper Filter Toolbar */}
      <FilterToolbar
        search={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search properties by name, unit #, address, city..."
        status={filterStatus || 'All'}
        onStatusChange={(val) => setFilterStatus(val === 'All' ? '' : val)}
        statusOptions={AVAILABILITY_STATUSES}
        secondaryFilterLabel="Type"
        secondaryFilterValue={filterType || 'All'}
        onSecondaryFilterChange={(val) => setFilterType(val === 'All' ? '' : val)}
        secondaryOptions={PROPERTY_TYPES}
        tertiaryFilterLabel="Owner"
        tertiaryFilterValue={filterOwner || 'All'}
        onTertiaryFilterChange={isSuperAdmin ? (val) => setFilterOwner(val === 'All' ? '' : val) : null}
        tertiaryOptions={isSuperAdmin ? owners : []}
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
          setFilterType('');
          setFilterStatus('');
          setFilterOwner('');
          setMonthFilter('');
          setDatePreset('all');
          setStartDate('');
          setEndDate('');
        }}
        totalResults={filteredProperties.length}
      />

      {/* Table with Checkbox Selection */}
      <DataTable
        columns={columns}
        data={filteredProperties}
        loading={loading}
        selectable={isSuperAdmin}
        selectedIds={selectedIds}
        onSelectRow={toggleSelectOne}
        onSelectAll={toggleSelectAll}
        searchPlaceholder={null}
      />

      {/* Floating Bottom Selection Toolbar */}
      <SelectionToolbar
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        onDeleteSelected={isSuperAdmin ? () => setIsBulkDeleteModalOpen(true) : null}
        deleteLabel={`Delete Selected (${selectedIds.length})`}
        statusOptions={[
          { value: 'Available', label: 'Mark Available' },
          { value: 'Occupied', label: 'Mark Occupied' },
          { value: 'Maintenance', label: 'Mark Maintenance' },
          { value: 'Inactive', label: 'Mark Inactive' },
        ]}
        onStatusChange={isSuperAdmin ? handleBulkStatusChange : null}
        onExportSelected={handleExportSelected}
      />

      {/* Ownership Transfer Safeguard Modal (2 fields - Kept as Modal Popup) */}
      <FormModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Property Ownership (Safeguard)"
        subtitle="Reassigning property owner requires authorization and creates permanent audit trail."
      >
        <form onSubmit={handleExecuteTransfer} className="space-y-4">
          <div className="bg-amber-50 p-3.5 rounded-lg border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Security Protocol:</strong> Property owner changes are permanently logged in the
              ownership history ledger. All existing rental agreements and past financial invoices will
              preserve their historical owner references.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Owner</label>
            <input
              type="text"
              disabled
              value={selectedProperty?.ownerId?.name || 'N/A'}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Landlord / Owner *</label>
            <select
              required
              value={transferData.newOwnerId}
              onChange={(e) => setTransferData({ ...transferData, newOwnerId: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-medium"
            >
              <option value="">Select New Owner</option>
              {owners
                .filter((o) => o._id !== selectedProperty?.ownerId?._id)
                .map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.name} ({o.ownerCode})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Justification Reason *</label>
            <textarea
              required
              rows={3}
              value={transferData.transferReason}
              onChange={(e) => setTransferData({ ...transferData, transferReason: e.target.value })}
              placeholder="e.g. Sale of asset / title transfer deed registered on 15 Nov 2026"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
            >
              Authorize Ownership Transfer
            </button>
          </div>
        </form>
      </FormModal>

      {/* Single Item Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Property Record"
        itemName={selectedProperty?.propertyName}
        itemNumber={selectedProperty?.propertyNumber}
        itemType={selectedProperty?.propertyType || 'Property'}
        message={`Are you sure you want to permanently delete or archive "${selectedProperty?.propertyName}"?`}
        safeguardNote="Financial Safeguard: If historical rent invoices or agreements are associated with this property, the system will protect ledger integrity by archiving its availability status to Inactive instead of wiping transaction records."
        confirmText="Confirm Delete / Deactivate"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Bulk Delete Selected Properties"
        selectedCount={selectedIds.length}
        itemType="Property"
        message={`Are you sure you want to delete ${selectedIds.length} selected properties?`}
        safeguardNote="ERP Safeguard Notice: Records with linked financial history or rental leases will be safely deactivated without causing orphaned records."
        confirmText={`Delete ${selectedIds.length} Properties`}
      />
    </div>
  );
};

export default PropertyList;
