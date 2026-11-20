import React from 'react';
import { getStatusBadgeStyle } from '../../utils/formatters';

const StatusBadge = ({ status, className = '' }) => {
  const badgeStyle = getStatusBadgeStyle(status);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border shadow-2xs ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
