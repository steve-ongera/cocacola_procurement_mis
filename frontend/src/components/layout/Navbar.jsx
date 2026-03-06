// components/layout/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/AppContext';

const PAGE_TITLES = {
  '/':                'Dashboard',
  '/fiscal-years':    'Fiscal Years',
  '/budgets':         'Budgets',
  '/requisitions':    'Requisitions',
  '/tenders':         'Tenders',
  '/purchase-orders': 'Purchase Orders',
  '/grns':            'Goods Received Notes',
  '/invoices':        'Invoices',
  '/payments':        'Payments',
  '/suppliers':       'Suppliers',
  '/departments':     'Departments',
  '/users':           'Users',
  '/audit-log':       'Audit Log',
};

export default function Navbar() {
  const { collapsed, toggleMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current title & breadcrumbs
  const segments   = location.pathname.split('/').filter(Boolean);
  const rootPath   = '/' + (segments[0] || '');
  const title      = PAGE_TITLES[rootPath] || 'Procurement';
  const isDetail   = segments.length > 1;

  return (
    <header className={`navbar${collapsed ? ' sidebar-collapsed' : ''}`}>
      <div className="navbar-left">
        {/* Mobile menu button */}
        <button className="navbar-btn" onClick={toggleMobile} style={{ display: 'none' }} id="mobile-menu-btn">
          <i className="bi bi-list" />
        </button>

        <div>
          <div className="page-title">{title}</div>
          {isDetail && (
            <div className="breadcrumb">
              <span
                style={{ cursor: 'pointer', color: 'var(--gray-400)' }}
                onClick={() => navigate(rootPath)}
              >
                {PAGE_TITLES[rootPath]}
              </span>
              <span>/</span>
              <span style={{ color: 'var(--black)', fontWeight: 500 }}>Detail</span>
            </div>
          )}
        </div>
      </div>

      <div className="navbar-right">
        <button className="navbar-btn" title="Notifications">
          <i className="bi bi-bell" />
          <span className="notif-badge" />
        </button>
        <button className="navbar-btn" title="Search (Ctrl+K)">
          <i className="bi bi-search" />
        </button>
        <button className="navbar-btn" title="Help">
          <i className="bi bi-question-circle" />
        </button>
        <button
          className="navbar-btn"
          title="Settings"
          onClick={() => navigate('/settings')}
        >
          <i className="bi bi-gear" />
        </button>
      </div>
    </header>
  );
}