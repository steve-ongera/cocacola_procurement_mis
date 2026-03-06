// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, ToastProvider, SidebarProvider, useAuth, useSidebar } from './context/AppContext';
import { dashboardAPI } from './services/api';
import './styles/global_styles.css';

// Layout
import Sidebar from './components/layout/Sidebar';
import Navbar  from './components/layout/Navbar';

// Pages
import Login          from './pages/Login';
import Dashboard      from './pages/Dashboard';
import Budgets        from './pages/Budgets';
import Requisitions   from './pages/Requisitions';
import Suppliers      from './pages/Suppliers';
import Tenders        from './pages/Tenders';
import PurchaseOrders from './pages/PurchaseOrders';
import GRN            from './pages/GRN';
import Invoices       from './pages/Invoices';
import Payments       from './pages/Payments';
import AuditLog       from './pages/AuditLog';

// Placeholder for detail / form pages not yet built
const Placeholder = ({ title }) => (
  <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--gray-400)' }}>
    <i className="bi bi-hammer" style={{ fontSize: '36px', display: 'block', marginBottom: '14px' }} />
    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-600)' }}>{title}</h3>
    <p style={{ fontSize: '12px', marginTop: '6px' }}>This page is under construction.</p>
  </div>
);

// ─────────────────────────────────────────────
// PROTECTED APP SHELL
// ─────────────────────────────────────────────
function AppShell() {
  const { user, loading }   = useAuth();
  const { collapsed }       = useSidebar();
  const [badges, setBadges] = useState({});

  // Poll sidebar badge counts
  useEffect(() => {
    if (!user) return;
    const load = () => {
      dashboardAPI.stats()
        .then(s => setBadges({
          pending_requisitions: s.pending_requisitions || 0,
          pending_invoices:     s.pending_invoices     || 0,
        }))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, [user]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: '16px',
        background: 'var(--gray-50)',
      }}>
        <div className="spinner spinner-lg" />
        <span style={{ fontSize: '12px', color: 'var(--gray-400)', letterSpacing: '0.06em' }}>
          LOADING PROCUREPRO…
        </span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-wrapper">
      <Sidebar badges={badges} />
      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Navbar />
        <Routes>
          {/* Dashboard */}
          <Route path="/"                      element={<Dashboard />} />

          {/* Budgets */}
          <Route path="/budgets"               element={<Budgets />} />
          <Route path="/budgets/new"           element={<Placeholder title="New Budget" />} />
          <Route path="/budgets/:slug"         element={<Placeholder title="Budget Detail" />} />

          {/* Fiscal Years */}
          <Route path="/fiscal-years"          element={<Placeholder title="Fiscal Years" />} />
          <Route path="/fiscal-years/new"      element={<Placeholder title="New Fiscal Year" />} />

          {/* Requisitions */}
          <Route path="/requisitions"          element={<Requisitions />} />
          <Route path="/requisitions/new"      element={<Placeholder title="New Requisition" />} />
          <Route path="/requisitions/:slug"    element={<Placeholder title="Requisition Detail" />} />

          {/* Tenders */}
          <Route path="/tenders"               element={<Tenders />} />
          <Route path="/tenders/new"           element={<Placeholder title="New Tender" />} />
          <Route path="/tenders/:slug"         element={<Placeholder title="Tender Detail" />} />

          {/* Purchase Orders */}
          <Route path="/purchase-orders"       element={<PurchaseOrders />} />
          <Route path="/purchase-orders/new"   element={<Placeholder title="New Purchase Order" />} />
          <Route path="/purchase-orders/:slug" element={<Placeholder title="PO Detail" />} />

          {/* GRN */}
          <Route path="/grns"                  element={<GRN />} />
          <Route path="/grns/new"              element={<Placeholder title="New GRN" />} />
          <Route path="/grns/:slug"            element={<Placeholder title="GRN Detail" />} />

          {/* Invoices */}
          <Route path="/invoices"              element={<Invoices />} />
          <Route path="/invoices/new"          element={<Placeholder title="Record Invoice" />} />
          <Route path="/invoices/:slug"        element={<Placeholder title="Invoice Detail" />} />

          {/* Payments */}
          <Route path="/payments"              element={<Payments />} />
          <Route path="/payments/new"          element={<Placeholder title="Record Payment" />} />
          <Route path="/payments/:slug"        element={<Placeholder title="Payment Detail" />} />

          {/* Suppliers */}
          <Route path="/suppliers"             element={<Suppliers />} />
          <Route path="/suppliers/new"         element={<Placeholder title="New Supplier" />} />
          <Route path="/suppliers/:slug"       element={<Placeholder title="Supplier Detail" />} />

          {/* Master Data */}
          <Route path="/departments"           element={<Placeholder title="Departments" />} />
          <Route path="/users"                 element={<Placeholder title="Users" />} />

          {/* Audit */}
          <Route path="/audit-log"             element={<AuditLog />} />

          {/* Fallback */}
          <Route path="*"                      element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN GUARD — redirect to / if already authed
// ─────────────────────────────────────────────
function LoginGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user)    return <Navigate to="/" replace />;
  return <Login />;
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SidebarProvider>
            <Routes>
              <Route path="/login" element={<LoginGuard />} />
              <Route path="/*"     element={<AppShell />} />
            </Routes>
          </SidebarProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}