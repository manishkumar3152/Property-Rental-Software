import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('prop_erp_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't redirect if already on login or public payment page
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/pay/') && !path.includes('/tenant-portal')) {
        localStorage.removeItem('prop_erp_token');
        localStorage.removeItem('prop_erp_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
