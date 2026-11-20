import React from 'react';
import { Trash2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import FormModal from './FormModal';

export default function ConfirmDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to permanently delete this record? This action cannot be undone.',
  itemName = '',
  itemNumber = '',
  itemType = 'Record',
  selectedCount = 0,
  safeguardNote = '',
  confirmText = 'Delete Permanently',
  cancelText = 'Cancel',
  isLoading = false,
}) {
  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Financial Safeguard & Data Deletion Confirmation"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Warning Icon Banner */}
        <div className="flex items-start gap-3.5 p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-xl">
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Permanent Deletion Warning
            </h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Selected Item Summary Card */}
        {(itemName || selectedCount > 0) && (
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Target for Deletion:
            </span>
            {selectedCount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Multiple {itemType}s Selected
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 font-mono">
                  {selectedCount} Items
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">{itemName}</span>
                  {itemNumber && (
                    <span className="font-mono text-[11px] text-slate-500">
                      ID / Unit: {itemNumber}
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200/80 text-slate-700 uppercase">
                  {itemType}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Safeguard Alert Note */}
        {safeguardNote && (
          <div className="flex items-start gap-2 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">{safeguardNote}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </FormModal>
  );
}
