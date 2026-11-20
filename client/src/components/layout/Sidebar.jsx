import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  FileText,
  Receipt,
  CreditCard,
  CheckSquare,
  Landmark,
  MessageSquare,
  BarChart3,
  Settings,
  ShieldCheck,
  Building,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from '../../constants/navigation';

const iconMap = {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  FileText,
  Receipt,
  CreditCard,
  CheckSquare,
  Landmark,
  MessageSquare,
  BarChart3,
  Settings,
  ShieldCheck,
};

const Sidebar = ({ activeTab, onSelectTab, isMobileOpen, setIsMobileOpen }) => {
  const { user, role, logout } = useAuth();

  const allowedNavItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleNavClick = (id) => {
    onSelectTab(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 min-h-screen lg:sticky lg:top-0 lg:h-screen transition-transform duration-200 ease-in-out shadow-lg lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-600 to-sky-700 flex items-center justify-center text-white shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">PropRent ERP</h1>
              <p className="text-xs text-sky-600 font-semibold">
                {role === 'super_admin' ? 'Super Admin' : role === 'owner' ? 'Owner Portal' : 'Staff Manager'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-3">
          <button
            onClick={() => handleNavClick('rent')}
            className="w-full flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium text-xs shadow-xs transition-all duration-150"
          >
            <Receipt className="w-4 h-4" />
            <span>Generate Invoices</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 custom-scroll">
          <div className="pt-2 pb-1.5 px-3 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
            OPERATIONS & MANAGEMENT
          </div>
          {allowedNavItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold border-l-4 border-sky-600 shadow-2xs'
                    : 'text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isActive ? 'text-sky-600' : 'text-slate-500'
                    }`}
                    strokeWidth={1.8}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 hover:text-rose-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
