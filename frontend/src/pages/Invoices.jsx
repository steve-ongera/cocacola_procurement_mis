// pages/Invoices.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../services/api';
import { StatusBadge, LoadingState, EmptyState, Pagination, Amount, SectionCard, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function Invoices() {
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
    invoicesAPI.list({ page, search, status }).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [page, search, status]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'approve') await invoicesAPI.approve(confirm.slug);
      if (confirm.action === 'dispute') await invoicesAPI.dispute(confirm.slug, 'Disputed by reviewer');
      toast.success('Invoice updated');
      fetchData();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); setConfirm(null); }
  };

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left"><h1>Invoices</h1><p>Supplier invoices and payment approvals</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}><i className="bi bi-plus-lg" /> Record Invoice</button>
      </div>
      <div className="toolbar">
        <div className="search-box"><i className="bi bi-search" /><input placeholder="Search invoice number..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['received','matched','approved','partially_paid','paid','disputed','cancelled'].map(s=>(
            <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
          ))}
        </select>
      </div>
      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-file-earmark-ruled" title="No invoices" action={<button className="btn btn-primary" onClick={()=>navigate('/invoices/new')}><i className="bi bi-plus-lg"/>Record Invoice</button>} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Invoice #</th><th>Supplier</th><th>Invoice Date</th><th>Due Date</th><th>Total</th><th>Balance</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.results.map(inv => {
                  const isOverdue = new Date(inv.due_date) < new Date() && !['paid','cancelled'].includes(inv.status);
                  return (
                    <tr key={inv.id}>
                      <td className="mono" style={{cursor:'pointer'}} onClick={()=>navigate(`/invoices/${inv.slug}`)}>{inv.invoice_number}</td>
                      <td style={{fontWeight:500}}>{inv.supplier_name}</td>
                      <td className="mono text-sm">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                      <td className="mono text-sm" style={{color: isOverdue ? 'var(--danger)' : 'inherit'}}>
                        {new Date(inv.due_date).toLocaleDateString()}
                        {isOverdue && <i className="bi bi-exclamation-circle ms-1" title="Overdue" style={{marginLeft:'4px'}}/>}
                      </td>
                      <td><Amount value={inv.total_amount} /></td>
                      <td><Amount value={inv.balance} /></td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td>
                        <div style={{display:'flex',gap:'4px'}}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/invoices/${inv.slug}`)}><i className="bi bi-eye"/></button>
                          {['received','matched'].includes(inv.status) && (
                            <>
                              <button className="btn btn-ghost btn-sm" title="Approve for Payment" onClick={()=>setConfirm({action:'approve',slug:inv.slug,label:`Approve invoice ${inv.invoice_number} for payment?`})}><i className="bi bi-check-lg"/></button>
                              <button className="btn btn-ghost btn-sm" title="Dispute" onClick={()=>setConfirm({action:'dispute',slug:inv.slug,label:`Dispute invoice ${inv.invoice_number}?`})}><i className="bi bi-flag"/></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data.count > 20 && <div style={{padding:'0 20px'}}><Pagination count={data.count} page={page} onChange={setPage} /></div>}
      </SectionCard>
      <ConfirmModal isOpen={!!confirm} onClose={()=>setConfirm(null)} onConfirm={handleAction} title="Confirm" message={confirm?.label} loading={acting} danger={confirm?.action==='dispute'} />
    </PageWrapper>
  );
}