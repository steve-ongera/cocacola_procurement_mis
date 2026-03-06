// pages/AuditLog.jsx
import { useState, useEffect } from 'react';
import { auditLogsAPI } from '../services/api';
import { LoadingState, EmptyState, Pagination, SectionCard, PageWrapper } from '../components/common';

const ACTION_COLORS = {
  create:  'badge-success',
  update:  'badge-info',
  delete:  'badge-danger',
  approve: 'badge-black',
  reject:  'badge-danger',
  submit:  'badge-default',
};

export default function AuditLog() {
  const [data, setData]       = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [action, setAction]   = useState('');

  useEffect(() => {
    setLoading(true);
    auditLogsAPI.list({ page, search, action }).then(setData).finally(() => setLoading(false));
  }, [page, search, action]);

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left"><h1>Audit Log</h1><p>Full trail of all system actions</p></div>
      </div>
      <div className="toolbar">
        <div className="search-box"><i className="bi bi-search" /><input placeholder="Search model or object..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={action} onChange={e=>setAction(e.target.value)}>
          <option value="">All Actions</option>
          {['create','update','delete','approve','reject','submit'].map(a=><option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)}</option>)}
        </select>
      </div>
      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-clock-history" title="No audit records" />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Model</th><th>Object</th><th>IP</th></tr></thead>
              <tbody>
                {data.results.map(log => (
                  <tr key={log.id}>
                    <td className="mono text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                    <td style={{fontWeight:500}}>{log.user_name}</td>
                    <td><span className={`badge ${ACTION_COLORS[log.action] || 'badge-default'}`}>{log.action}</span></td>
                    <td className="text-sm">{log.model_name}</td>
                    <td className="text-sm text-muted" style={{maxWidth:'260px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{log.object_repr}</td>
                    <td className="mono text-sm text-muted">{log.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.count > 20 && <div style={{padding:'0 20px'}}><Pagination count={data.count} page={page} onChange={setPage} /></div>}
      </SectionCard>
    </PageWrapper>
  );
}