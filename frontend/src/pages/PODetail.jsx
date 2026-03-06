// pages/PODetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchaseOrdersAPI } from '../services/api';
import { StatusBadge, LoadingState, Amount, SectionCard, DetailField, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function PODetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [po, setPO]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);

  const fetch = () => {
    setLoading(true);
    purchaseOrdersAPI.get(slug).then(setPO).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [slug]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'issue')       await purchaseOrdersAPI.issue(slug);
      if (confirm.action === 'acknowledge') await purchaseOrdersAPI.acknowledge(slug);
      if (confirm.action === 'cancel')      await purchaseOrdersAPI.cancel(slug);
      toast.success('Action completed.');
      fetch();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  if (loading) return <PageWrapper><LoadingState /></PageWrapper>;
  if (!po)    return <PageWrapper><p className="text-muted">Purchase Order not found.</p></PageWrapper>;

  const receivedPct = po.sub_total > 0
    ? Math.min(100, (po.line_items || []).reduce((s,li) => s + (parseFloat(li.quantity_received||0)*parseFloat(li.unit_price||0)), 0) / parseFloat(po.sub_total) * 100)
    : 0;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontFamily: 'var(--font-mono)' }}>{po.po_number}</h1>
          <p>{po.supplier_name} · {po.department_name}</p>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={po.status} />
          {po.status === 'draft' && (
            <>
              <button className="btn btn-outline" onClick={() => navigate(`/purchase-orders/${slug}/edit`)}><i className="bi bi-pencil" /> Edit</button>
              <button className="btn btn-primary" onClick={() => setConfirm({ action:'issue', label:'Issue this PO to the supplier?' })}>
                <i className="bi bi-send" /> Issue PO
              </button>
            </>
          )}
          {po.status === 'issued' && (
            <button className="btn btn-primary" onClick={() => setConfirm({ action:'acknowledge', label:'Mark this PO as acknowledged by supplier?' })}>
              <i className="bi bi-check2" /> Mark Acknowledged
            </button>
          )}
          {['issued','acknowledged'].includes(po.status) && (
            <button className="btn btn-outline" style={{color:'var(--danger)',borderColor:'var(--danger)'}}
              onClick={() => setConfirm({ action:'cancel', label:'Cancel this Purchase Order?', danger:true })}>
              <i className="bi bi-x-lg" /> Cancel
            </button>
          )}
          {['acknowledged','partially_received','fully_received'].includes(po.status) && (
            <button className="btn btn-outline" onClick={() => navigate(`/grns/new?from_po=${po.slug}`)}>
              <i className="bi bi-truck" /> Record Delivery (GRN)
            </button>
          )}
        </div>
      </div>

      {/* Delivery progress */}
      <div style={{ background:'var(--white)', border:'1px solid var(--gray-200)', padding:'16px 20px', marginBottom:'24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
          <span style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>Delivery Progress</span>
          <span style={{ fontSize:'12px', fontFamily:'var(--font-mono)', fontWeight:700 }}>{receivedPct.toFixed(0)}%</span>
        </div>
        <div className="progress" style={{ height:'8px' }}>
          <div className="progress-bar" style={{ width:`${receivedPct}%`, background: receivedPct===100?'var(--success)':'var(--black)' }} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        <div>
          {/* Line items */}
          <SectionCard title={`Line Items (${po.line_items?.length || 0})`} noPad>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Item</th><th>Unit</th><th>Ordered</th><th>Unit Price</th><th>Total</th><th>Received</th><th>Outstanding</th></tr>
                </thead>
                <tbody>
                  {(po.line_items || []).map(li => {
                    const outstanding = parseFloat(li.quantity) - parseFloat(li.quantity_received||0);
                    return (
                      <tr key={li.id}>
                        <td style={{fontWeight:500}}>{li.item_name}</td>
                        <td className="text-sm">{li.unit}</td>
                        <td className="mono text-sm">{parseFloat(li.quantity).toLocaleString()}</td>
                        <td><Amount value={li.unit_price} /></td>
                        <td><Amount value={li.total_price} /></td>
                        <td className="mono text-sm">{parseFloat(li.quantity_received||0).toLocaleString()}</td>
                        <td className="mono text-sm" style={{color:outstanding>0?'var(--warning)':'var(--success)',fontWeight:600}}>
                          {outstanding > 0 ? outstanding.toLocaleString() : '✓'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'var(--gray-50)'}}>
                    <td colSpan={4} style={{padding:'12px 16px',textAlign:'right',fontWeight:700,fontSize:'12px'}}>SUB TOTAL</td>
                    <td style={{padding:'12px 16px'}}><Amount value={po.sub_total} /></td>
                    <td colSpan={2} />
                  </tr>
                  <tr style={{background:'var(--gray-50)'}}>
                    <td colSpan={4} style={{padding:'8px 16px',textAlign:'right',fontSize:'12px',color:'var(--gray-500)'}}>VAT ({po.tax_rate}%)</td>
                    <td style={{padding:'8px 16px'}}><Amount value={po.tax_amount} /></td>
                    <td colSpan={2} />
                  </tr>
                  <tr style={{background:'var(--gray-50)'}}>
                    <td colSpan={4} style={{padding:'12px 16px',textAlign:'right',fontWeight:900,fontSize:'13px'}}>TOTAL</td>
                    <td style={{padding:'12px 16px'}}><Amount value={po.total_amount} /></td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>

          {po.notes && (
            <SectionCard title="Notes">
              <p style={{fontSize:'13px',color:'var(--gray-600)',lineHeight:1.7,margin:0}}>{po.notes}</p>
            </SectionCard>
          )}
        </div>

        <div>
          <SectionCard title="PO Information">
            <DetailField label="PO Number"      value={po.po_number} mono />
            <DetailField label="Supplier"       value={po.supplier_name} />
            <DetailField label="Department"     value={po.department_name} />
            <DetailField label="Currency"       value={po.currency} />
            <DetailField label="Payment Terms"  value={po.payment_terms} />
            <DetailField label="Delivery Date"  value={po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '—'} />
            <DetailField label="Delivery To"    value={po.delivery_address || '—'} />
            <hr className="divider" />
            <DetailField label="Issued By"      value={po.issued_by_name || '—'} />
            <DetailField label="Issued At"      value={po.issued_at ? new Date(po.issued_at).toLocaleDateString() : '—'} />
            <DetailField label="Created"        value={new Date(po.created_at).toLocaleDateString()} />
          </SectionCard>

          {(po.grns?.length > 0) && (
            <SectionCard title="Linked GRNs">
              {po.grns.map(grn => (
                <div key={grn.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--gray-100)'}}>
                  <span className="mono text-sm">{grn.grn_number}</span>
                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                    <StatusBadge status={grn.status} />
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/grns/${grn.slug}`)}><i className="bi bi-eye" /></button>
                  </div>
                </div>
              ))}
            </SectionCard>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm" message={confirm?.label} loading={acting} danger={confirm?.danger} />
    </PageWrapper>
  );
}