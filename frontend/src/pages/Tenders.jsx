// pages/Tenders.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tendersAPI } from '../services/api';
import { StatusBadge, LoadingState, EmptyState, Pagination, Amount, SectionCard, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function Tenders() {
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
    tendersAPI.list({ page, search, status }).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [page, search, status]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'publish') await tendersAPI.publish(confirm.slug);
      toast.success('Tender published');
      fetchData();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); setConfirm(null); }
  };

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left"><h1>Tenders</h1><p>Manage competitive procurement processes</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/tenders/new')}><i className="bi bi-plus-lg" /> New Tender</button>
      </div>
      <div className="toolbar">
        <div className="search-box"><i className="bi bi-search" /><input placeholder="Search tenders..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['draft','published','evaluation','awarded','cancelled','closed'].map(s=>(
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
      </div>
      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-megaphone" title="No tenders" action={<button className="btn btn-primary" onClick={()=>navigate('/tenders/new')}><i className="bi bi-plus-lg"/>New Tender</button>} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Reference</th><th>Title</th><th>Type</th><th>Department</th><th>Budget</th><th>Closing Date</th><th>Bids</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.results.map(t => (
                  <tr key={t.id}>
                    <td className="mono text-sm" style={{cursor:'pointer'}} onClick={()=>navigate(`/tenders/${t.slug}`)}>{t.reference_number}</td>
                    <td style={{fontWeight:500,maxWidth:'180px'}}><span style={{cursor:'pointer'}} onClick={()=>navigate(`/tenders/${t.slug}`)}>{t.title}</span></td>
                    <td><span className="badge badge-default">{t.tender_type?.replace(/_/g,' ')}</span></td>
                    <td className="text-sm">{t.department_name}</td>
                    <td><Amount value={t.budget} /></td>
                    <td className="mono text-sm">{t.closing_date ? new Date(t.closing_date).toLocaleDateString() : '—'}</td>
                    <td className="mono text-sm text-center">{t.bid_count || 0}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/tenders/${t.slug}`)}><i className="bi bi-eye"/></button>
                        {t.status==='draft' && <button className="btn btn-ghost btn-sm" title="Publish" onClick={()=>setConfirm({action:'publish',slug:t.slug,label:`Publish tender "${t.title}"?`})}><i className="bi bi-megaphone"/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.count > 20 && <div style={{padding:'0 20px'}}><Pagination count={data.count} page={page} onChange={setPage} /></div>}
      </SectionCard>
      <ConfirmModal isOpen={!!confirm} onClose={()=>setConfirm(null)} onConfirm={handleAction} title="Confirm" message={confirm?.label} loading={acting} />
    </PageWrapper>
  );
}