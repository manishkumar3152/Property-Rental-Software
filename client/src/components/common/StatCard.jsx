import React from 'react';

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'sky',
}) => {
  const colorMap = {
    sky: 'bg-sky-50 text-sky-600',
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    teal: 'bg-teal-50 text-teal-600',
    slate: 'bg-slate-50 text-slate-600',
  };

  const iconClasses = colorMap[color] || colorMap.sky;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between transition-all duration-150 hover:shadow-sm">
      <div className="min-w-0 pr-3">
        <p className="text-xs font-medium text-slate-500 truncate">{title}</p>
        <p className="text-xl font-bold text-slate-900 tracking-tight mt-1">{value}</p>
        {(subtitle || trend !== undefined) && (
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
            {trend !== undefined && trend !== null && (
              <span
                className={`font-semibold ${
                  trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-slate-500'
                }`}
              >
                {trend > 0 ? `+${trend}%` : `${trend}%`}
              </span>
            )}
            <span className="truncate">{subtitle}</span>
          </div>
        )}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconClasses}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};

export default StatCard;
