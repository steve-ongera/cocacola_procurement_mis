// pages/Departments.jsx
import { useState, useEffect } from 'react';
import { departmentsAPI, usersAPI } from '../services/api';
import { LoadingState, EmptyState, SectionCard, PageWrapper } from '../components/common';
import { useToast } from '../context/AppContext';

function DeptModal({ isOpen, onClose, onSaved, existing }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', code: '', head: '' });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      usersAPI.list({ page_size: 100 }).then(r => setUsers(r.results || r)).catch(() => {});
      if (existing) {
        setForm({ name: existing.name, code: existing.code, head: existing.head || '' });
      } else {
        setForm({ name: '', code: '', head: '' });
      }
    }
  }, [isOpen, existing]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and Code are required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, head: form.head || null };
      if (existing) { await departmentsAPI.update(existing.slug, payload); toast.success('Department updated.'); }
      else { await departmentsAPI.create(payload); toast.success('Department created.'); }
      onSaved(); onClose();
    } catch { toast.error('Save failed.'); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Edit Department' : 'New Department'}</span>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Department Name</label>
            <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Finance & Accounting" />
          </div>
          <div className="form-group">
            <label className="form-label">Code</label>
            <input className="form-control" value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. FIN" maxLength={10} />
            <div className="form-hint">Short unique identifier (max 10 chars, uppercase)</div>
          </div>
          <div className="form-group">
            <label className="form-label">Head of Department</label>
            <select className="form-control" value={form.head} onChange={e => set('head', e.target.value)}>
              <option value="">— None —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username} ({u.role})</option>)}
            </select>
          </div>
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

export default function Departments() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch]   = useState('');

  const fetchData = () => {
    setLoading(true);
    departmentsAPI.list({ search }).then(r => setData(r.results || r)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [search]);

  const filtered = data.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Departments</h1>
          <p>Organisational units for budget and procurement planning</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
          <i className="bi bi-plus-lg" /> New Department
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="bi bi-search" />
          <input placeholder="Search departments..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Grid layout */}
      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState icon="bi-diagram-3" title="No departments found"
          action={<button className="btn btn-primary" onClick={() => setModal(true)}><i className="bi bi-plus-lg" /> Add Department</button>}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {filtered.map(dept => (
            <div key={dept.id} className="card" style={{ padding: '0' }}>
              <div style={{ padding: '20px', borderBottom: '3px solid var(--black)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700,
                    background: 'var(--black)', color: 'var(--white)',
                    padding: '2px 8px', letterSpacing: '0.08em',
                  }}>{dept.code}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(dept); setModal(true); }}>
                    <i className="bi bi-pencil" />
                  </button>
                </div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px', color: 'var(--black)' }}>{dept.name}</h3>
                {dept.head_name && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                    <div style={{
                      width: '22px', height: '22px', background: 'var(--gray-200)',
                      display: 'grid', placeItems: 'center', fontSize: '10px', fontWeight: 700,
                    }}>
                      {dept.head_name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{dept.head_name}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center' }}>
                {[
                  { label: 'Budgets', value: dept.budget_count ?? '—' },
                  { label: 'Requisitions', value: dept.requisition_count ?? '—' },
                  { label: 'Active', value: '—' },
                ].map(stat => (
                  <div key={stat.label} style={{ padding: '12px 8px', borderRight: '1px solid var(--gray-100)' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{stat.value}</div>
                    <div style={{ fontSize: '9px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <DeptModal isOpen={modal} onClose={() => setModal(false)} onSaved={fetchData} existing={editing} />
    </PageWrapper>
  );
}