import React from 'react';
import { ShieldCheck, Activity, Clock, CheckCircle2, Server, Lock } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="h-10 bg-white border-t border-slate-200/90 px-4 sm:px-6 flex items-center justify-between text-[11px] text-slate-500 shadow-2xs z-20 shrink-0 select-none">
      {/* Left: Operational Status & System Info */}
      <div className="flex items-center space-x-3 truncate">
        {/* Live System Operational Indicator */}
        <div className="flex items-center space-x-1.5 font-medium text-slate-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-semibold text-slate-700">All Systems Online</span>
        </div>

        <span className="text-slate-300 hidden sm:inline">•</span>

        {/* Timezone */}
        <div className="hidden sm:flex items-center space-x-1 text-slate-500">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Asia/Kolkata (IST)</span>
        </div>

        <span className="text-slate-300 hidden md:inline">•</span>

        {/* Version */}
        <span className="hidden md:inline font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
          v2.4.0-prod
        </span>
      </div>

      {/* Center: ERP Branding & Ownership (Hidden on smaller screens) */}
      <div className="hidden lg:flex items-center space-x-1.5 text-slate-600 font-medium">
        <span>© {currentYear} PropRent ERP</span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500">Multi-Owner Property & Rental Management</span>
      </div>

      {/* Right: Security & Payment Protocol Badges */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* Razorpay Route Badge */}
        <div className="flex items-center space-x-1 text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200/80">
          <CheckCircle2 className="w-3 h-3 text-sky-600" />
          <span className="text-[10px]">Razorpay Route Active</span>
        </div>

        {/* 256-bit SSL Security */}
        <div className="hidden sm:flex items-center space-x-1 text-slate-500 font-medium">
          <Lock className="w-3 h-3 text-emerald-600" />
          <span className="text-[10px]">256-bit Encrypted</span>
        </div>
      </div>
    </footer>
  );
}
