// pages/BudgetDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { budgetsAPI } from '../services/api';
import { StatusBadge, LoadingState, Amount, SectionCard, DetailField, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

const QUARTER_COLORS = { Q1: '#0a0a0a', Q2: '#4a4a4a', Q3: '#8a8a8a', Q4: '#c8c8c8' };

export default function BudgetDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [budget, setBudget]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);
  const [activeQ, setActiveQ] = useState(null);

  const fetch = () => {
    setLoading(true);
    budgetsAPI.get(slug).then(b => { setBudget(b); setActiveQ(b.quarters?.[0]?.quarter || 'Q1'); }).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [slug]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'submit')  await budgetsAPI.submit(slug);
      if (confirm.action === 'approve') await budgetsAPI.approve(slug);
      if (confirm.action === 'reject')  await budgetsAPI.reject(slug);
      toast.success(`Budget ${confirm.action}d.`);
      fetch();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  if (loading) return <PageWrapper><LoadingState /></PageWrapper>;
  if (!budget)  return <PageWrapper><p className="text-muted">Budget not found.</p></PageWrapper>;

  const qMap = {};
  (budget.quarters || []).forEach(q => { qMap[q.quarter] = q; });

  const totalPlanned = (budget.quarters || []).reduce((s, q) =>
    s + (q.line_items || []).reduce((ls, li) => ls + parseFloat(li.total_price || 0), 0), 0);

  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{budget.title}</h1>
          <p>{budget.fiscal_year_name} · {budget.department_name}</p>
        </div>
        <div className="page-header-actions">
          {budget.status === 'draft' && (
            <button className="btn btn-outline" onClick={() => navigate(`/budgets/${slug}/edit`)}>
              <i className="bi bi-pencil" /> Edit
            </button>
          )}
          {budget.status === 'draft' && (
            <button className="btn btn-primary" onClick={() => setConfirm({ action: 'submit', label: 'Submit this budget for approval?' })}>
              <i className="bi bi-send" /> Submit
            </button>
          )}
          {budget.status === 'submitted' && (
            <>
              <button className="btn btn-outline" onClick={() => setConfirm({ action: 'reject', label: 'Reject this budget?' })}>
                <i className="bi bi-x-lg" /> Reject
              </button>
              <button className="btn btn-primary" onClick={() => setConfirm({ action: 'approve', label: 'Approve this budget?' })}>
                <i className="bi bi-check-lg" /> Approve
              </button>
            </>
          )}
        </div>
      </div>

      {/* Overview cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Budget',    value: <Amount value={budget.total_amount} />, dark: true },
          { label: 'Total Planned',   value: <Amount value={totalPlanned} /> },
          { label: 'Utilization',     value: `${budget.utilization_percent || 0}%` },
          { label: 'Status',          value: <StatusBadge status={budget.status} /> },
        ].map(c => (
          <div key={c.label} className={`stat-card${c.dark ? ' dark' : ''}`}>
            <div className="stat-info">
              <div className="stat-label">{c.label}</div>
              <div style={{ marginTop: '6px', fontSize: '15px', fontWeight: 700 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Info panel */}
        <div>
          <SectionCard title="Budget Info">
            <DetailField label="Fiscal Year"   value={budget.fiscal_year_name} />
            <DetailField label="Department"    value={budget.department_name} />
            <DetailField label="Prepared By"   value={budget.prepared_by_name} />
            <DetailField label="Approved By"   value={budget.approved_by || '—'} />
            <DetailField label="Approved At"   value={budget.approved_at ? new Date(budget.approved_at).toLocaleDateString() : '—'} />
            <hr className="divider" />
            <DetailField label="Created"       value={new Date(budget.created_at).toLocaleDateString()} />
            {budget.notes && (
              <>
                <hr className="divider" />
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', lineHeight: 1.6 }}>{budget.notes}</p>
              </>
            )}
          </SectionCard>

          {/* Quarter allocation bar chart */}
          <SectionCard title="Quarter Allocation" >
            {(budget.quarters || []).map(q => {
              const pct = budget.total_amount > 0 ? (parseFloat(q.allocated_amount) / parseFloat(budget.total_amount)) * 100 : 0;
              return (
                <div key={q.quarter} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{q.quarter}</span>
                    <span className="text-xs mono"><Amount value={q.allocated_amount} /></span>
                  </div>
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${pct}%`, background: QUARTER_COLORS[q.quarter] }} />
                  </div>
                </div>
              );
            })}
          </SectionCard>
        </div>

        {/* Quarter line items */}
        <div>
          <SectionCard title="Quarterly Planned Items" noPad>
            <div className="tabs" style={{ padding: '0 20px' }}>
              {(budget.quarters || []).map(q => (
                <div key={q.quarter} className={`tab${activeQ === q.quarter ? ' active' : ''}`} onClick={() => setActiveQ(q.quarter)}>
                  {q.quarter}
                  <span className="tab-count">{q.line_items?.length || 0}</span>
                </div>
              ))}
            </div>
            {(budget.quarters || []).map(q => activeQ !== q.quarter ? null : (
              <div key={q.quarter}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: '24px' }}>
                  <span className="text-xs text-muted">{new Date(q.start_date).toLocaleDateString()} → {new Date(q.end_date).toLocaleDateString()}</span>
                  <span className="text-xs text-muted">Allocated: <strong><Amount value={q.allocated_amount} /></strong></span>
                </div>
                {q.line_items?.length === 0 ? (
                  <p className="text-muted text-sm text-center" style={{ padding: '24px' }}>No items planned for this quarter.</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr><th>Item</th><th>Category</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                      </thead>
                      <tbody>
                        {q.line_items.map(li => (
                          <tr key={li.id}>
                            <td style={{ fontWeight: 500 }}>{li.item_name}</td>
                            <td><span className="badge badge-default">{li.category || '—'}</span></td>
                            <td className="text-sm">{li.unit}</td>
                            <td className="mono text-sm">{parseFloat(li.quantity).toLocaleString()}</td>
                            <td><Amount value={li.unit_price} /></td>
                            <td><Amount value={li.total_price} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </SectionCard>
        </div>
      </div>

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm" message={confirm?.label} loading={acting}
        danger={confirm?.action === 'reject'}
      />
    </PageWrapper>
  );
}