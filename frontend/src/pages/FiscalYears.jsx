// pages/FiscalYears.jsx
import { useState, useEffect } from 'react';
import { fiscalYearsAPI } from '../services/api';
import { StatusBadge, LoadingState, EmptyState, SectionCard, PageWrapper, ConfirmModal } from '../components/common';
import { useToast } from '../context/AppContext';

function FiscalYearModal({ isOpen, onClose, onSaved, existing }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', is_active: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        start_date: existing.start_date,
        end_date: existing.end_date,
        is_active: existing.is_active,
      });
    } else {
      setForm({ name: '', start_date: '', end_date: '', is_active: false });
    }
  }, [existing, isOpen]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await fiscalYearsAPI.update(existing.slug, form);
        toast.success('Fiscal year updated.');
      } else {
        await fiscalYearsAPI.create(form);
        toast.success('Fiscal year created.');
      }
      onSaved();
      onClose();
    } catch { toast.error('Save failed. Check your inputs.'); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Edit Fiscal Year' : 'New Fiscal Year'}</span>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Name (e.g. FY2026)</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="FY2026" />
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input type="date" className="form-control" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">End Date</label>
              <input type="date" className="form-control" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            Set as Active Fiscal Year
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            {existing ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FiscalYears() {
  const toast = useToast();
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [confirm, setConfirm]   = useState(null);
  const [acting, setActing]     = useState(false);

  const fetchData = () => {
    setLoading(true);
    fiscalYearsAPI.list().then(r => setData(r.results || r)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleSetActive = async () => {
    setActing(true);
    try {
      await fiscalYearsAPI.setActive(confirm.slug);
      toast.success(`${confirm.name} set as active fiscal year.`);
      fetchData();
    } catch { toast.error('Action failed.'); }
    finally { setActing(false); setConfirm(null); }
  };

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Fiscal Years</h1>
          <p>Manage annual planning periods for budget allocation</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
          <i className="bi bi-plus-lg" /> New Fiscal Year
        </button>
      </div>

      <SectionCard noPad>
        {loading ? <LoadingState /> : data.length === 0 ? (
          <EmptyState icon="bi-calendar3" title="No fiscal years" description="Create your first fiscal year to begin planning."
            action={<button className="btn btn-primary" onClick={() => setModal(true)}><i className="bi bi-plus-lg" /> Create</button>}
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Start Date</th><th>End Date</th><th>Duration</th><th>Status</th><th>Budgets</th><th></th>
                </tr>
              </thead>
              <tbody>
                {data.map(fy => {
                  const days = Math.round((new Date(fy.end_date) - new Date(fy.start_date)) / 86400000);
                  return (
                    <tr key={fy.id}>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '14px' }}>{fy.name}</td>
                      <td className="mono text-sm">{new Date(fy.start_date).toLocaleDateString()}</td>
                      <td className="mono text-sm">{new Date(fy.end_date).toLocaleDateString()}</td>
                      <td className="text-sm text-muted">{days} days</td>
                      <td>
                        {fy.is_active
                          ? <span className="badge badge-success"><i className="bi bi-record-circle" /> Active</span>
                          : <span className="badge badge-default">Inactive</span>}
                      </td>
                      <td className="mono text-sm text-center">{fy.budget_count ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="btn btn-ghost btn-sm" title="Edit" onClick={() => { setEditing(fy); setModal(true); }}>
                            <i className="bi bi-pencil" />
                          </button>
                          {!fy.is_active && (
                            <button className="btn btn-ghost btn-sm" title="Set Active"
                              onClick={() => setConfirm({ slug: fy.slug, name: fy.name, label: `Set "${fy.name}" as the active fiscal year? This will deactivate the current one.` })}>
                              <i className="bi bi-check-circle" />
                            </button>
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
      </SectionCard>

      <FiscalYearModal isOpen={modal} onClose={() => setModal(false)} onSaved={fetchData} existing={editing} />
      <ConfirmModal isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleSetActive}
        title="Set Active Fiscal Year" message={confirm?.label} loading={acting} />
    </PageWrapper>
  );
}