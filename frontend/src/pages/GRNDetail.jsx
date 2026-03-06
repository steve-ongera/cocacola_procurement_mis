// pages/GRNDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { grnsAPI } from '../services/api';
import { StatusBadge, LoadingState, Amount, SectionCard, DetailField, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function GRNDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [grn, setGRN]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);

  const fetch = () => {
    setLoading(true);
    grnsAPI.get(slug).then(setGRN).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [slug]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'submit') await grnsAPI.submit(slug);
      if (confirm.action === 'verify') await grnsAPI.verify(slug);
      if (confirm.action === 'reject') await grnsAPI.reject(slug);
      toast.success('Action completed.');
      fetch();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  if (loading) return <PageWrapper><LoadingState /></PageWrapper>;
  if (!grn)    return <PageWrapper><p className="text-muted">GRN not found.</p></PageWrapper>;

  const totalAccepted = (grn.line_items || []).reduce((s,li) => s + parseFloat(li.quantity_accepted||0)*parseFloat(li.unit_price||0), 0);
  const totalRejected = (grn.line_items || []).reduce((s,li) => s + parseFloat(li.quantity_rejected||0)*parseFloat(li.unit_price||0), 0);
  const hasRejections = (grn.line_items || []).some(li => parseFloat(li.quantity_rejected||0) > 0);

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontFamily: 'var(--font-mono)' }}>{grn.grn_number}</h1>
          <p>Goods Received Note · {grn.supplier_name} · {new Date(grn.delivery_date).toLocaleDateString()}</p>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={grn.status} />
          {grn.status === 'draft' && (
            <>
              <button className="btn btn-outline" onClick={() => navigate(`/grns/${slug}/edit`)}><i className="bi bi-pencil" /> Edit</button>
              <button className="btn btn-primary" onClick={() => setConfirm({ action:'submit', label:'Submit this GRN for verification?' })}>
                <i className="bi bi-send" /> Submit
              </button>
            </>
          )}
          {grn.status === 'submitted' && (
            <>
              <button className="btn btn-outline" style={{color:'var(--danger)',borderColor:'var(--danger)'}}
                onClick={() => setConfirm({ action:'reject', label:'Reject this GRN?', danger:true })}>
                <i className="bi bi-x-lg" /> Reject
              </button>
              <button className="btn btn-primary" onClick={() => setConfirm({ action:'verify', label:'Verify and accept this GRN?' })}>
                <i className="bi bi-check2-all" /> Verify
              </button>
            </>
          )}
        </div>
      </div>

      {hasRejections && (
        <div style={{ background:'#fdf2f0', border:'1px solid #f0c0bb', padding:'12px 18px', marginBottom:'20px', display:'flex', gap:'12px', alignItems:'center' }}>
          <i className="bi bi-exclamation-triangle-fill" style={{ color:'var(--danger)', fontSize:'16px' }} />
          <span style={{ fontSize:'13px', color:'var(--gray-700)' }}>
            <strong>Rejections recorded.</strong> Some items were rejected during delivery inspection. Review rejection details below.
          </span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        <div>
          <SectionCard title={`Received Items (${grn.line_items?.length || 0})`} noPad>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Item</th><th>Unit</th><th>Ordered</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Rejection Reason</th><th>Batch</th></tr>
                </thead>
                <tbody>
                  {(grn.line_items || []).map(li => {
                    const rejected = parseFloat(li.quantity_rejected||0) > 0;
                    return (
                      <tr key={li.id} style={{ background: rejected ? '#fdf8f0' : '' }}>
                        <td style={{fontWeight:500}}>{li.item_name}</td>
                        <td className="text-sm">{li.unit}</td>
                        <td className="mono text-sm">{parseFloat(li.quantity_ordered).toLocaleString()}</td>
                        <td className="mono text-sm">{parseFloat(li.quantity_received).toLocaleString()}</td>
                        <td className="mono text-sm" style={{color:'var(--success)',fontWeight:600}}>{parseFloat(li.quantity_accepted).toLocaleString()}</td>
                        <td className="mono text-sm" style={{color:rejected?'var(--danger)':'var(--gray-400)',fontWeight:rejected?700:400}}>
                          {parseFloat(li.quantity_rejected||0).toLocaleString()}
                        </td>
                        <td className="text-sm text-muted">{li.rejection_reason || '—'}</td>
                        <td className="mono text-sm">{li.batch_number || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'var(--gray-50)'}}>
                    <td colSpan={4} style={{padding:'12px 16px',textAlign:'right',fontWeight:700,fontSize:'11px'}}>ACCEPTED VALUE</td>
                    <td style={{padding:'12px 16px'}}><Amount value={totalAccepted} /></td>
                    <td style={{padding:'12px 16px',color:'var(--danger)',fontFamily:'var(--font-mono)',fontWeight:600,fontSize:'12px'}}>
                      {totalRejected > 0 ? `KES ${totalRejected.toLocaleString()}` : '—'}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>
        </div>

        <div>
          <SectionCard title="GRN Details">
            <DetailField label="GRN Number"    value={grn.grn_number} mono />
            <DetailField label="PO Reference"  value={<span className="link-text" style={{cursor:'pointer',textDecoration:'underline'}} onClick={() => navigate(`/purchase-orders/${grn.purchase_order_slug}`)}>{grn.purchase_order_number}</span>} />
            <DetailField label="Supplier"      value={grn.supplier_name} />
            <DetailField label="Delivery Date" value={new Date(grn.delivery_date).toLocaleDateString()} />
            <DetailField label="Delivery Note" value={grn.delivery_note_number || '—'} mono />
            <DetailField label="Invoice No."   value={grn.invoice_number || '—'} mono />
            <hr className="divider" />
            <DetailField label="Received By"   value={grn.received_by_name} />
            <DetailField label="Verified By"   value={grn.verified_by_name || '—'} />
            <DetailField label="Verified At"   value={grn.verified_at ? new Date(grn.verified_at).toLocaleDateString() : '—'} />
          </SectionCard>

          {grn.remarks && (
            <SectionCard title="Remarks">
              <p style={{fontSize:'13px',color:'var(--gray-600)',lineHeight:1.7,margin:0}}>{grn.remarks}</p>
            </SectionCard>
          )}
        </div>
      </div>

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm" message={confirm?.label} loading={acting} danger={confirm?.danger} />
    </PageWrapper>
  );
}