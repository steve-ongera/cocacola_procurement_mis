// pages/RequisitionDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requisitionsAPI } from '../services/api';
import { StatusBadge, LoadingState, Amount, SectionCard, DetailField, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

const WORKFLOW = [
  { key: 'draft',              label: 'Draft',             icon: 'bi-file-earmark' },
  { key: 'submitted',          label: 'Submitted',         icon: 'bi-send' },
  { key: 'hod_approved',       label: 'HOD Approved',      icon: 'bi-person-check' },
  { key: 'procurement_review', label: 'Procurement Review',icon: 'bi-search' },
  { key: 'approved',           label: 'Final Approved',    icon: 'bi-check-circle' },
  { key: 'converted_to_po',    label: 'Converted to PO',   icon: 'bi-receipt' },
];

const STATUS_ORDER = WORKFLOW.map(w => w.key);

export default function RequisitionDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [req, setReq]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);

  const fetch = () => {
    setLoading(true);
    requisitionsAPI.get(slug).then(setReq).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [slug]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'submit')      await requisitionsAPI.submit(slug);
      if (confirm.action === 'hod_approve') await requisitionsAPI.hodApprove(slug);
      if (confirm.action === 'approve')     await requisitionsAPI.approve(slug);
      if (confirm.action === 'reject')      await requisitionsAPI.reject(slug, confirm.reason);
      if (confirm.action === 'convert')     await requisitionsAPI.convertToPO(slug);
      toast.success('Action completed.');
      fetch();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  if (loading) return <PageWrapper><LoadingState /></PageWrapper>;
  if (!req) return <PageWrapper><p className="text-muted">Requisition not found.</p></PageWrapper>;

  const currentIdx = STATUS_ORDER.indexOf(req.status);
  const isEmergency = req.requisition_type === 'emergency';

  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEmergency && <span style={{ color: 'var(--danger)' }}>🚨</span>}
            {req.title}
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{req.reference_number}</p>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={req.priority} />
          <StatusBadge status={req.status} />
          {req.status === 'draft' && (
            <>
              <button className="btn btn-outline" onClick={() => navigate(`/requisitions/${slug}/edit`)}>
                <i className="bi bi-pencil" /> Edit
              </button>
              <button className="btn btn-primary" onClick={() => setConfirm({ action: 'submit', label: 'Submit this requisition for HOD approval?' })}>
                <i className="bi bi-send" /> Submit
              </button>
            </>
          )}
          {req.status === 'submitted' && (
            <button className="btn btn-primary" onClick={() => setConfirm({ action: 'hod_approve', label: 'HOD-approve this requisition?' })}>
              <i className="bi bi-person-check" /> HOD Approve
            </button>
          )}
          {req.status === 'hod_approved' && (
            <button className="btn btn-primary" onClick={() => setConfirm({ action: 'approve', label: 'Give final approval?' })}>
              <i className="bi bi-check2-all" /> Final Approve
            </button>
          )}
          {req.status === 'approved' && (
            <button className="btn btn-primary" onClick={() => setConfirm({ action: 'convert', label: 'Convert this requisition to a Purchase Order?' })}>
              <i className="bi bi-arrow-right-circle" /> Convert to PO
            </button>
          )}
          {!['rejected','cancelled','converted_to_po'].includes(req.status) && (
            <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => setConfirm({ action: 'reject', label: 'Reject this requisition?' })}>
              <i className="bi bi-x-lg" /> Reject
            </button>
          )}
        </div>
      </div>

      {/* Workflow tracker */}
      {req.status !== 'rejected' && req.status !== 'cancelled' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '24px', background: 'var(--white)', border: '1px solid var(--gray-200)', padding: '16px 20px', overflowX: 'auto' }}>
          {WORKFLOW.map((step, i) => {
            const done    = i < currentIdx;
            const current = i === currentIdx;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '32px', height: '32px',
                    background: done || current ? 'var(--black)' : 'var(--gray-100)',
                    color: done || current ? 'var(--white)' : 'var(--gray-400)',
                    display: 'grid', placeItems: 'center', fontSize: '14px',
                    border: current ? '2px solid var(--black)' : 'none',
                  }}>
                    <i className={`bi ${done ? 'bi-check-lg' : step.icon}`} />
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: current ? 700 : 400, color: current ? 'var(--black)' : done ? 'var(--gray-500)' : 'var(--gray-300)', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                    {step.label}
                  </span>
                </div>
                {i < WORKFLOW.length - 1 && (
                  <div style={{ width: '40px', height: '2px', background: done ? 'var(--black)' : 'var(--gray-200)', margin: '0 4px', marginBottom: '20px', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {isEmergency && req.emergency_reason && (
        <div style={{ background: '#fdf2f0', border: '1px solid #f0c0bb', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px' }}>
          <i className="bi bi-exclamation-octagon-fill" style={{ color: 'var(--danger)', fontSize: '18px', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--danger)', marginBottom: '4px' }}>EMERGENCY REASON</div>
            <p style={{ fontSize: '13px', color: 'var(--gray-700)', lineHeight: 1.6, margin: 0 }}>{req.emergency_reason}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
        {/* Side info */}
        <div>
          <SectionCard title="Requisition Info">
            <DetailField label="Reference"    value={req.reference_number} mono />
            <DetailField label="Type"         value={req.requisition_type === 'emergency' ? '🚨 Emergency' : 'Planned'} />
            <DetailField label="Department"   value={req.department_name} />
            <DetailField label="Requested By" value={req.requested_by_name} />
            <DetailField label="Required By"  value={req.required_date ? new Date(req.required_date).toLocaleDateString() : '—'} />
            <DetailField label="Created"      value={new Date(req.created_at).toLocaleDateString()} />
            <hr className="divider" />
            <DetailField label="Est. Total"   value={<Amount value={req.total_estimated_cost} />} />
          </SectionCard>

          <SectionCard title="Approval Trail">
            <ul className="timeline">
              <li className="timeline-item">
                <div className={`timeline-dot${req.requested_by_name ? ' done' : ''}`}>
                  <i className="bi bi-person" style={{ fontSize: '10px' }} />
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">Requested</div>
                  <div className="timeline-meta">{req.requested_by_name} · {new Date(req.created_at).toLocaleDateString()}</div>
                </div>
              </li>
              <li className="timeline-item">
                <div className={`timeline-dot${req.hod_approved_by ? ' done' : ''}`}>
                  <i className="bi bi-person-check" style={{ fontSize: '10px' }} />
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">HOD Approval</div>
                  <div className="timeline-meta">
                    {req.hod_approved_by ? `${req.hod_approved_by} · ${new Date(req.hod_approved_at).toLocaleDateString()}` : 'Pending'}
                  </div>
                </div>
              </li>
              <li className="timeline-item">
                <div className={`timeline-dot${req.approved_by_name ? ' done' : ''}`}>
                  <i className="bi bi-check2-all" style={{ fontSize: '10px' }} />
                </div>
                <div className="timeline-content">
                  <div className="timeline-title">Final Approval</div>
                  <div className="timeline-meta">
                    {req.approved_by_name ? `${req.approved_by_name} · ${new Date(req.approved_at).toLocaleDateString()}` : 'Pending'}
                  </div>
                </div>
              </li>
            </ul>
          </SectionCard>
        </div>

        {/* Items table */}
        <div>
          {req.justification && (
            <SectionCard title="Justification">
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.7, margin: 0 }}>{req.justification}</p>
            </SectionCard>
          )}

          <SectionCard title={`Requested Items (${req.items?.length || 0})`} noPad>
            {!req.items?.length ? (
              <p className="text-muted text-sm text-center" style={{ padding: '24px' }}>No items added.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr><th>Item</th><th>Unit</th><th>Qty</th><th>Est. Unit Price</th><th>Est. Total</th><th>Specifications</th></tr>
                  </thead>
                  <tbody>
                    {req.items.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.item_name}</td>
                        <td className="text-sm">{item.unit}</td>
                        <td className="mono text-sm">{parseFloat(item.quantity).toLocaleString()}</td>
                        <td><Amount value={item.estimated_unit_price} /></td>
                        <td><Amount value={item.total_estimated_price} /></td>
                        <td className="text-sm text-muted">{item.specifications || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      <td colSpan={4} style={{ padding: '12px 16px', fontWeight: 700, fontSize: '12px', textAlign: 'right' }}>TOTAL ESTIMATED COST</td>
                      <td style={{ padding: '12px 16px' }}><Amount value={req.total_estimated_cost} /></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm Action" message={confirm?.label} loading={acting}
        danger={confirm?.action === 'reject'}
      />
    </PageWrapper>
  );
}