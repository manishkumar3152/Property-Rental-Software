import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Login from './pages/auth/Login';
import AdminDashboard from './pages/admin/Dashboard';
import OwnerDashboard from './pages/owner/Dashboard';
import PropertyList from './pages/properties/PropertyList';
import OwnerList from './pages/owners/OwnerList';
import TenantList from './pages/tenants/TenantList';
import AgreementList from './pages/agreements/AgreementList';
import RentInvoiceList from './pages/rent/RentInvoiceList';
import PaymentList from './pages/payments/PaymentList';
import ReceiptList from './pages/receipts/ReceiptList';
import SettlementList from './pages/settlements/SettlementList';
import WhatsAppLogs from './pages/whatsapp/WhatsAppLogs';
import ReportsHub from './pages/reports/ReportsHub';
import ApplicationSettings from './pages/settings/ApplicationSettings';
import AuditLogs from './pages/audit/AuditLogs';

// Public Pages
import PublicPaymentPage from './pages/public/PublicPaymentPage';
import PublicTenantPortal from './pages/public/PublicTenantPortal';

const AppContent = () => {
  const { isAuthenticated, loading, role, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // URL Path router
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [publicPaymentToken, setPublicPaymentToken] = useState('');

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path.startsWith('/pay/')) {
        const token = path.replace('/pay/', '');
        setPublicPaymentToken(token);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange();
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    if (path.startsWith('/pay/')) {
      const token = path.replace('/pay/', '');
      setPublicPaymentToken(token);
    }
  };

  // 1. Public Payment Link Route: /pay/:token
  if (currentPath.startsWith('/pay/') || publicPaymentToken) {
    return (
      <PublicPaymentPage
        token={publicPaymentToken || currentPath.replace('/pay/', '')}
        onBackToLogin={() => navigateTo('/login')}
      />
    );
  }

  // 2. Public Tenant Portal Route: /tenant-portal
  if (currentPath === '/tenant-portal') {
    return (
      <PublicTenantPortal
        onBackToLogin={() => navigateTo('/login')}
        onOpenPaymentLink={(token) => navigateTo(`/pay/${token}`)}
      />
    );
  }

  // 3. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Initializing PropRent ERP...</p>
        </div>
      </div>
    );
  }

  // 4. Unauthenticated state -> Login
  if (!isAuthenticated) {
    return <Login onOpenTenantPortal={() => navigateTo('/tenant-portal')} />;
  }

  // 5. Authenticated ERP Dashboard & Portal
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return isOwner ? <OwnerDashboard /> : <AdminDashboard />;
      case 'properties':
        return <PropertyList />;
      case 'owners':
        return <OwnerList />;
      case 'tenants':
        return <TenantList />;
      case 'agreements':
        return <AgreementList />;
      case 'rent':
        return (
          <RentInvoiceList
            onOpenPublicPayment={(token) => navigateTo(`/pay/${token}`)}
          />
        );
      case 'payments':
        return <PaymentList />;
      case 'receipts':
        return <ReceiptList />;
      case 'settlements':
        return <SettlementList />;
      case 'whatsapp':
        return <WhatsAppLogs />;
      case 'reports':
        return <ReportsHub />;
      case 'settings':
        return <ApplicationSettings />;
      case 'audit':
        return <AuditLogs />;
      default:
        return isOwner ? <OwnerDashboard /> : <AdminDashboard />;
    }
  };

  return (
    <div className="h-screen flex bg-slate-50 text-slate-800 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Fixed Header / Navbar */}
        <Navbar
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          onOpenTenantPortal={() => navigateTo('/tenant-portal')}
        />

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scroll">
          {renderContent()}
        </main>

        {/* Fixed Footer */}
        <Footer />
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
