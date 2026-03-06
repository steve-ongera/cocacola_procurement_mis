// services/api.js  –  Procurement Management System API layer
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ─────────────────────────────────────────────
// HTTP CLIENT
// ─────────────────────────────────────────────
const getHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async (res) => {
  if (res.status === 401) {
    // Try refresh
    const refreshed = await refreshToken();
    if (!refreshed) {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    throw new Error('Retry');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(JSON.stringify(err));
  }
  if (res.status === 204) return null;
  return res.json();
};

const request = async (method, path, body = null, params = null) => {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, v);
    });
  }
  const options = { method, headers: getHeaders() };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url.toString(), options);
  return handleResponse(res);
};

const get    = (path, params) => request('GET',    path, null, params);
const post   = (path, body)   => request('POST',   path, body);
const put    = (path, body)   => request('PUT',    path, body);
const patch  = (path, body)   => request('PATCH',  path, body);
const del    = (path)         => request('DELETE', path);

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export const refreshToken = async () => {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return false;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    return true;
  } catch { return false; }
};

export const authAPI = {
  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
  me: () => get('/users/me/'),
};

// ─────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────
export const dashboardAPI = {
  stats:            () => get('/dashboard/stats/'),
  recentActivity:   () => get('/dashboard/recent_activity/'),
  budgetUtilization:() => get('/dashboard/budget_utilization/'),
  monthlySpend:     () => get('/dashboard/monthly_spend/'),
};

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export const usersAPI = {
  list:   (params) => get('/users/', params),
  get:    (id)     => get(`/users/${id}/`),
  create: (data)   => post('/users/', data),
  update: (id, d)  => patch(`/users/${id}/`, d),
  delete: (id)     => del(`/users/${id}/`),
};

// ─────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────
export const departmentsAPI = {
  list:   (params) => get('/departments/', params),
  get:    (slug)   => get(`/departments/${slug}/`),
  create: (data)   => post('/departments/', data),
  update: (slug, d)=> patch(`/departments/${slug}/`, d),
  delete: (slug)   => del(`/departments/${slug}/`),
};

// ─────────────────────────────────────────────
// FISCAL YEARS
// ─────────────────────────────────────────────
export const fiscalYearsAPI = {
  list:      (p)    => get('/fiscal-years/', p),
  get:       (slug) => get(`/fiscal-years/${slug}/`),
  create:    (data) => post('/fiscal-years/', data),
  update:    (slug, d) => patch(`/fiscal-years/${slug}/`, d),
  setActive: (slug) => post(`/fiscal-years/${slug}/set_active/`),
};

// ─────────────────────────────────────────────
// BUDGETS
// ─────────────────────────────────────────────
export const budgetsAPI = {
  list:    (p)     => get('/budgets/', p),
  get:     (slug)  => get(`/budgets/${slug}/`),
  create:  (data)  => post('/budgets/', data),
  update:  (slug, d) => patch(`/budgets/${slug}/`, d),
  delete:  (slug)  => del(`/budgets/${slug}/`),
  submit:  (slug)  => post(`/budgets/${slug}/submit/`),
  approve: (slug)  => post(`/budgets/${slug}/approve/`),
  reject:  (slug)  => post(`/budgets/${slug}/reject/`),
};

export const quarterBudgetsAPI = {
  list:   (p)    => get('/quarter-budgets/', p),
  get:    (slug) => get(`/quarter-budgets/${slug}/`),
  create: (data) => post('/quarter-budgets/', data),
  update: (slug, d) => patch(`/quarter-budgets/${slug}/`, d),
  delete: (slug) => del(`/quarter-budgets/${slug}/`),
};

export const budgetLineItemsAPI = {
  list:   (p)    => get('/budget-line-items/', p),
  get:    (slug) => get(`/budget-line-items/${slug}/`),
  create: (data) => post('/budget-line-items/', data),
  update: (slug, d) => patch(`/budget-line-items/${slug}/`, d),
  delete: (slug) => del(`/budget-line-items/${slug}/`),
};

// ─────────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────────
export const suppliersAPI = {
  list:      (p)     => get('/suppliers/', p),
  get:       (slug)  => get(`/suppliers/${slug}/`),
  create:    (data)  => post('/suppliers/', data),
  update:    (slug, d) => patch(`/suppliers/${slug}/`, d),
  delete:    (slug)  => del(`/suppliers/${slug}/`),
  activate:  (slug)  => post(`/suppliers/${slug}/activate/`),
  blacklist: (slug)  => post(`/suppliers/${slug}/blacklist/`),
};

