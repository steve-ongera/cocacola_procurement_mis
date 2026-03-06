// pages/TenderDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tendersAPI } from '../services/api';
import { StatusBadge, LoadingState, Amount, SectionCard, DetailField, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function TenderDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [tender, setTender]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [acting, setActing]   = useState(false);
  const [tab, setTab]         = useState('details');

  const fetch = () => {
    setLoading(true);
    tendersAPI.get(slug).then(setTender).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [slug]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'publish') await tendersAPI.publish(slug);
      if (confirm.action === 'close')   await tendersAPI.close(slug);
      if (confirm.action === 'cancel')  await tendersAPI.cancel(slug);
      if (confirm.action === 'award')   await tendersAPI.award(slug, { supplier: confirm.supplier });
      toast.success('Action completed.');
      fetch();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  if (loading) return <PageWrapper><LoadingState /></PageWrapper>;
  if (!tender) return <PageWrapper><p className="text-muted">Tender not found.</p></PageWrapper>;

  const daysLeft = tender.closing_date
    ? Math.ceil((new Date(tender.closing_date) - new Date()) / 86400000)
    : null;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{tender.title}</h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{tender.reference_number} · {tender.tender_type?.replace('_',' ').toUpperCase()}</p>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={tender.status} />
          {tender.status === 'draft' && (
            <>
              <button className="btn btn-outline" onClick={() => navigate(`/tenders/${slug}/edit`)}><i className="bi bi-pencil" /> Edit</button>
              <button className="btn btn-primary" onClick={() => setConfirm({ action: 'publish', label: 'Publish this tender? It will be visible to suppliers.' })}>
                <i className="bi bi-megaphone" /> Publish
              </button>
            </>
          )}
          {tender.status === 'published' && (
            <button className="btn btn-outline" onClick={() => setConfirm({ action: 'close', label: 'Close bidding for this tender?' })}>
              <i className="bi bi-lock" /> Close Bidding
            </button>
          )}
          {['published','evaluation'].includes(tender.status) && (
            <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => setConfirm({ action: 'cancel', label: 'Cancel this tender?' })}>
              <i className="bi bi-x-lg" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Estimated Budget', value: <Amount value={tender.budget} currency={tender.currency} />, dark: true },
          { label: 'Bids Received',    value: tender.bids?.length ?? tender.bid_count ?? 0 },
          { label: 'Days Until Close', value: daysLeft !== null ? (daysLeft < 0 ? 'Closed' : `${daysLeft} days`) : '—' },
          { label: 'Awarded To',       value: tender.awarded_to_name || '—' },
        ].map(c => (
          <div key={c.label} className={`stat-card${c.dark?' dark':''}`}>
            <div className="stat-info">
              <div className="stat-label">{c.label}</div>
              <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 700 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom: '20px' }}>
        {['details','bids'].map(t => (
          <div key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
            {t === 'bids' && <span className="tab-count">{tender.bids?.length ?? 0}</span>}
          </div>
        ))}
      </div>

      {tab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div>
            <SectionCard title="Scope of Work">
              <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.8, margin: 0 }}>{tender.description || 'No description provided.'}</p>
            </SectionCard>
            {tender.evaluation_criteria && (
              <SectionCard title="Evaluation Criteria">
                <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.8, margin: 0 }}>{tender.evaluation_criteria}</p>
              </SectionCard>
            )}
            {tender.awarded_to_name && (
              <SectionCard title="Award Details" style={{ borderLeft: '3px solid var(--success)' }}>
                <DetailField label="Awarded To"     value={tender.awarded_to_name} />
                <DetailField label="Awarded Amount" value={<Amount value={tender.awarded_amount} currency={tender.currency} />} />
              </SectionCard>
            )}
          </div>
          <div>
            <SectionCard title="Tender Info">
              <DetailField label="Reference"      value={tender.reference_number} mono />
              <DetailField label="Type"           value={tender.tender_type?.replace(/_/g,' ')} />
              <DetailField label="Department"     value={tender.department_name} />
              <DetailField label="Currency"       value={tender.currency} />
              <DetailField label="Published"      value={tender.published_date ? new Date(tender.published_date).toLocaleDateString() : '—'} />
              <DetailField label="Closing Date"   value={tender.closing_date ? new Date(tender.closing_date).toLocaleDateString() : '—'} />
              <DetailField label="Opening Date"   value={tender.opening_date ? new Date(tender.opening_date).toLocaleDateString() : '—'} />
              <DetailField label="Created By"     value={tender.created_by_name} />
            </SectionCard>
          </div>
        </div>
      )}

      {tab === 'bids' && (
        <SectionCard title="Submitted Bids" noPad
          actions={tender.status === 'evaluation' ? (
            <span className="text-xs text-muted">Click a bid to award the tender</span>
          ) : null}
        >
          {!tender.bids?.length ? (
            <p className="text-muted text-sm text-center" style={{ padding: '32px' }}>No bids received yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th>Supplier</th><th>Bid Amount</th><th>Technical</th><th>Financial</th><th>Total Score</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {[...tender.bids].sort((a,b) => (b.total_score||0)-(a.total_score||0)).map(bid => (
                    <tr key={bid.id} style={{ background: bid.status === 'awarded' ? 'rgba(25,135,84,.04)' : '' }}>
                      <td style={{ fontWeight: 500 }}>{bid.supplier_name}</td>
                      <td><Amount value={bid.bid_amount} currency={tender.currency} /></td>
                      <td className="mono text-sm">{bid.technical_score ?? '—'}</td>
                      <td className="mono text-sm">{bid.financial_score ?? '—'}</td>
                      <td>
                        {bid.total_score ? (
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{bid.total_score}</span>
                        ) : '—'}
                      </td>
                      <td><StatusBadge status={bid.status} /></td>
                      <td>
                        {tender.status === 'evaluation' && bid.status !== 'awarded' && (
                          <button className="btn btn-ghost btn-sm" title="Award to this supplier"
                            onClick={() => setConfirm({ action: 'award', supplier: bid.supplier, label: `Award tender to ${bid.supplier_name} for ${tender.currency} ${parseFloat(bid.bid_amount).toLocaleString()}?` })}>
                            <i className="bi bi-trophy" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm" message={confirm?.label} loading={acting} danger={confirm?.action === 'cancel'} />
    </PageWrapper>
  );
}