import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Filter,
  RotateCcw,
  Calendar,
  Clock,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

const ALL_MONTHS = [
  { num: '01', short: 'Jan', name: 'January' },
  { num: '02', short: 'Feb', name: 'February' },
  { num: '03', short: 'Mar', name: 'March' },
  { num: '04', short: 'Apr', name: 'April' },
  { num: '05', short: 'May', name: 'May' },
  { num: '06', short: 'Jun', name: 'June' },
  { num: '07', short: 'Jul', name: 'July' },
  { num: '08', short: 'Aug', name: 'August' },
  { num: '09', short: 'Sep', name: 'September' },
  { num: '10', short: 'Oct', name: 'October' },
  { num: '11', short: 'Nov', name: 'November' },
  { num: '12', short: 'Dec', name: 'December' },
];

const AVAILABLE_YEARS = [2027, 2026, 2025, 2024];

export default function FilterToolbar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',

  // Status Filter
  status = 'All',
  onStatusChange,
  statusOptions = [],

  // Secondary Filter (e.g. Type, Method, Action, Category)
  secondaryFilterValue = 'All',
  onSecondaryFilterChange,
  secondaryFilterLabel = 'Filter',
  secondaryOptions = [],

  // Tertiary Filter (e.g. Owner, Property)
  tertiaryFilterValue = 'All',
  onTertiaryFilterChange,
  tertiaryFilterLabel = 'Option',
  tertiaryOptions = [],

  // Month Filter (sabi month ho proper month filter)
  month = '',
  onMonthChange,
  monthOptions,

  // Date Range Filters (Start Date, End Date, Custom Date)
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange,
  datePreset = 'all',
  onDatePresetChange,

  // Sort Filter
  sortBy = '',
  onSortChange,
  sortOptions = [],

  // Reset
  onResetFilters,
  totalResults = 0,

  // Custom Extra Filters
  extraFilters,
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Derive initial selected year from month prop or default to 2026
  const initialYear = useMemo(() => {
    if (month && month.includes('-')) {
      const y = parseInt(month.split('-')[0], 10);
      if (!isNaN(y)) return y;
    }
    return 2026;
  }, [month]);

  const [activeYear, setActiveYear] = useState(initialYear);

  useEffect(() => {
    if (month && month.includes('-')) {
      const y = parseInt(month.split('-')[0], 10);
      if (!isNaN(y)) setActiveYear(y);
    }
  }, [month]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Calculate active filters count
  const activeCount = useMemo(() => {
    let count = 0;
    if (status && status !== 'All' && status !== '') count++;
    if (secondaryFilterValue && secondaryFilterValue !== 'All' && secondaryFilterValue !== '') count++;
    if (tertiaryFilterValue && tertiaryFilterValue !== 'All' && tertiaryFilterValue !== '') count++;
    if (month && month !== 'All' && month !== '') count++;
    if (startDate) count++;
    if (endDate) count++;
    if (datePreset && datePreset !== 'all' && datePreset !== '') count++;
    if (sortBy && sortBy !== '') count++;
    return count;
  }, [status, secondaryFilterValue, tertiaryFilterValue, month, startDate, endDate, datePreset, sortBy]);

  const hasActiveFilters = activeCount > 0 || Boolean(search);

  // Month selection helper
  const handleSelectMonthNum = (monthNum) => {
    if (!onMonthChange) return;
    const targetVal = `${activeYear}-${monthNum}`;
    if (month === targetVal) {
      onMonthChange('');
    } else {
      onMonthChange(targetVal);
    }
  };

  const handleClearMonth = () => {
    if (onMonthChange) onMonthChange('');
  };

  const getMonthDisplayLabel = (monthVal) => {
    if (!monthVal || monthVal === 'All') return '';
    const [y, m] = monthVal.split('-');
    const found = ALL_MONTHS.find((item) => item.num === m);
    if (found) return `${found.name} ${y}`;
    return monthVal;
  };

  const selectedMonthNum = useMemo(() => {
    if (!month || !month.includes('-')) return '';
    const [y, m] = month.split('-');
    if (parseInt(y, 10) === activeYear) {
      return m;
    }
    return '';
  }, [month, activeYear]);

  // Date Preset handler that automatically computes YYYY-MM-DD
  const handlePresetSelect = (val) => {
    if (onDatePresetChange) onDatePresetChange(val);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (val === 'all') {
      if (onStartDateChange) onStartDateChange('');
      if (onEndDateChange) onEndDateChange('');
    } else if (val === 'today') {
      const todayStr = toYMD(now);
      if (onStartDateChange) onStartDateChange(todayStr);
      if (onEndDateChange) onEndDateChange(todayStr);
    } else if (val === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = toYMD(yest);
      if (onStartDateChange) onStartDateChange(yestStr);
      if (onEndDateChange) onEndDateChange(yestStr);
    } else if (val === 'this_week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (onStartDateChange) onStartDateChange(toYMD(weekAgo));
      if (onEndDateChange) onEndDateChange(toYMD(now));
    } else if (val === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      if (onStartDateChange) onStartDateChange(toYMD(start));
      if (onEndDateChange) onEndDateChange(toYMD(end));
    } else if (val === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      if (onStartDateChange) onStartDateChange(toYMD(start));
      if (onEndDateChange) onEndDateChange(toYMD(end));
    } else if (val === 'last_90') {
      const d90 = new Date(now);
      d90.setDate(d90.getDate() - 90);
      if (onStartDateChange) onStartDateChange(toYMD(d90));
      if (onEndDateChange) onEndDateChange(toYMD(now));
    }
  };

  const showDateFilterRow = Boolean(onMonthChange || onStartDateChange || onEndDateChange || onDatePresetChange);

  return (
    <>
      {/* Top Main Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Clickable Filter Button to open the Bottom Drawer */}
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs select-none cursor-pointer ${
                activeCount > 0
                  ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700 shadow-sky-100'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
              title="Click to open full filter drawer (month, date range, status, etc.)"
            >
              <Filter className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-white' : 'text-sky-600'}`} />
              <span>Filters</span>
              {activeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-white text-sky-700 ml-0.5">
                  {activeCount}
                </span>
              )}
            </button>

            {/* Search Input (Always easily accessible on the main bar) */}
            {onSearchChange && (
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Quick Status Pill (if status provided) */}
            {statusOptions.length > 0 && onStatusChange && (
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                className="hidden sm:inline-block px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none text-slate-700 font-medium text-xs cursor-pointer"
              >
                <option value="All">All Statuses</option>
                {statusOptions.map((opt) => {
                  const val = typeof opt === 'object' ? (opt.id || opt.value || opt.name) : opt;
                  const label = typeof opt === 'object' ? (opt.label || opt.name || opt.id) : opt;
                  return (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Active Filter Chips with quick remove 'X' */}
            {month && month !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-xs font-medium">
                <Calendar className="w-3 h-3 text-sky-600" />
                <span>{getMonthDisplayLabel(month)}</span>
                <button
                  type="button"
                  onClick={() => onMonthChange && onMonthChange('')}
                  className="hover:text-sky-950 p-0.5 rounded cursor-pointer"
                  title="Remove Month Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-xs font-medium">
                <Clock className="w-3 h-3 text-sky-600" />
                <span>
                  {startDate || '...'} to {endDate || '...'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (onStartDateChange) onStartDateChange('');
                    if (onEndDateChange) onEndDateChange('');
                    if (onDatePresetChange) onDatePresetChange('all');
                  }}
                  className="hover:text-sky-950 p-0.5 rounded cursor-pointer"
                  title="Remove Date Range"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {datePreset && datePreset !== 'all' && !startDate && !endDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-xs font-medium capitalize">
                <Clock className="w-3 h-3 text-sky-600" />
                <span>{datePreset.replace(/_/g, ' ')}</span>
                <button
                  type="button"
                  onClick={() => onDatePresetChange && onDatePresetChange('all')}
                  className="hover:text-sky-950 p-0.5 rounded cursor-pointer"
                  title="Remove Preset"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {secondaryFilterValue && secondaryFilterValue !== 'All' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg text-xs font-medium capitalize">
                <span>{secondaryFilterLabel}: {secondaryFilterValue}</span>
                <button
                  type="button"
                  onClick={() => onSecondaryFilterChange && onSecondaryFilterChange('All')}
                  className="hover:text-sky-950 p-0.5 rounded cursor-pointer"
                  title={`Remove ${secondaryFilterLabel}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Reset All Filters Button */}
            {hasActiveFilters && onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors border border-rose-200 cursor-pointer"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* Total Results Count */}
            <span className="font-semibold text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
              {totalResults} record(s)
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM DRAWER (Sliding up from bottom when Filter icon is clicked) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Bottom Drawer Modal Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Drawer Pull Handle */}
            <div
              className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 cursor-pointer hover:bg-slate-400 transition-colors"
              onClick={() => setIsDrawerOpen(false)}
              title="Close drawer"
            />

            {/* Drawer Header */}
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-sky-50 text-sky-600 rounded-lg border border-sky-200">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Advanced Filter Drawer</h3>
                    {activeCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
                        {activeCount} active filter{activeCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Refine records by complete 12-month calendar, date range presets, and attributes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {hasActiveFilters && onResetFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 font-medium transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Close Drawer (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="overflow-y-auto p-5 space-y-5 max-h-[calc(85vh-130px)] custom-scroll">
              {/* SECTION 1: PROPER 12-MONTH FILTER ("sabi month ho proper month filter") */}
              {onMonthChange && (
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Proper Month Filter (All 12 Calendar Months)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Year Selector Pills */}
                      <span className="text-[11px] font-semibold text-slate-500">Year:</span>
                      <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                        {AVAILABLE_YEARS.map((yr) => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => {
                              setActiveYear(yr);
                              // If a month was selected, switch it to the new year
                              if (month && month.includes('-')) {
                                const [, m] = month.split('-');
                                onMonthChange(`${yr}-${m}`);
                              }
                            }}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                              activeYear === yr
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>

                      {month && month !== 'All' && (
                        <button
                          type="button"
                          onClick={handleClearMonth}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline px-1 cursor-pointer"
                        >
                          Clear Month
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 12 Interactive Month Buttons Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5 pt-1">
                    {ALL_MONTHS.map((m) => {
                      const isSelected = selectedMonthNum === m.num;
                      return (
                        <button
                          key={m.num}
                          type="button"
                          onClick={() => handleSelectMonthNum(m.num)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs scale-102'
                              : 'bg-white hover:bg-sky-50 text-slate-700 border-slate-200 hover:border-sky-300 font-medium'
                          }`}
                          title={`${m.name} ${activeYear}`}
                        >
                          <span className="text-xs font-bold">{m.short}</span>
                          <span className={`text-[10px] ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                            {m.num}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown alternative & Custom Native Month Input */}
                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/60 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Dropdown List:</span>
                      <select
                        value={month}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        <option value="">All Months</option>
                        {AVAILABLE_YEARS.map((yr) => (
                          <optgroup key={yr} label={`Year ${yr} (All 12 Months)`}>
                            {ALL_MONTHS.map((m) => (
                              <option key={`${yr}-${m.num}`} value={`${yr}-${m.num}`}>
                                {m.name} {yr} ({m.short} {yr})
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Custom Native Month Picker:</span>
                      <input
                        type="month"
                        value={month}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: DATE RANGE & PRESETS (From, To, Today, This Week, etc.) */}
              {(onStartDateChange || onEndDateChange || onDatePresetChange) && (
                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Date Range & Quick Presets
                      </span>
                    </div>

                    {(startDate || endDate || (datePreset && datePreset !== 'all')) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onStartDateChange) onStartDateChange('');
                          if (onEndDateChange) onEndDateChange('');
                          if (onDatePresetChange) onDatePresetChange('all');
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                      >
                        Clear Dates
                      </button>
                    )}
                  </div>

                  {/* Date Preset Buttons */}
                  {onDatePresetChange && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'all', label: 'All Dates' },
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: 'this_week', label: 'This Week' },
                        { id: 'this_month', label: 'This Month' },
                        { id: 'last_month', label: 'Last Month' },
                        { id: 'last_90', label: 'Last 90 Days' },
                        { id: 'custom', label: 'Custom Range' },
                      ].map((preset) => {
                        const isSelected = datePreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handlePresetSelect(preset.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Start Date & End Date Inputs */}
                  {(onStartDateChange || onEndDateChange) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          From (Start Date):
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => onStartDateChange && onStartDateChange(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          To (End Date):
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => onEndDateChange && onEndDateChange(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: ATTRIBUTES & CATEGORY FILTERS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Status Dropdown */}
                {statusOptions.length > 0 && onStatusChange && (
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Status Filter:
                    </label>
                    <select
                      value={status}
                      onChange={(e) => onStatusChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      {statusOptions.map((opt) => {
                        const val = typeof opt === 'object' ? (opt.id || opt.value || opt.name) : opt;
                        const label = typeof opt === 'object' ? (opt.label || opt.name || opt.id) : opt;
                        return (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Secondary Dropdown (Type, Method, Template) */}
                {secondaryOptions.length > 0 && onSecondaryFilterChange && (
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {secondaryFilterLabel}:
                    </label>
                    <select
                      value={secondaryFilterValue}
                      onChange={(e) => onSecondaryFilterChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="All">All {secondaryFilterLabel}s</option>
                      {secondaryOptions.map((opt) => {
                        const val = typeof opt === 'object' ? (opt._id || opt.id || opt.value || opt.name) : opt;
                        const label = typeof opt === 'object' ? (opt.name || opt.label || opt.propertyName || opt.title) : opt;
                        return (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Tertiary Dropdown (Owner, Property) */}
                {tertiaryOptions.length > 0 && onTertiaryFilterChange && (
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {tertiaryFilterLabel}:
                    </label>
                    <select
                      value={tertiaryFilterValue}
                      onChange={(e) => onTertiaryFilterChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="All">All {tertiaryFilterLabel}s</option>
                      {tertiaryOptions.map((opt) => {
                        const val = typeof opt === 'object' ? (opt._id || opt.id || opt.value || opt.name) : opt;
                        const label = typeof opt === 'object' ? (opt.name || opt.label) : opt;
                        return (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Sort Option */}
                {sortOptions.length > 0 && onSortChange && (
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Sort By:
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => onSortChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="">Default Order</option>
                      {sortOptions.map((opt) => (
                        <option key={opt.id || opt.value} value={opt.id || opt.value}>
                          {opt.label || opt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {extraFilters}
            </div>

            {/* Drawer Sticky Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                  {totalResults} record(s) matching
                </span>
                {activeCount > 0 && (
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    ({activeCount} filter criteria currently active)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {hasActiveFilters && onResetFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                  >
                    Reset All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply & Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}