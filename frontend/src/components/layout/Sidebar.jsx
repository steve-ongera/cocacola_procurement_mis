// components/layout/Sidebar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useSidebar } from '../../context/AppContext';

const NAV = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard',     icon: 'bi-grid-1x2',      path: '/' },
    ],
  },
  {
    section: 'Planning',
    items: [
      { label: 'Fiscal Years',  icon: 'bi-calendar3',     path: '/fiscal-years' },
      { label: 'Budgets',       icon: 'bi-wallet2',        path: '/budgets' },
    ],
  },
  {
    section: 'Procurement',
    items: [
      { label: 'Requisitions',  icon: 'bi-file-earmark-text', path: '/requisitions', badgeKey: 'pending_requisitions' },
      { label: 'Tenders',       icon: 'bi-megaphone',      path: '/tenders' },
      { label: 'Purchase Orders', icon: 'bi-receipt',      path: '/purchase-orders' },
      { label: 'GRN',           icon: 'bi-box-seam',       path: '/grns' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { label: 'Invoices',      icon: 'bi-file-earmark-ruled', path: '/invoices', badgeKey: 'pending_invoices' },
      { label: 'Payments',      icon: 'bi-credit-card',    path: '/payments' },
    ],
  },
  {
    section: 'Master Data',
    items: [
      { label: 'Suppliers',     icon: 'bi-building',       path: '/suppliers' },
      { label: 'Departments',   icon: 'bi-diagram-3',      path: '/departments' },
      { label: 'Users',         icon: 'bi-people',         path: '/users' },
    ],
  },
  {
    section: 'System',
    items: [
      { label: 'Audit Log',     icon: 'bi-clock-history',  path: '/audit-log' },
    ],
  },
];

export default function Sidebar({ badges = {} }) {
  const { user, logout }            = useAuth();
  const { collapsed, mobileOpen, toggle, closeMobile } = useSidebar();
  const navigate  = useNavigate();
  const location  = useLocation();

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleNav = (path) => {
    navigate(path);
    closeMobile();
  };

  const initials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase()
    : '?';

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 999, display: 'none'
          }}
          className="mobile-overlay"
        />
      )}

      <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>

        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">PP</div>
            <span className="logo-text">ProcurePro</span>
          </div>
          <button className="sidebar-toggle" onClick={toggle} title={collapsed ? 'Expand' : 'Collapse'}>
            <i className={`bi ${collapsed ? 'bi-layout-sidebar' : 'bi-layout-sidebar-inset'}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV.map((section) => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map((item) => {
                const badgeCount = item.badgeKey ? badges[item.badgeKey] : null;
                return (
                  <div
                    key={item.path}
                    className={`nav-item${isActive(item.path) ? ' active' : ''}`}
                    onClick={() => handleNav(item.path)}
                    data-tooltip={item.label}
                  >
                    <i className={`bi ${item.icon} nav-icon`} />
                    <span className="nav-label">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="nav-badge">{badgeCount}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.get_full_name || `${user?.first_name} ${user?.last_name}`.trim() || user?.username}</div>
              <div className="user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          {!collapsed && (
            <button
              className="btn btn-ghost btn-sm w-full mt-8"
              style={{ justifyContent: 'flex-start', gap: '8px' }}
              onClick={logout}
            >
              <i className="bi bi-box-arrow-right" /> Sign Out
            </button>
          )}
        </div>
      </aside>
    </>
  );
}