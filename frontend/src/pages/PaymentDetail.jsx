// pages/PaymentDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentsAPI } from '../services/api';
import { StatusBadge, LoadingState, Amount, SectionCard, DetailField, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

const METHOD_ICONS = { bank_transfer:'bi-bank', cheque:'bi-file-text', mobile_money:'bi-phone', cash:'bi-cash-stack' };

export default function PaymentDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);

  const fetch = () => {
    setLoading(true);
    paymentsAPI.get(slug).then(setPayment).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [slug]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'approve') await paymentsAPI.approve(slug);
      if (confirm.action === 'fail')    await paymentsAPI.fail(slug);
      if (confirm.action === 'reverse') await paymentsAPI.reverse(slug);
      toast.success('Payment updated.');
      fetch();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  if (loading) return <PageWrapper><LoadingState /></PageWrapper>;
  if (!payment) return <PageWrapper><p className="text-muted">Payment not found.</p></PageWrapper>;

  const icon = METHOD_ICONS[payment.payment_method] || 'bi-credit-card';

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontFamily:'var(--font-mono)' }}>{payment.payment_reference}</h1>
          <p>{payment.supplier_name} · {new Date(payment.payment_date).toLocaleDateString()}</p>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={payment.status} />
          {['pending','processing'].includes(payment.status) && (
            <>
              <button className="btn btn-primary" onClick={() => setConfirm({ action:'approve', label:'Approve and complete this payment?' })}>
                <i className="bi bi-check-lg" /> Approve Payment
              </button>
              <button className="btn btn-outline" style={{color:'var(--danger)',borderColor:'var(--danger)'}}
                onClick={() => setConfirm({ action:'fail', label:'Mark this payment as failed?', danger:true })}>
                <i className="bi bi-x-lg" /> Mark Failed
              </button>
            </>
          )}
          {payment.status === 'completed' && (
            <button className="btn btn-outline" style={{color:'var(--danger)',borderColor:'var(--danger)'}}
              onClick={() => setConfirm({ action:'reverse', label:'Reverse this payment? This action cannot be undone.', danger:true })}>
              <i className="bi bi-arrow-counterclockwise" /> Reverse
            </button>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
        {/* Amount card */}
        <div className="stat-card dark" style={{ padding:'28px', display:'flex', flexDirection:'column', gap:'6px' }}>
          <div style={{ fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.08em', opacity:0.6 }}>Payment Amount</div>
          <div style={{ fontSize:'28px', fontFamily:'var(--font-mono)', fontWeight:900 }}>
            {payment.currency} {parseFloat(payment.amount).toLocaleString(undefined,{minimumFractionDigits:2})}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'8px', opacity:0.8 }}>
            <i className={`bi ${icon}`} style={{fontSize:'16px'}} />
            <span style={{fontSize:'12px'}}>{payment.payment_method?.replace('_',' ')}</span>
          </div>
        </div>

        <SectionCard title="Payment Details">
          <DetailField label="Reference"      value={payment.payment_reference} mono />
          <DetailField label="Transaction Ref" value={payment.transaction_reference || '—'} mono />
          <DetailField label="Supplier"       value={payment.supplier_name} />
          <DetailField label="Payment Date"   value={new Date(payment.payment_date).toLocaleDateString()} />
          <DetailField label="Method"         value={
            <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <i className={`bi ${icon}`} /> {payment.payment_method?.replace('_',' ')}
            </span>
          } />
        </SectionCard>

        <SectionCard title="Banking Details">
          <DetailField label="Bank Name"      value={payment.bank_name || '—'} />
          <DetailField label="Account No."    value={payment.account_number || '—'} mono />
        </SectionCard>

        <SectionCard title="Approval">
          <DetailField label="Initiated By"   value={payment.initiated_by_name} />
          <DetailField label="Approved By"    value={payment.approved_by_name || '—'} />
          <DetailField label="Approved At"    value={payment.approved_at ? new Date(payment.approved_at).toLocaleDateString() : '—'} />
          <DetailField label="Created"        value={new Date(payment.created_at).toLocaleDateString()} />
        </SectionCard>
      </div>

      {/* Linked invoice */}
      {payment.invoice_number && (
        <SectionCard title="Linked Invoice" style={{marginTop:'20px'}}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', gap:'24px', alignItems:'center' }}>
              <div>
                <div style={{fontSize:'11px',color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'2px'}}>Invoice</div>
                <div style={{fontFamily:'var(--font-mono)',fontWeight:700}}>{payment.invoice_number}</div>
              </div>
              <div>
                <div style={{fontSize:'11px',color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'2px'}}>Due Date</div>
                <div style={{fontSize:'13px'}}>{payment.invoice_due_date ? new Date(payment.invoice_due_date).toLocaleDateString() : '—'}</div>
              </div>
              <div>
                <div style={{fontSize:'11px',color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'2px'}}>Invoice Total</div>
                <div style={{fontFamily:'var(--font-mono)',fontWeight:600,fontSize:'13px'}}><Amount value={payment.invoice_total} /></div>
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/invoices/${payment.invoice_slug}`)}>
              <i className="bi bi-eye" /> View Invoice
            </button>
          </div>
        </SectionCard>
      )}

      {payment.remarks && (
        <SectionCard title="Remarks" style={{marginTop:'20px'}}>
          <p style={{fontSize:'13px',color:'var(--gray-600)',lineHeight:1.7,margin:0}}>{payment.remarks}</p>
        </SectionCard>
      )}

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm" message={confirm?.label} loading={acting} danger={confirm?.danger} />
    </PageWrapper>
  );
}