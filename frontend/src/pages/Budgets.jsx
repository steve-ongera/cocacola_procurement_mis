// pages/Budgets.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetsAPI } from '../services/api';
import {
  StatusBadge, LoadingState, EmptyState, Pagination,
  Amount, SectionCard, PageWrapper, ConfirmModal
} from '../components/common';
import { useToast } from '../context/AppContext';

export default function Budgets() {
  const navigate = useNavigate();
  const toast    = useToast();

  const [data, setData]       = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);

  const fetchData = () => {
    setLoading(true);
    budgetsAPI.list({ page, search, status }).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, search, status]);

  const handleAction = async () => {
    setActing(true);
    try {
      const { action, slug } = confirm;
      if (action === 'submit')  await budgetsAPI.submit(slug);
      if (action === 'approve') await budgetsAPI.approve(slug);
      if (action === 'reject')  await budgetsAPI.reject(slug);
      toast.success(`Budget ${action}d`);
      fetchData();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); setConfirm(null); }
  };

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Budgets</h1>
          <p>Annual procurement budgets broken into quarters</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/budgets/new')}>
          <i className="bi bi-plus-lg" /> New Budget
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="bi bi-search" />
          <input placeholder="Search budgets..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['draft','submitted','approved','rejected'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
      </div>

      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-wallet2" title="No budgets" description="Create annual budgets to plan procurement spend."
            action={<button className="btn btn-primary" onClick={() => navigate('/budgets/new')}><i className="bi bi-plus-lg" /> Create Budget</button>}
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Fiscal Year</th>
                  <th>Department</th>
                  <th>Total Amount</th>
                  <th>Utilization</th>
                  <th>Status</th>
                  <th>Prepared By</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.results.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>
                      <span style={{ cursor: 'pointer' }} onClick={() => navigate(`/budgets/${b.slug}`)}>
                        {b.title}
                      </span>
                    </td>
                    <td className="mono text-sm">{b.fiscal_year_name}</td>
                    <td className="text-sm">{b.department_name}</td>
                    <td><Amount value={b.total_amount} /></td>
                    <td>
                      <div style={{ width: '80px' }}>
                        <div className="progress" style={{ marginBottom: '3px' }}>
                          <div className="progress-bar" style={{ width: `${Math.min(b.utilization_percent || 0, 100)}%` }} />
                        </div>
                        <span className="text-xs text-muted">{b.utilization_percent || 0}%</span>
                      </div>
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="text-sm text-muted">{b.prepared_by_name}</td>
                    <td className="mono text-sm">{new Date(b.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/budgets/${b.slug}`)}>
                          <i className="bi bi-eye" />
                        </button>
                        {b.status === 'draft' && (
                          <button className="btn btn-ghost btn-sm" title="Submit"
                            onClick={() => setConfirm({ action: 'submit', slug: b.slug, label: `Submit "${b.title}" for approval?` })}>
                            <i className="bi bi-send" />
                          </button>
                        )}
                        {b.status === 'submitted' && (
                          <>
                            <button className="btn btn-ghost btn-sm" title="Approve"
                              onClick={() => setConfirm({ action: 'approve', slug: b.slug, label: `Approve "${b.title}"?` })}>
                              <i className="bi bi-check-lg" />
                            </button>
                            <button className="btn btn-ghost btn-sm" title="Reject"
                              onClick={() => setConfirm({ action: 'reject', slug: b.slug, label: `Reject "${b.title}"?` })}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.count > 20 && (
          <div style={{ padding: '0 20px' }}>
            <Pagination count={data.count} page={page} onChange={setPage} />
          </div>
        )}
      </SectionCard>

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm" message={confirm?.label} loading={acting}
        danger={confirm?.action === 'reject'}
      />
    </PageWrapper>
  );
}