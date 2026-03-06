// pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { StatCard, LoadingState, Amount, SectionCard, StatusBadge, PageWrapper } from '../components/common';
import { useAuth } from '../context/AppContext';

export default function Dashboard() {
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const [stats, setStats]         = useState(null);
  const [activity, setActivity]   = useState([]);
  const [utilization, setUtil]    = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.stats(),
      dashboardAPI.recentActivity(),
      dashboardAPI.budgetUtilization(),
    ]).then(([s, a, u]) => {
      setStats(s);
      setActivity(a);
      setUtil(u);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageWrapper><LoadingState message="Loading dashboard..." /></PageWrapper>;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <PageWrapper>
      {/* Welcome */}
      <div className="mb-24">
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {greeting()}, {user?.first_name || user?.username} 👋
        </h1>
        <p className="text-muted text-sm mt-4">
          Here's what's happening in procurement today · {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="stat-grid">
            <StatCard label="Total Budgets"        value={stats.total_budgets}         icon="bi-wallet2"               dark />
            <StatCard label="Pending Requisitions" value={stats.pending_requisitions}  icon="bi-file-earmark-text"     />
            <StatCard label="Emergency Requests"   value={stats.emergency_requisitions}icon="bi-exclamation-octagon"   />
            <StatCard label="Open POs"             value={stats.open_purchase_orders}  icon="bi-receipt"               />
          </div>
          <div className="stat-grid">
            <StatCard label="Active Tenders"   value={stats.active_tenders}    icon="bi-megaphone"         />
            <StatCard label="Active Suppliers" value={stats.active_suppliers}  icon="bi-building"          />
            <StatCard label="Pending Invoices" value={stats.pending_invoices}  icon="bi-file-earmark-ruled" />
            <StatCard label="Overdue Invoices" value={stats.overdue_invoices}  icon="bi-calendar-x"        dark />
          </div>
          <div className="stat-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="stat-card">
              <div className="stat-info">
                <div className="stat-label">Total Payments Processed</div>
                <div className="stat-value" style={{ fontSize: '22px' }}>
                  <Amount value={stats.total_payments} />
                </div>
              </div>
              <i className="bi bi-credit-card stat-icon" />
            </div>
          </div>
        </>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Budget Utilization */}
        <SectionCard
          title="Budget Utilization"
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/budgets')}>
              View All <i className="bi bi-arrow-right" />
            </button>
          }
        >
          {utilization.length === 0 ? (
            <p className="text-muted text-sm text-center" style={{ padding: '20px 0' }}>No approved budgets</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {utilization.slice(0, 5).map(b => (
                <div key={b.budget_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{b.title}</span>
                    <span className="text-mono text-xs">{b.utilization_percent}%</span>
                  </div>
                  <div className="progress">
                    <div
                      className={`progress-bar${b.utilization_percent > 90 ? ' danger' : b.utilization_percent > 70 ? ' warning' : ''}`}
                      style={{ width: `${Math.min(b.utilization_percent, 100)}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span className="text-xs text-muted">{b.department}</span>
                    <span className="text-xs text-muted">
                      <Amount value={b.spent} /> / <Amount value={b.total_amount} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard
          title="Recent Activity"
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/audit-log')}>
              View All <i className="bi bi-arrow-right" />
            </button>
          }
        >
          {activity.length === 0 ? (
            <p className="text-muted text-sm text-center" style={{ padding: '20px 0' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {activity.slice(0, 8).map(log => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    padding: '10px 0', borderBottom: '1px solid var(--gray-100)'
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', background: 'var(--gray-100)',
                    display: 'grid', placeItems: 'center', flexShrink: 0
                  }}>
                    <i className={`bi ${
                      log.action === 'create'  ? 'bi-plus-lg' :
                      log.action === 'approve' ? 'bi-check-lg' :
                      log.action === 'reject'  ? 'bi-x-lg' :
                      log.action === 'submit'  ? 'bi-send' :
                      'bi-pencil'
                    }`} style={{ fontSize: '11px', color: 'var(--gray-500)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--black)' }}>
                      {log.user_name} <span style={{ fontWeight: 400, color: 'var(--gray-500)' }}>{log.action}d</span> {log.model_name}
                    </div>
                    <div className="text-xs text-muted mt-4">{log.object_repr}</div>
                  </div>
                  <div className="text-xs text-muted" style={{ flexShrink: 0 }}>
                    {new Date(log.timestamp).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quick Actions */}
      <SectionCard title="Quick Actions" noPad>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1px', background: 'var(--gray-200)' }}>
          {[
            { label: 'New Requisition',   icon: 'bi-file-earmark-plus', path: '/requisitions/new',  desc: 'Create a request' },
            { label: 'Emergency Request', icon: 'bi-exclamation-octagon',path: '/requisitions/new?type=emergency', desc: 'Urgent procurement' },
            { label: 'New Supplier',      icon: 'bi-building-add',      path: '/suppliers/new',     desc: 'Register vendor' },
            { label: 'New Tender',        icon: 'bi-megaphone',         path: '/tenders/new',       desc: 'Publish tender' },
            { label: 'New PO',            icon: 'bi-receipt',           path: '/purchase-orders/new',desc: 'Issue order' },
            { label: 'Receive Goods',     icon: 'bi-box-seam',          path: '/grns/new',          desc: 'Record GRN' },
          ].map(action => (
            <div
              key={action.path}
              onClick={() => navigate(action.path)}
              style={{
                background: 'var(--white)', padding: '20px', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--white)'}
            >
              <i className={`bi ${action.icon}`} style={{ fontSize: '22px', display: 'block', marginBottom: '8px' }} />
              <div style={{ fontSize: '12px', fontWeight: 600 }}>{action.label}</div>
              <div className="text-xs text-muted mt-4">{action.desc}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </PageWrapper>
  );
}