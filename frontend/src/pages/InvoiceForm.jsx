// pages/InvoiceForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { invoicesAPI, purchaseOrdersAPI, grnsAPI, suppliersAPI } from '../services/api';
import { PageWrapper, SectionCard, Amount } from '../components/common';
import { useToast } from '../context/AppContext';

export default function InvoiceForm() {
  const navigate   = useNavigate();
  const { slug }   = useParams();
  const [sp]       = useSearchParams();
  const toast      = useToast();
  const isEdit     = !!slug;

  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPOs]             = useState([]);
  const [grns, setGRNs]           = useState([]);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(isEdit);

  const [form, setForm] = useState({
    invoice_number:'', supplier:'', purchase_order:'', grn:'',
    invoice_date:'', due_date:'', sub_total:'', tax_amount:'', total_amount:'',
    currency:'KES', notes:'',
  });

  useEffect(() => {
    suppliersAPI.list({ status:'active', page_size:100 }).then(r => setSuppliers(r.results||r)).catch(()=>{});
    purchaseOrdersAPI.list({ status:'fully_received,partially_received,acknowledged', page_size:100 }).then(r => setPOs(r.results||r)).catch(()=>{});

    if (isEdit) {
      invoicesAPI.get(slug).then(inv => {
        setForm({
          invoice_number: inv.invoice_number, supplier: inv.supplier, purchase_order: inv.purchase_order || '',
          grn: inv.grn || '', invoice_date: inv.invoice_date, due_date: inv.due_date,
          sub_total: inv.sub_total, tax_amount: inv.tax_amount, total_amount: inv.total_amount,
          currency: inv.currency, notes: inv.notes || '',
        });
        if (inv.supplier) loadGRNs(inv.supplier);
      }).finally(() => setLoading(false));
    }
  }, []);

  const loadGRNs = (supplierId) => {
    grnsAPI.list({ supplier: supplierId, status:'verified', page_size:50 }).then(r => setGRNs(r.results||r)).catch(()=>{});
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSupplierChange = (suppId) => {
    set('supplier', suppId);
    set('purchase_order', '');
    set('grn', '');
    if (suppId) loadGRNs(suppId);
  };

  const handlePOChange = (poId) => {
    set('purchase_order', poId);
    const po = pos.find(p => String(p.id) === String(poId));
    if (po) {
      set('sub_total',    po.sub_total);
      set('tax_amount',   po.tax_amount);
      set('total_amount', po.total_amount);
      set('currency',     po.currency);
      if (po.supplier && !form.supplier) set('supplier', po.supplier);
    }
  };

  const calcTotal = () => {
    const sub = parseFloat(form.sub_total||0);
    const tax = parseFloat(form.tax_amount||0);
    set('total_amount', String((sub+tax).toFixed(2)));
  };

  const handleSave = async () => {
    if (!form.invoice_number || !form.supplier || !form.invoice_date || !form.total_amount) {
      toast.error('Invoice number, supplier, date and total amount are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, purchase_order: form.purchase_order||null, grn: form.grn||null };
      if (isEdit) { await invoicesAPI.update(slug, payload); toast.success('Invoice updated.'); }
      else        { await invoicesAPI.create(payload);       toast.success('Invoice recorded.'); }
      navigate('/invoices');
    } catch { toast.error('Save failed. Invoice number may already exist.'); }
    finally  { setSaving(false); }
  };

  if (loading) return <PageWrapper><div className="loading-center"><div className="spinner"/></div></PageWrapper>;

  const total = parseFloat(form.sub_total||0) + parseFloat(form.tax_amount||0);

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isEdit ? 'Edit Invoice' : 'Record Supplier Invoice'}</h1>
          <p>Match supplier invoice to a Purchase Order and GRN for three-way verification</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/invoices')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            {isEdit ? 'Save Changes' : 'Record Invoice'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        <div>
          <SectionCard title="Invoice Details">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Supplier Invoice Number</label>
                <input className="form-control" value={form.invoice_number} onChange={e => set('invoice_number',e.target.value)} placeholder="INV-SUPP-2025-001" disabled={isEdit} />
              </div>
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select className="form-control" value={form.supplier} onChange={e => handleSupplierChange(e.target.value)}>
                  <option value="">— Select Supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Linked Purchase Order</label>
                <select className="form-control" value={form.purchase_order} onChange={e => handlePOChange(e.target.value)}>
                  <option value="">— None / Select PO —</option>
                  {pos.filter(po => !form.supplier || String(po.supplier) === String(form.supplier)).map(po => (
                    <option key={po.id} value={po.id}>{po.po_number} — KES {parseFloat(po.total_amount).toLocaleString()}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Linked GRN (optional)</label>
                <select className="form-control" value={form.grn} onChange={e => set('grn',e.target.value)}>
                  <option value="">— None —</option>
                  {grns.map(g => <option key={g.id} value={g.id}>{g.grn_number} — {new Date(g.delivery_date).toLocaleDateString()}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Date</label>
                <input type="date" className="form-control" value={form.invoice_date} onChange={e => set('invoice_date',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Due Date</label>
                <input type="date" className="form-control" value={form.due_date} onChange={e => set('due_date',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-control" value={form.currency} onChange={e => set('currency',e.target.value)}>
                  {['KES','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Notes">
            <textarea className="form-control" rows={3} value={form.notes} onChange={e => set('notes',e.target.value)} placeholder="Payment terms, matching notes..." />
          </SectionCard>
        </div>

        <div>
          <SectionCard title="Invoice Amounts">
            <div className="form-group">
              <label className="form-label">Sub Total ({form.currency})</label>
              <input type="number" className="form-control" value={form.sub_total} onChange={e => { set('sub_total',e.target.value); }} onBlur={calcTotal} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">VAT / Tax Amount ({form.currency})</label>
              <input type="number" className="form-control" value={form.tax_amount} onChange={e => { set('tax_amount',e.target.value); }} onBlur={calcTotal} placeholder="0.00" />
            </div>
            <hr className="divider" />
            <div className="form-group">
              <label className="form-label" style={{fontWeight:700}}>Total Amount ({form.currency})</label>
              <input type="number" className="form-control" value={form.total_amount} onChange={e => set('total_amount',e.target.value)} placeholder="0.00"
                style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'16px' }} />
            </div>
            <div style={{ background:'var(--gray-50)', padding:'12px', marginTop:'8px', fontSize:'12px', color:'var(--gray-500)', lineHeight:1.6 }}>
              <i className="bi bi-info-circle" /> Sub-total and tax auto-populate when a PO is selected. You can override manually.
            </div>
          </SectionCard>
        </div>
      </div>
    </PageWrapper>
  );
}