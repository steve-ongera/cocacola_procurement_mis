// pages/RequisitionForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { requisitionsAPI, requisitionItemsAPI, departmentsAPI, quarterBudgetsAPI } from '../services/api';
import { PageWrapper, SectionCard } from '../components/common';
import { useToast, useAuth } from '../context/AppContext';

const emptyItem = () => ({ item_name:'', description:'', unit:'Units', quantity:'1', estimated_unit_price:'', specifications:'' });

export default function RequisitionForm() {
  const navigate      = useNavigate();
  const { slug }      = useParams();
  const [searchParams]= useSearchParams();
  const toast         = useToast();
  const { user }      = useAuth();
  const isEdit        = !!slug;
  const defaultType   = searchParams.get('type') === 'emergency' ? 'emergency' : 'planned';

  const [departments, setDepartments]     = useState([]);
  const [quarterBudgets, setQuarterBudgets] = useState([]);
  const [saving, setSaving]               = useState(false);
  const [loading, setLoading]             = useState(isEdit);

  const [form, setForm] = useState({
    title: '', requisition_type: defaultType, department: '', quarter_budget: '',
    priority: 'medium', justification: '', required_date: '', emergency_reason: '',
  });
  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.results || r)).catch(() => {});
    if (isEdit) {
      requisitionsAPI.get(slug).then(r => {
        setForm({
          title: r.title, requisition_type: r.requisition_type, department: r.department,
          quarter_budget: r.quarter_budget || '', priority: r.priority,
          justification: r.justification, required_date: r.required_date || '',
          emergency_reason: r.emergency_reason || '',
        });
        setItems(r.items?.length ? r.items.map(i => ({ ...i, _id: i.id })) : [emptyItem()]);
        if (r.department) {
          quarterBudgetsAPI.list({ budget__department: r.department }).then(qr => setQuarterBudgets(qr.results || qr)).catch(() => {});
        }
      }).finally(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    if (form.department) {
      quarterBudgetsAPI.list({ budget__department: form.department }).then(r => setQuarterBudgets(r.results || r)).catch(() => {});
    }
  }, [form.department]);

  const setF    = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (idx, k, v) => { const a = [...items]; a[idx] = { ...a[idx], [k]: v }; setItems(a); };
  const addItem = () => setItems(i => [...i, emptyItem()]);
  const removeItem = idx => setItems(prev => prev.filter((_, i) => i !== idx).length ? prev.filter((_, i) => i !== idx) : [emptyItem()]);

  const totalCost = items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.estimated_unit_price || 0)), 0);

  const handleSave = async (submitAfter = false) => {
    if (!form.title || !form.department) { toast.error('Title and department are required.'); return; }
    if (form.requisition_type === 'emergency' && !form.emergency_reason) {
      toast.error('Emergency reason is required for emergency requisitions.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, total_estimated_cost: totalCost, quarter_budget: form.quarter_budget || null };
      let req;
      if (isEdit) { req = await requisitionsAPI.update(slug, payload); }
      else { req = await requisitionsAPI.create(payload); }

      for (const item of items) {
        if (!item.item_name) continue;
        const p = { requisition: req.id, item_name: item.item_name, description: item.description, unit: item.unit, quantity: item.quantity, estimated_unit_price: item.estimated_unit_price, specifications: item.specifications };
        if (item._id) { await requisitionItemsAPI.update(item.slug, p); }
        else { await requisitionItemsAPI.create(p); }
      }

      if (submitAfter) { await requisitionsAPI.submit(req.slug); toast.success('Requisition created and submitted.'); }
      else { toast.success(isEdit ? 'Requisition updated.' : 'Requisition saved as draft.'); }

      navigate('/requisitions');
    } catch { toast.error('Save failed. Please check all required fields.'); }
    finally { setSaving(false); }
  };

  if (loading) return <PageWrapper><div className="loading-center"><div className="spinner" /></div></PageWrapper>;

  const isEmergency = form.requisition_type === 'emergency';

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEmergency && <span style={{ color: 'var(--danger)', fontSize: '18px' }}>🚨</span>}
            {isEdit ? 'Edit Requisition' : isEmergency ? 'Emergency Requisition' : 'New Requisition'}
          </h1>
          <p>{isEmergency ? 'Urgent procurement request requiring immediate approval' : 'Planned procurement request against quarterly budget'}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/requisitions')}>Cancel</button>
          <button className="btn btn-outline" onClick={() => handleSave(false)} disabled={saving}>
            Save Draft
          </button>
          <button className={`btn ${isEmergency ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleSave(true)} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            {isEmergency ? '🚨 Submit Emergency' : 'Submit for Approval'}
          </button>
        </div>
      </div>

      {isEmergency && (
        <div style={{ background: '#fdf2f0', border: '2px solid var(--danger)', padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <i className="bi bi-exclamation-octagon-fill" style={{ color: 'var(--danger)', fontSize: '18px', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--danger)', marginBottom: '2px' }}>Emergency Requisition Mode</div>
            <div style={{ fontSize: '12px', color: 'var(--gray-600)' }}>
              This requisition will bypass standard budget linking and follow the emergency approval workflow. Ensure full justification is provided.
            </div>
          </div>
        </div>
      )}

      <SectionCard title="Requisition Details">
        <div className="form-grid form-grid-2">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Requisition Title</label>
            <input className="form-control" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Office Supplies Q1 2025" />
          </div>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-control" value={form.requisition_type} onChange={e => setF('requisition_type', e.target.value)}>
              <option value="planned">Planned</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="form-control" value={form.priority} onChange={e => setF('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-control" value={form.department} onChange={e => setF('department', e.target.value)}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>)}
            </select>
          </div>
          {!isEmergency && (
            <div className="form-group">
              <label className="form-label">Quarter Budget (optional)</label>
              <select className="form-control" value={form.quarter_budget} onChange={e => setF('quarter_budget', e.target.value)}>
                <option value="">— None / Not linked —</option>
                {quarterBudgets.map(qb => <option key={qb.id} value={qb.id}>{qb.quarter} – KES {parseFloat(qb.allocated_amount).toLocaleString()}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Required By Date</label>
            <input type="date" className="form-control" value={form.required_date} onChange={e => setF('required_date', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Justification</label>
            <textarea className="form-control" rows={3} value={form.justification} onChange={e => setF('justification', e.target.value)}
              placeholder="Explain why this procurement is needed..." />
          </div>
          {isEmergency && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label" style={{ color: 'var(--danger)' }}>Emergency Reason <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="form-control" rows={4} value={form.emergency_reason} onChange={e => setF('emergency_reason', e.target.value)}
                placeholder="Describe the emergency situation, impact if not addressed immediately, and any approvals already obtained..."
                style={{ borderColor: form.emergency_reason ? 'var(--gray-300)' : 'var(--danger)' }}
              />
            </div>
          )}
        </div>
      </SectionCard>

      {/* Items */}
      <SectionCard title="Requested Items"
        actions={
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span className="text-xs text-muted">Est. Total: <strong style={{ fontFamily: 'var(--font-mono)' }}>KES {totalCost.toLocaleString()}</strong></span>
            <button className="btn btn-outline btn-sm" onClick={addItem}><i className="bi bi-plus-lg" /> Add Item</button>
          </div>
        }
        noPad
      >
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: '160px' }}>Item Name</th>
                <th style={{ width: '70px' }}>Unit</th>
                <th style={{ width: '80px' }}>Qty</th>
                <th style={{ width: '120px' }}>Est. Unit Price</th>
                <th style={{ width: '120px' }}>Total</th>
                <th style={{ minWidth: '180px' }}>Specifications</th>
                <th style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const t = parseFloat(item.quantity || 0) * parseFloat(item.estimated_unit_price || 0);
                return (
                  <tr key={idx}>
                    <td><input className="form-control" style={{ padding: '6px 8px' }} value={item.item_name} onChange={e => setItem(idx, 'item_name', e.target.value)} placeholder="Item name" /></td>
                    <td><input className="form-control" style={{ padding: '6px 8px' }} value={item.unit} onChange={e => setItem(idx, 'unit', e.target.value)} placeholder="Units" /></td>
                    <td><input type="number" className="form-control" style={{ padding: '6px 8px' }} value={item.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} /></td>
                    <td><input type="number" className="form-control" style={{ padding: '6px 8px' }} value={item.estimated_unit_price} onChange={e => setItem(idx, 'estimated_unit_price', e.target.value)} placeholder="0.00" /></td>
                    <td className="mono text-sm" style={{ fontWeight: 600 }}>{t > 0 ? t.toLocaleString() : '—'}</td>
                    <td><input className="form-control" style={{ padding: '6px 8px' }} value={item.specifications} onChange={e => setItem(idx, 'specifications', e.target.value)} placeholder="Specs..." /></td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => removeItem(idx)} style={{ color: 'var(--danger)' }}><i className="bi bi-trash" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </PageWrapper>
  );
}