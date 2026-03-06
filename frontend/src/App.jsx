// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, ToastProvider, SidebarProvider, useAuth, useSidebar } from './context/AppContext';
import { dashboardAPI } from './services/api';
import './styles/global_styles.css';

// Layout
import Sidebar from './components/layout/Sidebar';
import Navbar  from './components/layout/Navbar';

// Pages — Lists
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
import FiscalYears    from './pages/FiscalYears';
import Departments    from './pages/Departments';
import Users          from './pages/Users';

// Pages — Detail
import BudgetDetail       from './pages/BudgetDetail';
import RequisitionDetail  from './pages/RequisitionDetail';
import SupplierDetail     from './pages/SupplierDetail';
import TenderDetail       from './pages/TenderDetail';
import PODetail           from './pages/PODetail';
import GRNDetail          from './pages/GRNDetail';
import InvoiceDetail      from './pages/InvoiceDetail';
import PaymentDetail      from './pages/PaymentDetail';

// Pages — Forms (new / edit)
import BudgetForm        from './pages/BudgetForm';
import RequisitionForm   from './pages/RequisitionForm';
import SupplierForm      from './pages/SupplierForm';
import TenderForm        from './pages/TenderForm';
import POForm            from './pages/POForm';
import GRNForm           from './pages/GRNForm';
import InvoiceForm       from './pages/InvoiceForm';
import PaymentForm       from './pages/PaymentForm';

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
          {/* ── Dashboard ───────────────────────────── */}
          <Route path="/"                           element={<Dashboard />} />

          {/* ── Fiscal Years ────────────────────────── */}
          <Route path="/fiscal-years"               element={<FiscalYears />} />

          {/* ── Budgets ─────────────────────────────── */}
          <Route path="/budgets"                    element={<Budgets />} />
          <Route path="/budgets/new"                element={<BudgetForm />} />
          <Route path="/budgets/:slug"              element={<BudgetDetail />} />
          <Route path="/budgets/:slug/edit"         element={<BudgetForm />} />

          {/* ── Requisitions ────────────────────────── */}
          <Route path="/requisitions"               element={<Requisitions />} />
          <Route path="/requisitions/new"           element={<RequisitionForm />} />
          <Route path="/requisitions/:slug"         element={<RequisitionDetail />} />
          <Route path="/requisitions/:slug/edit"    element={<RequisitionForm />} />

          {/* ── Tenders ─────────────────────────────── */}
          <Route path="/tenders"                    element={<Tenders />} />
          <Route path="/tenders/new"                element={<TenderForm />} />
          <Route path="/tenders/:slug"              element={<TenderDetail />} />
          <Route path="/tenders/:slug/edit"         element={<TenderForm />} />

          {/* ── Purchase Orders ─────────────────────── */}
          <Route path="/purchase-orders"            element={<PurchaseOrders />} />
          <Route path="/purchase-orders/new"        element={<POForm />} />
          <Route path="/purchase-orders/:slug"      element={<PODetail />} />
          <Route path="/purchase-orders/:slug/edit" element={<POForm />} />

          {/* ── GRNs ────────────────────────────────── */}
          <Route path="/grns"                       element={<GRN />} />
          <Route path="/grns/new"                   element={<GRNForm />} />
          <Route path="/grns/:slug"                 element={<GRNDetail />} />
          <Route path="/grns/:slug/edit"            element={<GRNForm />} />

          {/* ── Invoices ────────────────────────────── */}
          <Route path="/invoices"                   element={<Invoices />} />
          <Route path="/invoices/new"               element={<InvoiceForm />} />
          <Route path="/invoices/:slug"             element={<InvoiceDetail />} />
          <Route path="/invoices/:slug/edit"        element={<InvoiceForm />} />

          {/* ── Payments ────────────────────────────── */}
          <Route path="/payments"                   element={<Payments />} />
          <Route path="/payments/new"               element={<PaymentForm />} />
          <Route path="/payments/:slug"             element={<PaymentDetail />} />
          <Route path="/payments/:slug/edit"        element={<PaymentForm />} />

          {/* ── Suppliers ───────────────────────────── */}
          <Route path="/suppliers"                  element={<Suppliers />} />
          <Route path="/suppliers/new"              element={<SupplierForm />} />
          <Route path="/suppliers/:slug"            element={<SupplierDetail />} />
          <Route path="/suppliers/:slug/edit"       element={<SupplierForm />} />

          {/* ── Master Data ─────────────────────────── */}
          <Route path="/departments"                element={<Departments />} />
          <Route path="/users"                      element={<Users />} />

          {/* ── Audit Log ───────────────────────────── */}
          <Route path="/audit-log"                  element={<AuditLog />} />

          {/* ── Fallback ────────────────────────────── */}
          <Route path="*"                           element={<Navigate to="/" replace />} />
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