// ─────────────────────────────────────────────
// TENDERS
// ─────────────────────────────────────────────
export const tendersAPI = {
  list:    (p)     => get('/tenders/', p),
  get:     (slug)  => get(`/tenders/${slug}/`),
  create:  (data)  => post('/tenders/', data),
  update:  (slug, d) => patch(`/tenders/${slug}/`, d),
  delete:  (slug)  => del(`/tenders/${slug}/`),
  publish: (slug)  => post(`/tenders/${slug}/publish/`),
  award:   (slug, data) => post(`/tenders/${slug}/award/`, data),
};

export const tenderBidsAPI = {
  list:   (p)    => get('/tender-bids/', p),
  get:    (slug) => get(`/tender-bids/${slug}/`),
  create: (data) => post('/tender-bids/', data),
  update: (slug, d) => patch(`/tender-bids/${slug}/`, d),
  delete: (slug) => del(`/tender-bids/${slug}/`),
};

// ─────────────────────────────────────────────
// REQUISITIONS
// ─────────────────────────────────────────────
export const requisitionsAPI = {
  list:         (p)      => get('/requisitions/', p),
  get:          (slug)   => get(`/requisitions/${slug}/`),
  create:       (data)   => post('/requisitions/', data),
  update:       (slug, d)=> patch(`/requisitions/${slug}/`, d),
  delete:       (slug)   => del(`/requisitions/${slug}/`),
  submit:       (slug)   => post(`/requisitions/${slug}/submit/`),
  hodApprove:   (slug)   => post(`/requisitions/${slug}/hod_approve/`),
  approve:      (slug)   => post(`/requisitions/${slug}/approve/`),
  reject:       (slug, reason) => post(`/requisitions/${slug}/reject/`, { reason }),
  convertToPO:  (slug)   => post(`/requisitions/${slug}/convert_to_po/`),
};

export const requisitionItemsAPI = {
  list:   (p)    => get('/requisition-items/', p),
  create: (data) => post('/requisition-items/', data),
  update: (slug, d) => patch(`/requisition-items/${slug}/`, d),
  delete: (slug) => del(`/requisition-items/${slug}/`),
};

// ─────────────────────────────────────────────
// PURCHASE ORDERS
// ─────────────────────────────────────────────
export const purchaseOrdersAPI = {
  list:        (p)      => get('/purchase-orders/', p),
  get:         (slug)   => get(`/purchase-orders/${slug}/`),
  create:      (data)   => post('/purchase-orders/', data),
  update:      (slug, d)=> patch(`/purchase-orders/${slug}/`, d),
  delete:      (slug)   => del(`/purchase-orders/${slug}/`),
  issue:       (slug)   => post(`/purchase-orders/${slug}/issue/`),
  acknowledge: (slug)   => post(`/purchase-orders/${slug}/acknowledge/`),
  cancel:      (slug)   => post(`/purchase-orders/${slug}/cancel/`),
};

export const poLineItemsAPI = {
  list:   (p)    => get('/po-line-items/', p),
  create: (data) => post('/po-line-items/', data),
  update: (slug, d) => patch(`/po-line-items/${slug}/`, d),
  delete: (slug) => del(`/po-line-items/${slug}/`),
};

// ─────────────────────────────────────────────
// GRN
// ─────────────────────────────────────────────
export const grnsAPI = {
  list:   (p)      => get('/grns/', p),
  get:    (slug)   => get(`/grns/${slug}/`),
  create: (data)   => post('/grns/', data),
  update: (slug, d)=> patch(`/grns/${slug}/`, d),
  delete: (slug)   => del(`/grns/${slug}/`),
  submit: (slug)   => post(`/grns/${slug}/submit/`),
  verify: (slug)   => post(`/grns/${slug}/verify/`),
};

export const grnLineItemsAPI = {
  list:   (p)    => get('/grn-line-items/', p),
  create: (data) => post('/grn-line-items/', data),
  update: (slug, d) => patch(`/grn-line-items/${slug}/`, d),
  delete: (slug) => del(`/grn-line-items/${slug}/`),
};

// ─────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────
export const invoicesAPI = {
  list:    (p)      => get('/invoices/', p),
  get:     (slug)   => get(`/invoices/${slug}/`),
  create:  (data)   => post('/invoices/', data),
  update:  (slug, d)=> patch(`/invoices/${slug}/`, d),
  delete:  (slug)   => del(`/invoices/${slug}/`),
  approve: (slug)   => post(`/invoices/${slug}/approve/`),
  dispute: (slug, reason) => post(`/invoices/${slug}/dispute/`, { reason }),
};

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────
export const paymentsAPI = {
  list:    (p)      => get('/payments/', p),
  get:     (slug)   => get(`/payments/${slug}/`),
  create:  (data)   => post('/payments/', data),
  update:  (slug, d)=> patch(`/payments/${slug}/`, d),
  approve: (slug)   => post(`/payments/${slug}/approve/`),
};

// ─────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────
export const auditLogsAPI = {
  list: (p) => get('/audit-logs/', p),
  get:  (id)=> get(`/audit-logs/${id}/`),
};