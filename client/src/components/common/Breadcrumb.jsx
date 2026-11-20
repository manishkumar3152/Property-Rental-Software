import React from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

export default function Breadcrumb({ items = [], onBack, className = '' }) {
  return (
    <nav className={`flex items-center text-xs font-medium text-slate-500 mb-4 flex-wrap gap-1.5 ${className}`} aria-label="Breadcrumb">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-colors mr-1 shadow-2xs cursor-pointer font-semibold"
          title="Back to list"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-1 text-slate-400">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>PropRent</span>
        </span>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              {isLast || !item.onClick ? (
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80">
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-sky-600 hover:underline transition-colors cursor-pointer font-medium text-slate-600"
                >
                  {item.label}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}