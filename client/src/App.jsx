import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { RouterProvider, useRouter } from './context/RouterContext';
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
  const { isAuthenticated, loading, isOwner } = useAuth();
  const { currentPath, route, navigate } = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync / Guard URLs:
  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // If logged in and on /login or root /, immediately push /dashboard so URL is never stuck at /login
        if (currentPath === '/login' || currentPath === '/' || currentPath === '') {
          navigate('/dashboard', { replace: true });
        }
      } else {
        // If not authenticated and trying to access an internal route
        if (
          !currentPath.startsWith('/pay/') &&
          currentPath !== '/tenant-portal' &&
          currentPath !== '/login'
        ) {
          navigate('/login', { replace: true });
        }
      }
    }
  }, [isAuthenticated, loading, currentPath, navigate]);

  // 1. Public Payment Link Route: /pay/:token
  if (currentPath.startsWith('/pay/') || route.section === 'pay') {
    const token = route.action || currentPath.replace('/pay/', '');
    return (
      <PublicPaymentPage
        token={token}
        onBackToLogin={() => navigate('/login')}
        onBackToTenantPortal={() => navigate('/tenant-portal')}
      />
    );
  }

  // 2. Public Tenant Portal Route: /tenant-portal
  if (route.section === 'tenant-portal' || currentPath === '/tenant-portal') {
    return (
      <PublicTenantPortal
        onBackToLogin={() => navigate('/login')}
        onOpenPaymentLink={(token) => navigate(`/pay/${token}`)}
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
    return <Login onOpenTenantPortal={() => navigate('/tenant-portal')} />;
  }

  // 5. Authenticated ERP Dashboard & Portal
  const renderContent = () => {
    switch (route.section) {
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
            onOpenPublicPayment={(token) => navigate(`/pay/${token}`)}
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
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Fixed Header / Navbar */}
        <Navbar
          activeTab={route.section}
          onOpenMobileSidebar={() => setIsMobileOpen(true)}
          onOpenTenantPortal={() => navigate('/tenant-portal')}
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
        <RouterProvider>
          <AppContent />
        </RouterProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
