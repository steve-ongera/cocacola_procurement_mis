// pages/Users.jsx
import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { StatusBadge, LoadingState, EmptyState, Pagination, SectionCard, PageWrapper } from '../components/common';
import { useToast } from '../context/AppContext';

const ROLES = ['admin','procurement_officer','budget_manager','approver','finance','store_keeper','requester'];

function UserModal({ isOpen, onClose, onSaved, existing }) {
  const toast = useToast();
  const [form, setForm] = useState({ username:'', first_name:'', last_name:'', email:'', role:'requester', department:'', phone:'', password:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm({ username: existing.username, first_name: existing.first_name, last_name: existing.last_name,
        email: existing.email, role: existing.role, department: existing.department, phone: existing.phone, password: '' });
    } else {
      setForm({ username:'', first_name:'', last_name:'', email:'', role:'requester', department:'', phone:'', password:'' });
    }
  }, [existing, isOpen]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.username || !form.email) { toast.error('Username and email are required.'); return; }
    if (!existing && !form.password)   { toast.error('Password is required for new users.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (existing) { await usersAPI.update(existing.id, payload); toast.success('User updated.'); }
      else { await usersAPI.create(payload); toast.success('User created.'); }
      onSaved(); onClose();
    } catch (e) {
      toast.error('Save failed. Username may already exist.');
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Edit User' : 'New User'}</span>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="form-control" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="James" />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="form-control" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Mwangi" />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-control" value={form.username} onChange={e => set('username', e.target.value)} placeholder="jmwangi" disabled={!!existing} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} placeholder="j.mwangi@company.com" />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <input className="form-control" value={form.department} onChange={e => set('department', e.target.value)} placeholder="Finance" />
            </div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254700000000" />
            </div>
            <div className="form-group">
              <label className="form-label">{existing ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input type="password" className="form-control" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            {existing ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

const ROLE_BADGE = {
  admin:               'badge-black',
  procurement_officer: 'badge-info',
  budget_manager:      'badge-info',
  approver:            'badge-warning',
  finance:             'badge-success',
  store_keeper:        'badge-default',
  requester:           'badge-default',
};

export default function Users() {
  const [data, setData]       = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchData = () => {
    setLoading(true);
    usersAPI.list({ page, search }).then(setData).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, [page, search]);

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Users</h1>
          <p>System users and role assignments</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
          <i className="bi bi-plus-lg" /> New User
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <i className="bi bi-search" />
          <input placeholder="Search by name, username or role..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <SectionCard noPad>
        {loading ? <LoadingState /> : data.results?.length === 0 ? (
          <EmptyState icon="bi-people" title="No users found"
            action={<button className="btn btn-primary" onClick={() => setModal(true)}><i className="bi bi-plus-lg" /> New User</button>}
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Username</th><th>Email</th><th>Role</th><th>Department</th><th>Phone</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {data.results.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', background: 'var(--black)', color: 'var(--white)',
                          display: 'grid', placeItems: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {(u.full_name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.full_name || u.username}</span>
                      </div>
                    </td>
                    <td className="mono text-sm">{u.username}</td>
                    <td className="text-sm">{u.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.role] || 'badge-default'}`}>
                        {u.role?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="text-sm">{u.department || '—'}</td>
                    <td className="mono text-sm">{u.phone || '—'}</td>
                    <td>
                      {u.is_active
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-danger">Inactive</span>}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(u); setModal(true); }}>
                        <i className="bi bi-pencil" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.count > 20 && (
          <div style={{ padding: '0 20px' }}>
            <Pagination count={data.count} page={page} onChange={setPage} />
          </div>
        )}
      </SectionCard>

      <UserModal isOpen={modal} onClose={() => setModal(false)} onSaved={fetchData} existing={editing} />
    </PageWrapper>
  );
}