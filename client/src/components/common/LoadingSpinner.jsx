import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ text = 'Loading data...', size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <Loader2 className={`${sizeClasses[size] || 'w-8 h-8'} animate-spin text-sky-600 mb-3`} />
      <span className="text-xs font-medium text-slate-600">{text}</span>
    </div>
  );
};

export default LoadingSpinner;
