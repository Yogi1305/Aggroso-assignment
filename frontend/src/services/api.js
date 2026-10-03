import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token to all requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if unauthenticated
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  requestRoleUpgrade: (data) => api.post('/auth/role-request', data),
  getRoleRequests: () => api.get('/auth/role-requests'),
  decideRoleRequest: (id, action) => api.post(`/auth/role-requests/${id}/decision`, { action }),
};


export const claimsAPI = {
  getClaims: (params) => api.get('/claims', { params }),
  getClaimById: (id) => api.get(`/claims/${id}`),
  createClaim: (data) => api.post('/claims', data),
  createBatchClaims: (claims) => api.post('/claims/batch', { claims }),
  getTotals: () => api.get('/claims/summary/totals'),
  evaluateClaim: (id) => api.post(`/claims/${id}/evaluate`),
  recordDecision: (id, decision) => api.post(`/claims/${id}/decision`, decision),
  getClaimHistory: (id) => api.get(`/claims/${id}/history`),
};

export const policiesAPI = {
  getPolicies: () => api.get('/policies'),
  createPolicy: (data) => api.post('/policies', data),
};

export default api;
