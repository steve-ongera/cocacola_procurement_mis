// pages/PurchaseOrders.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrdersAPI } from '../services/api';
import { StatusBadge, LoadingState, EmptyState, Pagination, Amount, SectionCard, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function PurchaseOrders() {
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
    purchaseOrdersAPI.list({ page, search, status }).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [page, search, status]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'issue')       await purchaseOrdersAPI.issue(confirm.slug);
      if (confirm.action === 'acknowledge') await purchaseOrdersAPI.acknowledge(confirm.slug);
      if (confirm.action === 'cancel')      await purchaseOrdersAPI.cancel(confirm.slug);
      toast.success('PO updated');
      fetchData();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); setConfirm(null); }
  };

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left"><h1>Purchase Orders</h1><p>Issue and track orders to suppliers</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/purchase-orders/new')}><i className="bi bi-plus-lg" /> New PO</button>
      </div>
      <div className="toolbar">
        <div className="search-box"><i className="bi bi-search" /><input placeholder="Search PO number..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
        <select className="filter-select" value={status} onChange={e=>setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['draft','issued','acknowledged','partially_received','fully_received','cancelled','closed'].map(s=>(
            <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
          ))}
        </select>
      </div>
      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-receipt" title="No purchase orders" action={<button className="btn btn-primary" onClick={()=>navigate('/purchase-orders/new')}><i className="bi bi-plus-lg"/>New PO</button>} />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>PO Number</th><th>Supplier</th><th>Department</th><th>Total</th><th>Currency</th><th>Delivery Date</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.results.map(po => (
                  <tr key={po.id}>
                    <td className="mono" style={{cursor:'pointer'}} onClick={()=>navigate(`/purchase-orders/${po.slug}`)}>{po.po_number}</td>
                    <td style={{fontWeight:500}}>{po.supplier_name}</td>
                    <td className="text-sm">{po.department_name}</td>
                    <td><Amount value={po.total_amount} /></td>
                    <td className="mono text-sm">{po.currency}</td>
                    <td className="mono text-sm">{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '—'}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/purchase-orders/${po.slug}`)}><i className="bi bi-eye"/></button>
                        {po.status==='draft' && <button className="btn btn-ghost btn-sm" title="Issue" onClick={()=>setConfirm({action:'issue',slug:po.slug,label:`Issue PO ${po.po_number}?`})}><i className="bi bi-send"/></button>}
                        {po.status==='issued' && <button className="btn btn-ghost btn-sm" title="Mark Acknowledged" onClick={()=>setConfirm({action:'acknowledge',slug:po.slug,label:`Mark as acknowledged?`})}><i className="bi bi-check-lg"/></button>}
                        {['draft','issued'].includes(po.status) && <button className="btn btn-ghost btn-sm" title="Cancel" onClick={()=>setConfirm({action:'cancel',slug:po.slug,label:`Cancel PO ${po.po_number}?`})}><i className="bi bi-x-lg"/></button>}
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
      <ConfirmModal isOpen={!!confirm} onClose={()=>setConfirm(null)} onConfirm={handleAction} title="Confirm Action" message={confirm?.label} loading={acting} danger={confirm?.action==='cancel'} />
    </PageWrapper>
  );
}