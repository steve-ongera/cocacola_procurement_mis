// pages/TenderForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { tendersAPI, departmentsAPI } from '../services/api';
import { PageWrapper, SectionCard } from '../components/common';
import { useToast } from '../context/AppContext';

export default function TenderForm() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const toast    = useToast();
  const isEdit   = !!slug;
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [departments, setDepartments] = useState([]);

  const [form, setForm] = useState({
    reference_number:'', title:'', description:'', tender_type:'open',
    department:'', budget:'', currency:'KES', closing_date:'', opening_date:'',
    evaluation_criteria:'', status:'draft',
  });

  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.results || r)).catch(() => {});
    if (isEdit) {
      tendersAPI.get(slug).then(t => {
        setForm({
          reference_number: t.reference_number, title: t.title, description: t.description,
          tender_type: t.tender_type, department: t.department, budget: t.budget, currency: t.currency,
          closing_date: t.closing_date || '', opening_date: t.opening_date || '',
          evaluation_criteria: t.evaluation_criteria || '', status: t.status,
        });
      }).finally(() => setLoading(false));
    }
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async (publishAfter = false) => {
    if (!form.title || !form.department || !form.budget) {
      toast.error('Title, department and budget are required.');
      return;
    }
    setSaving(true);
    try {
      let tender;
      if (isEdit) { tender = await tendersAPI.update(slug, form); }
      else        { tender = await tendersAPI.create(form); }
      if (publishAfter) { await tendersAPI.publish(tender.slug); toast.success('Tender published.'); }
      else { toast.success(isEdit ? 'Tender updated.' : 'Tender saved as draft.'); }
      navigate('/tenders');
    } catch { toast.error('Save failed. Reference number may already exist.'); }
    finally  { setSaving(false); }
  };

  if (loading) return <PageWrapper><div className="loading-center"><div className="spinner" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isEdit ? 'Edit Tender' : 'New Tender'}</h1>
          <p>Define scope, budget and evaluation criteria for competitive procurement</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/tenders')}>Cancel</button>
          <button className="btn btn-outline" onClick={() => handleSave(false)} disabled={saving}>Save Draft</button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            <i className="bi bi-megaphone" /> Publish
          </button>
        </div>
      </div>

      <SectionCard title="Tender Details">
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Reference Number</label>
            <input className="form-control" value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="TEND-2025-007" disabled={isEdit} />
          </div>
          <div className="form-group">
            <label className="form-label">Tender Type</label>
            <select className="form-control" value={form.tender_type} onChange={e => set('tender_type', e.target.value)}>
              <option value="open">Open Tender</option>
              <option value="restricted">Restricted Tender</option>
              <option value="direct">Direct Procurement</option>
              <option value="rfq">Request for Quotation (RFQ)</option>
              <option value="eoi">Expression of Interest (EOI)</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Title</label>
            <input className="form-control" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Supply and Delivery of ICT Equipment FY2025" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Description / Scope of Work</label>
            <textarea className="form-control" rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed description of goods/services required..." />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-control" value={form.department} onChange={e => set('department', e.target.value)}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Currency</label>
            <select className="form-control" value={form.currency} onChange={e => set('currency', e.target.value)}>
              {['KES','USD','EUR','GBP','UGX','TZS'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Estimated Budget ({form.currency})</label>
            <input type="number" className="form-control" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Closing Date</label>
            <input type="date" className="form-control" value={form.closing_date} onChange={e => set('closing_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Bid Opening Date</label>
            <input type="date" className="form-control" value={form.opening_date} onChange={e => set('opening_date', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Evaluation Criteria</label>
            <textarea className="form-control" rows={2} value={form.evaluation_criteria} onChange={e => set('evaluation_criteria', e.target.value)} placeholder="e.g. Technical 40% | Financial 60% | Past Performance 20%" />
          </div>
        </div>
      </SectionCard>
    </PageWrapper>
  );
}