// pages/POForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { purchaseOrdersAPI, suppliersAPI, departmentsAPI, requisitionsAPI } from '../services/api';
import { PageWrapper, SectionCard, Amount } from '../components/common';
import { useToast } from '../context/AppContext';

const emptyItem = () => ({ item_name:'', description:'', unit:'Units', quantity:'1', unit_price:'' });

export default function POForm() {
  const navigate      = useNavigate();
  const { slug }      = useParams();
  const [sp]          = useSearchParams();
  const toast         = useToast();
  const isEdit        = !!slug;

  const [suppliers, setSuppliers]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [loading, setLoading]         = useState(isEdit);

  const [form, setForm] = useState({
    supplier:'', department:'', requisition:'', tender:'', currency:'KES',
    tax_rate:'16', payment_terms:'Net 30 days', delivery_address:'', delivery_date:'', notes:'',
  });
  const [items, setItems] = useState([emptyItem()]);

  useEffect(() => {
    suppliersAPI.list({ status:'active', page_size:100 }).then(r => setSuppliers(r.results || r)).catch(()=>{});
    departmentsAPI.list().then(r => setDepartments(r.results || r)).catch(()=>{});
    const reqSlug = sp.get('from_requisition');
    if (reqSlug) {
      requisitionsAPI.get(reqSlug).then(req => {
        setForm(f => ({ ...f, department: req.department }));
        if (req.items?.length) {
          setItems(req.items.map(i => ({
            item_name: i.item_name, description: i.specifications || '', unit: i.unit,
            quantity: String(i.quantity), unit_price: String(i.estimated_unit_price || ''),
          })));
        }
      }).catch(()=>{});
    }
    if (isEdit) {
      purchaseOrdersAPI.get(slug).then(po => {
        setForm({
          supplier: po.supplier, department: po.department, requisition: po.requisition || '',
          tender: po.tender || '', currency: po.currency, tax_rate: po.tax_rate,
          payment_terms: po.payment_terms, delivery_address: po.delivery_address || '',
          delivery_date: po.delivery_date || '', notes: po.notes || '',
        });
        setItems(po.line_items?.length ? po.line_items.map(li => ({
          ...li, _id: li.id,
          quantity: String(li.quantity), unit_price: String(li.unit_price),
        })) : [emptyItem()]);
      }).finally(() => setLoading(false));
    }
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (idx, k, v) => { const a = [...items]; a[idx] = { ...a[idx], [k]: v }; setItems(a); };
  const addItem    = () => setItems(i => [...i, emptyItem()]);
  const removeItem = idx => setItems(prev => { const n = prev.filter((_,i)=>i!==idx); return n.length ? n : [emptyItem()]; });

  const subTotal = items.reduce((s, i) => s + (parseFloat(i.quantity||0)*parseFloat(i.unit_price||0)), 0);
  const taxAmt   = subTotal * parseFloat(form.tax_rate||0) / 100;
  const total    = subTotal + taxAmt;

  const handleSave = async (issueAfter = false) => {
    if (!form.supplier || !form.department) { toast.error('Supplier and department are required.'); return; }
    if (!items.some(i => i.item_name))       { toast.error('At least one item is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, sub_total: subTotal, tax_amount: taxAmt, total_amount: total,
        line_items: items.filter(i => i.item_name).map(i => ({
          item_name: i.item_name, description: i.description, unit: i.unit,
          quantity: i.quantity, unit_price: i.unit_price,
        })),
      };
      let po;
      if (isEdit) { po = await purchaseOrdersAPI.update(slug, payload); }
      else        { po = await purchaseOrdersAPI.create(payload); }
      if (issueAfter) { await purchaseOrdersAPI.issue(po.slug); toast.success('PO created and issued to supplier.'); }
      else { toast.success(isEdit ? 'PO updated.' : 'PO saved as draft.'); }
      navigate('/purchase-orders');
    } catch { toast.error('Save failed. Check all required fields.'); }
    finally  { setSaving(false); }
  };

  if (loading) return <PageWrapper><div className="loading-center"><div className="spinner" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}</h1>
          <p>Issue a purchase order to a supplier for approved goods or services</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/purchase-orders')}>Cancel</button>
          <button className="btn btn-outline" onClick={() => handleSave(false)} disabled={saving}>Save Draft</button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            <i className="bi bi-send" /> Issue PO
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div>
          <SectionCard title="PO Details">
            <div className="form-grid form-grid-2">
              <div className="form-group">
                <label className="form-label">Supplier</label>
                <select className="form-control" value={form.supplier} onChange={e => set('supplier', e.target.value)}>
                  <option value="">— Select Supplier —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
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
                  {['KES','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">VAT Rate (%)</label>
                <input type="number" className="form-control" value={form.tax_rate} onChange={e => set('tax_rate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Terms</label>
                <select className="form-control" value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)}>
                  {['Net 7 days','Net 14 days','Net 30 days','Net 45 days','Net 60 days','Immediate','On delivery'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Required Delivery Date</label>
                <input type="date" className="form-control" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Delivery Address</label>
                <input className="form-control" value={form.delivery_address} onChange={e => set('delivery_address', e.target.value)} placeholder="e.g. Stores Department, Head Office, Westlands" />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Notes / Special Instructions</label>
                <textarea className="form-control" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any special instructions for supplier..." />
              </div>
            </div>
          </SectionCard>

          {/* Line items */}
          <SectionCard title="Line Items" noPad
            actions={<button className="btn btn-outline btn-sm" onClick={addItem}><i className="bi bi-plus-lg" /> Add Item</button>}
          >
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr><th style={{minWidth:'150px'}}>Item</th><th style={{width:'70px'}}>Unit</th><th style={{width:'80px'}}>Qty</th><th style={{width:'120px'}}>Unit Price</th><th style={{width:'120px'}}>Total</th><th style={{minWidth:'150px'}}>Description</th><th style={{width:'40px'}}></th></tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const t = parseFloat(item.quantity||0)*parseFloat(item.unit_price||0);
                    return (
                      <tr key={idx}>
                        <td><input className="form-control" style={{padding:'6px 8px'}} value={item.item_name} onChange={e=>setItem(idx,'item_name',e.target.value)} placeholder="Item name" /></td>
                        <td><input className="form-control" style={{padding:'6px 8px'}} value={item.unit} onChange={e=>setItem(idx,'unit',e.target.value)} /></td>
                        <td><input type="number" className="form-control" style={{padding:'6px 8px'}} value={item.quantity} onChange={e=>setItem(idx,'quantity',e.target.value)} /></td>
                        <td><input type="number" className="form-control" style={{padding:'6px 8px'}} value={item.unit_price} onChange={e=>setItem(idx,'unit_price',e.target.value)} placeholder="0.00" /></td>
                        <td className="mono text-sm" style={{fontWeight:600}}>{t>0?t.toLocaleString():'—'}</td>
                        <td><input className="form-control" style={{padding:'6px 8px'}} value={item.description} onChange={e=>setItem(idx,'description',e.target.value)} placeholder="Specs..." /></td>
                        <td><button className="btn btn-ghost btn-sm" style={{color:'var(--danger)'}} onClick={()=>removeItem(idx)}><i className="bi bi-trash" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Totals sidebar */}
        <div>
          <SectionCard title="Order Summary">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Sub Total',      value: subTotal },
                { label: `VAT (${form.tax_rate}%)`, value: taxAmt },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                  <span className="text-muted">{r.label}</span>
                  <span className="mono">{form.currency} {r.value.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                </div>
              ))}
              <div style={{ height:'1px', background:'var(--gray-200)', margin:'4px 0' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:'15px' }}>
                <span>TOTAL</span>
                <span className="mono">{form.currency} {total.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageWrapper>
  );
}