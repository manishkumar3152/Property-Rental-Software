import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const RouterContext = createContext(null);

export const parsePath = (pathname) => {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  const segments = clean ? clean.split('/') : [];

  const rawSection = segments[0] || '';
  const rawAction = segments[1] || '';
  const rawId = segments[2] || '';

  // Canonical section dictionary
  const SECTION_MAP = {
    '': 'dashboard',
    'dashboard': 'dashboard',
    'tenant': 'tenants',
    'tenants': 'tenants',
    'property': 'properties',
    'properties': 'properties',
    'owner': 'owners',
    'owners': 'owners',
    'agreement': 'agreements',
    'agreements': 'agreements',
    'rent': 'rent',
    'invoice': 'rent',
    'invoices': 'rent',
    'rent-invoices': 'rent',
    'payment': 'payments',
    'payments': 'payments',
    'receipt': 'receipts',
    'receipts': 'receipts',
    'settlement': 'settlements',
    'settlements': 'settlements',
    'whatsapp': 'whatsapp',
    'report': 'reports',
    'reports': 'reports',
    'setting': 'settings',
    'settings': 'settings',
    'audit': 'audit',
    'audit-trail': 'audit',
    'login': 'login',
    'tenant-portal': 'tenant-portal',
    'pay': 'pay',
  };

  const section = SECTION_MAP[rawSection.toLowerCase()] || rawSection.toLowerCase() || 'dashboard';

  return {
    pathname: pathname || '/',
    rawSection,
    section,
    action: rawAction.toLowerCase(), // 'add', 'edit', 'view', 'generate', etc.
    id: rawId,
    segments,
  };
};

export const RouterProvider = ({ children }) => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [route, setRoute] = useState(() => parsePath(window.location.pathname));

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      setRoute(parsePath(path));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((to, options = {}) => {
    const targetPath = typeof to === 'string' ? to : '/dashboard';
    if (window.location.pathname !== targetPath) {
      if (options.replace) {
        window.history.replaceState({}, '', targetPath);
      } else {
        window.history.pushState({}, '', targetPath);
      }
    }
    setCurrentPath(targetPath);
    setRoute(parsePath(targetPath));
  }, []);

  return (
    <RouterContext.Provider value={{ currentPath, route, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return context;
};
