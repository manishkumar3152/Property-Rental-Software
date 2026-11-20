export const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatMonth = (monthStr) => {
  if (!monthStr) return '-';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
};

export const getStatusBadgeStyle = (status) => {
  const map = {
    Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    captured: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    settled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Occupied: 'bg-sky-50 text-sky-700 border-sky-200',
    Available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
    Upcoming: 'bg-slate-50 text-slate-700 border-slate-200',
    Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
    Expiring: 'bg-orange-50 text-orange-700 border-orange-200',
    Expired: 'bg-rose-50 text-rose-700 border-rose-200',
    Renewed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Terminated: 'bg-slate-100 text-slate-600 border-slate-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    delivered: 'bg-teal-50 text-teal-700 border-teal-200',
    sent: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  return map[status] || 'bg-slate-50 text-slate-700 border-slate-200';
};

export const exportToCSV = (filename, data) => {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(obj =>
    headers.map(header => {
      const val = obj[header];
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val !== undefined && val !== null ? val : '';
    }).join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const matchesDateFilters = (dateVal, { month = '', datePreset = '', startDate = '', endDate = '' } = {}) => {
  if (!dateVal) return true;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return true;

  // Month check (format: YYYY-MM)
  if (month && month !== 'All') {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    if (`${yyyy}-${mm}` !== month) return false;
  }

  // Preset check
  if (datePreset && datePreset !== 'all') {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (datePreset === 'today') {
      if (dStr !== todayStr) return false;
    } else if (datePreset === 'this_week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (d < oneWeekAgo) return false;
    } else if (datePreset === 'this_month') {
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
    } else if (datePreset === 'last_month') {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      if (d.getMonth() !== prevMonth || d.getFullYear() !== prevYear) return false;
    }
  }

  // Custom start date
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    if (d < start) return false;
  }

  // Custom end date
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }

  return true;
};
