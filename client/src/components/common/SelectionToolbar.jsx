import React from 'react';
import { Trash2, Download, CheckSquare, X, Tag, ChevronDown } from 'lucide-react';

export default function SelectionToolbar({
  selectedCount = 0,
  onClearSelection,
  onDeleteSelected,
  deleteLabel,
  onExportSelected,
  exportLabel = 'Export CSV',
  onStatusChange,
  statusOptions = [],
  customActions = [],
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700/60 flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center space-x-2 pr-3 border-r border-slate-700 text-xs">
        <CheckSquare className="w-4 h-4 text-sky-400" />
        <span className="font-bold text-white font-mono">{selectedCount}</span>
        <span className="text-slate-300">selected</span>
      </div>

      <div className="flex items-center space-x-2">
        {/* Bulk Status Change Dropdown */}
        {statusOptions.length > 0 && onStatusChange && (
          <div className="relative inline-flex items-center">
            <Tag className="w-3.5 h-3.5 text-sky-400 absolute left-2.5 pointer-events-none" />
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onStatusChange(e.target.value);
                  e.target.value = '';
                }
              }}
              className="appearance-none pl-8 pr-7 py-1.5 text-xs bg-slate-800 hover:bg-slate-750 text-slate-100 rounded-lg border border-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-xs transition-colors"
              defaultValue=""
            >
              <option value="" disabled>Change Status...</option>
              {statusOptions.map((st) => {
                const val = typeof st === 'object' ? (st.id || st.value) : st;
                const label = typeof st === 'object' ? (st.label || st.name) : st;
                return (
                  <option key={val} value={val} className="bg-slate-900 text-white">
                    {label}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>
        )}

        {/* Delete Selected Button */}
        {onDeleteSelected && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{deleteLabel || `Delete Selected (${selectedCount})`}</span>
          </button>
        )}

        {/* Export CSV Button */}
        {onExportSelected && (
          <button
            type="button"
            onClick={onExportSelected}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors border border-slate-700 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportLabel}</span>
          </button>
        )}

        {/* Custom Actions */}
        {customActions.map((action, i) => (
          <button
            key={i}
            type="button"
            onClick={action.onClick}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-xs cursor-pointer ${
              action.className || 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            {action.icon && <action.icon className="w-3.5 h-3.5" />}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Clear Selection Button */}
      <button
        type="button"
        onClick={onClearSelection}
        className="p-1 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
        title="Deselect All"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}