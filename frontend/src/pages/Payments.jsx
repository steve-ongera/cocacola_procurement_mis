// pages/Payments.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsAPI } from '../services/api';
import { StatusBadge, LoadingState, EmptyState, Pagination, Amount, SectionCard, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function Payments() {
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
    paymentsAPI.list({ page, search, status }).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [page, search, status]);

  const handleApprove = async () => {
    setActing(true);
    try {
      await paymentsAPI.approve(confirm.slug);
      toast.success('Payment approved');
      fetchData();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); setConfirm(null); }
  };

  const METHOD_ICONS = {
    bank_transfer: 'bi-bank',
    cheque: 'bi-file-text',
    mobile_money: 'bi-phone',
    cash: 'bi-cash',
  };

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left"><h1>Payments</h1><p>Track and approve supplier payments</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/payments/new')}><i className="bi bi-plus-lg" /> Record Payment</button>
      </div>
      <div className="toolbar">
        <div className="search-box"><i className="bi bi-search" /><input placeholder="Search payment ref..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['pending','processing','completed','failed','reversed'].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>
      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-credit-card" title="No payments found" action={<button className="btn btn-primary" onClick={()=>navigate('/payments/new')}><i className="bi bi-plus-lg"/>Record Payment</button>} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Reference</th><th>Supplier</th><th>Amount</th><th>Method</th><th>Payment Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.results.map(p => (
                  <tr key={p.id}>
                    <td className="mono" style={{cursor:'pointer'}} onClick={()=>navigate(`/payments/${p.slug}`)}>{p.payment_reference}</td>
                    <td style={{fontWeight:500}}>{p.supplier_name}</td>
                    <td><Amount value={p.amount} currency={p.currency} /></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        <i className={`bi ${METHOD_ICONS[p.payment_method] || 'bi-credit-card'}`} style={{color:'var(--gray-400)'}}/>
                        <span className="text-sm">{p.payment_method?.replace(/_/g,' ')}</span>
                      </div>
                    </td>
                    <td className="mono text-sm">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/payments/${p.slug}`)}><i className="bi bi-eye"/></button>
                        {p.status === 'pending' && <button className="btn btn-ghost btn-sm" title="Approve" onClick={()=>setConfirm({slug:p.slug,label:`Approve payment ${p.payment_reference}?`})}><i className="bi bi-check-lg"/></button>}
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
      <ConfirmModal isOpen={!!confirm} onClose={()=>setConfirm(null)} onConfirm={handleApprove} title="Approve Payment" message={confirm?.label} loading={acting} />
    </PageWrapper>
  );
}