// pages/GRN.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { grnsAPI } from '../services/api';
import { StatusBadge, LoadingState, EmptyState, Pagination, SectionCard, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function GRN() {
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
    grnsAPI.list({ page, search, status }).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [page, search, status]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'submit') await grnsAPI.submit(confirm.slug);
      if (confirm.action === 'verify') await grnsAPI.verify(confirm.slug);
      toast.success('GRN updated');
      fetchData();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); setConfirm(null); }
  };

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left"><h1>Goods Received Notes</h1><p>Record and verify deliveries from suppliers</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/grns/new')}><i className="bi bi-plus-lg" /> New GRN</button>
      </div>
      <div className="toolbar">
        <div className="search-box"><i className="bi bi-search" /><input placeholder="Search GRN, invoice, delivery note..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['draft','submitted','verified','rejected'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>
      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-box-seam" title="No GRNs found" action={<button className="btn btn-primary" onClick={()=>navigate('/grns/new')}><i className="bi bi-plus-lg"/>New GRN</button>} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>GRN Number</th><th>PO Number</th><th>Supplier</th><th>Delivery Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.results.map(g => (
                  <tr key={g.id}>
                    <td className="mono" style={{cursor:'pointer'}} onClick={()=>navigate(`/grns/${g.slug}`)}>{g.grn_number}</td>
                    <td className="mono text-sm">{g.po_number || '—'}</td>
                    <td style={{fontWeight:500}}>{g.supplier_name}</td>
                    <td className="mono text-sm">{new Date(g.delivery_date).toLocaleDateString()}</td>
                    <td><StatusBadge status={g.status} /></td>
                    <td>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/grns/${g.slug}`)}><i className="bi bi-eye"/></button>
                        {g.status==='draft' && <button className="btn btn-ghost btn-sm" title="Submit" onClick={()=>setConfirm({action:'submit',slug:g.slug,label:`Submit GRN ${g.grn_number}?`})}><i className="bi bi-send"/></button>}
                        {g.status==='submitted' && <button className="btn btn-ghost btn-sm" title="Verify" onClick={()=>setConfirm({action:'verify',slug:g.slug,label:`Verify and accept this delivery?`})}><i className="bi bi-check-lg"/></button>}
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