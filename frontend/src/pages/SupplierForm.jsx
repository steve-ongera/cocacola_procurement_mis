// pages/SupplierForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { suppliersAPI } from '../services/api';
import { PageWrapper, SectionCard } from '../components/common';
import { useToast } from '../context/AppContext';

const CATEGORIES = ['ICT','Packaging','Office Supplies','Industrial','Engineering','Consumables','Printing','Logistics','Cleaning','Construction','Furniture','Raw Materials','Maintenance','Other'];

export default function SupplierForm() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const toast    = useToast();
  const isEdit   = !!slug;
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [form, setForm] = useState({
    name:'', registration_number:'', tax_pin:'', email:'', phone:'',
    address:'', city:'', country:'Kenya', contact_person:'', category:'',
    bank_name:'', bank_account:'', bank_branch:'', notes:'', status:'pending',
  });

  useEffect(() => {
    if (isEdit) {
      suppliersAPI.get(slug).then(s => {
        setForm({
          name: s.name, registration_number: s.registration_number, tax_pin: s.tax_pin || '',
          email: s.email, phone: s.phone, address: s.address, city: s.city, country: s.country,
          contact_person: s.contact_person, category: s.category, bank_name: s.bank_name || '',
          bank_account: s.bank_account || '', bank_branch: s.bank_branch || '', notes: s.notes || '',
          status: s.status,
        });
      }).finally(() => setLoading(false));
    }
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name || !form.registration_number || !form.email || !form.phone) {
      toast.error('Name, registration number, email and phone are required.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) { await suppliersAPI.update(slug, form); toast.success('Supplier updated.'); }
      else        { await suppliersAPI.create(form);       toast.success('Supplier registered.'); }
      navigate('/suppliers');
    } catch { toast.error('Save failed. Registration number may already exist.'); }
    finally  { setSaving(false); }
  };

  if (loading) return <PageWrapper><div className="loading-center"><div className="spinner" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isEdit ? 'Edit Supplier' : 'Register New Supplier'}</h1>
          <p>{isEdit ? 'Update supplier information and banking details' : 'Add a new vendor to the approved supplier registry'}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/suppliers')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            {isEdit ? 'Save Changes' : 'Register Supplier'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div>
          <SectionCard title="Company Information">
            <div className="form-grid form-grid-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Company Name</label>
                <input className="form-control" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Techno Solutions Ltd" />
              </div>
              <div className="form-group">
                <label className="form-label">Registration Number</label>
                <input className="form-control" value={form.registration_number} onChange={e => set('registration_number', e.target.value)} placeholder="CPR/2024/001234" />
              </div>
              <div className="form-group">
                <label className="form-label">KRA PIN / Tax PIN</label>
                <input className="form-control" value={form.tax_pin} onChange={e => set('tax_pin', e.target.value)} placeholder="P051234567A" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">— Select Category —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="pending">Pending Approval</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Contact Details">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input className="form-control" value={form.contact_person} onChange={e => set('contact_person', e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254700000000" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@supplier.co.ke" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Physical Address</label>
                <textarea className="form-control" rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address, building, floor..." />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-control" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Nairobi" />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-control" value={form.country} onChange={e => set('country', e.target.value)} placeholder="Kenya" />
              </div>
            </div>
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Banking Details">
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input className="form-control" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="Equity Bank" />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input className="form-control" value={form.bank_account} onChange={e => set('bank_account', e.target.value)} placeholder="0190000001234" />
            </div>
            <div className="form-group">
              <label className="form-label">Branch</label>
              <input className="form-control" value={form.bank_branch} onChange={e => set('bank_branch', e.target.value)} placeholder="Westlands" />
            </div>
          </SectionCard>

          <SectionCard title="Internal Notes">
            <div className="form-group">
              <textarea className="form-control" rows={5} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes, comments, vetting details..." />
            </div>
          </SectionCard>
        </div>
      </div>
    </PageWrapper>
  );
}