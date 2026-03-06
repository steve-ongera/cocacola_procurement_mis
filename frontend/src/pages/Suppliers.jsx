// pages/Suppliers.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { suppliersAPI } from '../services/api';
import { StatusBadge, LoadingState, EmptyState, Pagination, SectionCard, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function Suppliers() {
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
    suppliersAPI.list({ page, search, status }).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [page, search, status]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'activate')  await suppliersAPI.activate(confirm.slug);
      if (confirm.action === 'blacklist') await suppliersAPI.blacklist(confirm.slug);
      toast.success('Supplier updated');
      fetchData();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); setConfirm(null); }
  };

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left"><h1>Suppliers</h1><p>Manage vendor registry and qualifications</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/suppliers/new')}><i className="bi bi-plus-lg" /> New Supplier</button>
      </div>
      <div className="toolbar">
        <div className="search-box"><i className="bi bi-search" /><input placeholder="Search suppliers..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['active','inactive','blacklisted','pending'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>
      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-building" title="No suppliers" description="Register your first supplier."
            action={<button className="btn btn-primary" onClick={()=>navigate('/suppliers/new')}><i className="bi bi-plus-lg"/>Add Supplier</button>}
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Supplier</th><th>Category</th><th>Email</th><th>Phone</th><th>City</th><th>Rating</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.results.map(s => (
                  <tr key={s.id}>
                    <td style={{fontWeight:500,cursor:'pointer'}} onClick={()=>navigate(`/suppliers/${s.slug}`)}>{s.name}</td>
                    <td className="text-sm">{s.category}</td>
                    <td className="text-sm">{s.email}</td>
                    <td className="mono text-sm">{s.phone}</td>
                    <td className="text-sm">{s.city}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                        <i className="bi bi-star-fill" style={{fontSize:'10px',color:'var(--warning)'}} />
                        <span className="mono text-sm">{s.rating}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/suppliers/${s.slug}`)}><i className="bi bi-eye"/></button>
                        {s.status !== 'active' && <button className="btn btn-ghost btn-sm" title="Activate" onClick={()=>setConfirm({action:'activate',slug:s.slug,label:`Activate ${s.name}?`})}><i className="bi bi-check-lg"/></button>}
                        {s.status !== 'blacklisted' && <button className="btn btn-ghost btn-sm" title="Blacklist" onClick={()=>setConfirm({action:'blacklist',slug:s.slug,label:`Blacklist ${s.name}?`})}><i className="bi bi-slash-circle"/></button>}
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
      <ConfirmModal isOpen={!!confirm} onClose={()=>setConfirm(null)} onConfirm={handleAction} title="Confirm" message={confirm?.label} loading={acting} danger={confirm?.action==='blacklist'} />
    </PageWrapper>
  );
}