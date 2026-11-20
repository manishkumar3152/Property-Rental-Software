import React, { useState } from 'react';
import { Building, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'admin@propertyerp.com', pass: 'Admin@12345', badge: 'Full Access' },
  { role: 'Owner 1 (Rajesh Sharma)', email: 'rajesh.sharma@example.com', pass: 'Owner@12345', badge: '18 Properties' },
  { role: 'Owner 2 (Priya Patel)', email: 'priya.patel@example.com', pass: 'Owner@12345', badge: '16 Properties' },
  { role: 'Owner 3 (Vikram Malhotra)', email: 'vikram.malhotra@example.com', pass: 'Owner@12345', badge: '16 Properties' },
  { role: 'Staff Manager', email: 'manager@propertyerp.com', pass: 'Staff@12345', badge: 'Operations' },
];

const Login = ({ onOpenTenantPortal }) => {
  const { login } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState('admin@propertyerp.com');
  const [password, setPassword] = useState('Admin@12345');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toastError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      toastSuccess('Signed in successfully');
    } catch (err) {
      toastError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demo) => {
    setEmail(demo.email);
    setPassword(demo.pass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-500 flex items-center justify-center text-white shadow-md">
            <Building className="w-6 h-6" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          PropRent ERP Systems
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Enterprise Property Rental Management & Automated Collection Portal
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-sm border border-slate-200/90 rounded-2xl">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@propertyerp.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none text-slate-900 font-medium text-xs bg-slate-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none text-slate-900 font-medium text-xs bg-slate-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg text-xs shadow-xs transition-all duration-150 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign in to ERP Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo One-Click Selectors */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              1-Click Demo Accounts:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map((demo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectDemoAccount(demo)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all border ${
                    email === demo.email
                      ? 'bg-sky-50 text-sky-700 border-sky-300 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{demo.role}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-500 border border-slate-200">
                    {demo.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Public Tenant Portal Link */}
          <div className="mt-5 text-center">
            <button
              onClick={onOpenTenantPortal}
              className="text-xs text-sky-600 hover:text-sky-700 underline font-medium"
            >
              Are you a tenant? Click here for Public Tenant Rent Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
