// pages/SupplierDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { suppliersAPI, purchaseOrdersAPI, tendersAPI } from '../services/api';
import { StatusBadge, LoadingState, Amount, SectionCard, DetailField, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

export default function SupplierDetail() {
  const { slug }   = useParams();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [supplier, setSupplier] = useState(null);
  const [pos, setPOs]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [confirm, setConfirm]   = useState(null);
  const [acting, setActing]     = useState(false);
  const [tab, setTab]           = useState('info');

  const fetch = () => {
    setLoading(true);
    suppliersAPI.get(slug).then(s => {
      setSupplier(s);
      purchaseOrdersAPI.list({ supplier: s.id, page_size: 10 }).then(r => setPOs(r.results || r)).catch(() => {});
    }).finally(() => setLoading(false));
  };
  useEffect(() => { fetch(); }, [slug]);

  const handleAction = async () => {
    setActing(true);
    try {
      if (confirm.action === 'activate')   await suppliersAPI.activate(slug);
      if (confirm.action === 'blacklist')  await suppliersAPI.blacklist(slug);
      toast.success('Supplier status updated.');
      fetch();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  if (loading) return <PageWrapper><LoadingState /></PageWrapper>;
  if (!supplier) return <PageWrapper><p className="text-muted">Supplier not found.</p></PageWrapper>;

  const stars = Math.round(parseFloat(supplier.rating || 0));

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', background: 'var(--black)', color: 'var(--white)', display: 'grid', placeItems: 'center', fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>
              {supplier.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: 0 }}>{supplier.name}</h1>
              <p style={{ margin: 0 }}>{supplier.category} · {supplier.city}, {supplier.country}</p>
            </div>
          </div>
        </div>
        <div className="page-header-actions">
          <StatusBadge status={supplier.status} />
          <button className="btn btn-outline" onClick={() => navigate(`/suppliers/${slug}/edit`)}>
            <i className="bi bi-pencil" /> Edit
          </button>
          {supplier.status !== 'active' && supplier.status !== 'blacklisted' && (
            <button className="btn btn-primary" onClick={() => setConfirm({ action: 'activate', label: `Activate "${supplier.name}"?` })}>
              <i className="bi bi-check-circle" /> Activate
            </button>
          )}
          {supplier.status !== 'blacklisted' && (
            <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => setConfirm({ action: 'blacklist', label: `Blacklist "${supplier.name}"? They will no longer be eligible for new POs.` })}>
              <i className="bi bi-slash-circle" /> Blacklist
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total POs',    value: supplier.po_count ?? pos.length ?? '—' },
          { label: 'Total Spend',  value: <Amount value={supplier.total_spend} /> },
          { label: 'Tenders Won',  value: supplier.won_tenders_count ?? '—' },
          { label: 'Rating',       value: <span style={{ color: '#fd7e14', letterSpacing: '2px' }}>{'★'.repeat(stars)}{'☆'.repeat(5-stars)}</span> },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-info">
              <div className="stat-label">{c.label}</div>
              <div style={{ marginTop: '6px', fontSize: '15px', fontWeight: 700 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tabs" style={{ marginBottom: '20px' }}>
        {['info','banking','purchase_orders','notes'].map(t => (
          <div key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
            {t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
          </div>
        ))}
      </div>

      {tab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <SectionCard title="Company Details">
            <DetailField label="Registration No." value={supplier.registration_number} mono />
            <DetailField label="KRA PIN"          value={supplier.tax_pin || '—'} mono />
            <DetailField label="Category"         value={supplier.category} />
            <DetailField label="Status"           value={<StatusBadge status={supplier.status} />} />
            <DetailField label="Rating"           value={`${supplier.rating} / 5.0`} />
          </SectionCard>
          <SectionCard title="Contact Details">
            <DetailField label="Contact Person"   value={supplier.contact_person} />
            <DetailField label="Email"            value={<a href={`mailto:${supplier.email}`} style={{ color: 'var(--black)', textDecoration: 'underline' }}>{supplier.email}</a>} />
            <DetailField label="Phone"            value={supplier.phone} mono />
            <DetailField label="Address"          value={supplier.address} />
            <DetailField label="City"             value={supplier.city} />
            <DetailField label="Country"          value={supplier.country} />
          </SectionCard>
        </div>
      )}

      {tab === 'banking' && (
        <SectionCard title="Banking Information">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
            <DetailField label="Bank Name"       value={supplier.bank_name || '—'} />
            <DetailField label="Account Number"  value={supplier.bank_account || '—'} mono />
            <DetailField label="Branch"          value={supplier.bank_branch || '—'} />
          </div>
        </SectionCard>
      )}

      {tab === 'purchase_orders' && (
        <SectionCard title="Purchase Orders" noPad>
          {pos.length === 0 ? (
            <p className="text-muted text-sm text-center" style={{ padding: '24px' }}>No purchase orders for this supplier.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead><tr><th>PO Number</th><th>Department</th><th>Total</th><th>Delivery Date</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {pos.map(po => (
                    <tr key={po.id}>
                      <td className="mono text-sm font-bold">{po.po_number}</td>
                      <td className="text-sm">{po.department_name}</td>
                      <td><Amount value={po.total_amount} /></td>
                      <td className="text-sm">{po.delivery_date ? new Date(po.delivery_date).toLocaleDateString() : '—'}</td>
                      <td><StatusBadge status={po.status} /></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/purchase-orders/${po.slug}`)}><i className="bi bi-eye" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      {tab === 'notes' && (
        <SectionCard title="Internal Notes">
          {supplier.notes ? (
            <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.7 }}>{supplier.notes}</p>
          ) : (
            <p className="text-muted text-sm">No internal notes recorded.</p>
          )}
          <hr className="divider" />
          <DetailField label="Registered" value={new Date(supplier.created_at).toLocaleDateString()} />
          <DetailField label="Last Updated" value={new Date(supplier.updated_at).toLocaleDateString()} />
        </SectionCard>
      )}

      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
        title="Confirm" message={confirm?.label} loading={acting} danger={confirm?.action === 'blacklist'} />
    </PageWrapper>
  );
}