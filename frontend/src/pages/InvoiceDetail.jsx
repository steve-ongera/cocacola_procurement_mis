// pages/InvoiceDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoicesAPI } from '../services/api';
import { StatusBadge, LoadingState, Amount, SectionCard, DetailField, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function InvoiceDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [inv, setInv]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);

  const fetch = () => {
    setLoading(true);
    invoicesAPI.get(slug).then(setInv).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [slug]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'approve') await invoicesAPI.approve(slug);
      if (confirm.action === 'dispute') await invoicesAPI.dispute(slug);
      toast.success('Invoice updated.');
      fetch();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  if (loading) return <PageWrapper><LoadingState /></PageWrapper>;
  if (!inv)    return <PageWrapper><p className="text-muted">Invoice not found.</p></PageWrapper>;

  const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && !['paid','cancelled'].includes(inv.status);
  const paidPct   = inv.total_amount > 0 ? Math.min(100, parseFloat(inv.amount_paid||0)/parseFloat(inv.total_amount)*100) : 0;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontFamily:'var(--font-mono)' }}>{inv.invoice_number}</h1>
          <p>{inv.supplier_name} · Issued {new Date(inv.invoice_date).toLocaleDateString()}</p>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={inv.status} />
          {isOverdue && <span className="badge badge-danger"><i className="bi bi-clock-history" /> Overdue</span>}
          {['received','matched'].includes(inv.status) && (
            <>
              <button className="btn btn-outline" style={{color:'var(--danger)',borderColor:'var(--danger)'}}
                onClick={() => setConfirm({ action:'dispute', label:'Mark this invoice as disputed?', danger:true })}>
                <i className="bi bi-exclamation-triangle" /> Dispute
              </button>
              <button className="btn btn-primary" onClick={() => setConfirm({ action:'approve', label:'Approve this invoice for payment?' })}>
                <i className="bi bi-check-lg" /> Approve for Payment
              </button>
            </>
          )}
          {['approved','partially_paid'].includes(inv.status) && (
            <button className="btn btn-primary" onClick={() => navigate(`/payments/new?from_invoice=${inv.slug}`)}>
              <i className="bi bi-credit-card" /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Payment progress */}
      <div style={{ background:'var(--white)', border:'1px solid var(--gray-200)', padding:'16px 20px', marginBottom:'24px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
          <span style={{ fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em' }}>
            Payment Progress
          </span>
          <span style={{ fontSize:'12px', fontFamily:'var(--font-mono)' }}>
            <span style={{fontWeight:700}}>KES {parseFloat(inv.amount_paid||0).toLocaleString()}</span>
            <span style={{color:'var(--gray-400)'}}> / KES {parseFloat(inv.total_amount).toLocaleString()}</span>
          </span>
        </div>
        <div className="progress" style={{height:'8px'}}>
          <div className="progress-bar" style={{ width:`${paidPct}%`, background:paidPct===100?'var(--success)':'var(--black)' }} />
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
        <SectionCard title="Invoice Summary">
          <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
            {[
              { label:'Sub Total',   value: inv.sub_total },
              { label:'VAT / Tax',   value: inv.tax_amount },
            ].map(r => (
              <div key={r.label} style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                <span className="text-muted">{r.label}</span>
                <Amount value={r.value} />
              </div>
            ))}
            <hr className="divider" style={{margin:'4px 0'}} />
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:'15px'}}>
              <span>Total</span>
              <Amount value={inv.total_amount} />
            </div>
            <hr className="divider" style={{margin:'4px 0'}} />
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',color:'var(--success)'}}>
              <span>Amount Paid</span>
              <span className="mono" style={{fontWeight:600}}>KES {parseFloat(inv.amount_paid||0).toLocaleString()}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',fontWeight:700,color:parseFloat(inv.balance||0)>0?'var(--danger)':'var(--success)'}}>
              <span>Balance</span>
              <Amount value={inv.balance} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Invoice Details">
          <DetailField label="Invoice No."    value={inv.invoice_number} mono />
          <DetailField label="Supplier"       value={inv.supplier_name} />
          <DetailField label="Invoice Date"   value={new Date(inv.invoice_date).toLocaleDateString()} />
          <DetailField label="Due Date"       value={
            <span style={{color:isOverdue?'var(--danger)':'inherit',fontWeight:isOverdue?700:400}}>
              {new Date(inv.due_date).toLocaleDateString()}{isOverdue?' ⚠':''}
            </span>
          } />
          <DetailField label="Currency"       value={inv.currency} />
          <hr className="divider" />
          <DetailField label="PO Reference"   value={inv.purchase_order_number
            ? <span className="link-text" style={{cursor:'pointer',textDecoration:'underline'}} onClick={() => navigate(`/purchase-orders/${inv.purchase_order_slug}`)}>{inv.purchase_order_number}</span>
            : '—'} />
          <DetailField label="GRN Reference"  value={inv.grn_number
            ? <span className="link-text" style={{cursor:'pointer',textDecoration:'underline'}} onClick={() => navigate(`/grns/${inv.grn_slug}`)}>{inv.grn_number}</span>
            : '—'} />
          <hr className="divider" />
          <DetailField label="Received By"    value={inv.received_by_name} />
          <DetailField label="Approved By"    value={inv.approved_by_name || '—'} />
        </SectionCard>
      </div>

      {inv.notes && (
        <SectionCard title="Notes" style={{marginTop:'20px'}}>
          <p style={{fontSize:'13px',color:'var(--gray-600)',lineHeight:1.7,margin:0}}>{inv.notes}</p>
        </SectionCard>
      )}

      {/* Payments linked */}
      {inv.payments?.length > 0 && (
        <SectionCard title="Payment History" noPad style={{marginTop:'20px'}}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Reference</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {inv.payments.map(p => (
                  <tr key={p.id}>
                    <td className="mono text-sm">{p.payment_reference}</td>
                    <td className="text-sm">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="text-sm">{p.payment_method?.replace('_',' ')}</td>
                    <td><Amount value={p.amount} /></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/payments/${p.slug}`)}><i className="bi bi-eye"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm" message={confirm?.label} loading={acting} danger={confirm?.danger} />
    </PageWrapper>
  );
}