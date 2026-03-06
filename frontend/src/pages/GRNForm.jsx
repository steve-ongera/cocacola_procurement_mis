// pages/GRNForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { grnsAPI, purchaseOrdersAPI, suppliersAPI } from '../services/api';
import { PageWrapper, SectionCard } from '../components/common';
import { useToast } from '../context/AppContext';

export default function GRNForm() {
  const navigate      = useNavigate();
  const { slug }      = useParams();
  const [sp]          = useSearchParams();
  const toast         = useToast();
  const isEdit        = !!slug;

  const [pos, setPOs]           = useState([]);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);

  const [form, setForm] = useState({
    purchase_order:'', supplier:'', delivery_date:'', delivery_note_number:'',
    invoice_number:'', remarks:'',
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    purchaseOrdersAPI.list({ status:'acknowledged,issued,partially_received', page_size:100 })
      .then(r => { const list = r.results || r; setPOs(list); })
      .catch(() => {});

    const fromPO = sp.get('from_po');
    if (fromPO) {
      purchaseOrdersAPI.get(fromPO).then(po => {
        setForm(f => ({ ...f, purchase_order: po.id, supplier: po.supplier }));
        loadPOItems(po);
      }).catch(() => {});
    }

    if (isEdit) {
      grnsAPI.get(slug).then(g => {
        setForm({ purchase_order: g.purchase_order, supplier: g.supplier, delivery_date: g.delivery_date,
          delivery_note_number: g.delivery_note_number || '', invoice_number: g.invoice_number || '', remarks: g.remarks || '' });
        setItems(g.line_items?.map(li => ({ ...li, _id: li.id })) || []);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loadPOItems = (po) => {
    setSelectedPO(po);
    setItems((po.line_items || []).map(li => ({
      po_line_item: li.id,
      item_name: li.item_name,
      unit: li.unit,
      unit_price: li.unit_price,
      quantity_ordered: li.quantity,
      quantity_received: li.quantity,
      quantity_accepted: li.quantity,
      quantity_rejected: '0',
      rejection_reason: '',
      batch_number: '',
      expiry_date: '',
    })));
  };

  const handlePOChange = (poId) => {
    set('purchase_order', poId);
    const po = pos.find(p => String(p.id) === String(poId));
    if (po) {
      set('supplier', po.supplier);
      loadPOItems(po);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (idx, k, v) => {
    const a = [...items];
    a[idx] = { ...a[idx], [k]: v };
    // Auto-calc accepted = received - rejected
    if (k === 'quantity_received' || k === 'quantity_rejected') {
      const rec = parseFloat(k === 'quantity_received' ? v : a[idx].quantity_received || 0);
      const rej = parseFloat(k === 'quantity_rejected' ? v : a[idx].quantity_rejected || 0);
      a[idx].quantity_accepted = String(Math.max(0, rec - rej));
    }
    setItems(a);
  };

  const handleSave = async (submitAfter = false) => {
    if (!form.purchase_order || !form.delivery_date) {
      toast.error('Purchase Order and delivery date are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, line_items: items };
      let grn;
      if (isEdit) { grn = await grnsAPI.update(slug, payload); }
      else        { grn = await grnsAPI.create(payload); }
      if (submitAfter) { await grnsAPI.submit(grn.slug); toast.success('GRN created and submitted for verification.'); }
      else { toast.success(isEdit ? 'GRN updated.' : 'GRN saved as draft.'); }
      navigate('/grns');
    } catch { toast.error('Save failed.'); }
    finally  { setSaving(false); }
  };

  if (loading) return <PageWrapper><div className="loading-center"><div className="spinner" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isEdit ? 'Edit GRN' : 'Record Goods Received'}</h1>
          <p>Document delivery of goods against a Purchase Order</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/grns')}>Cancel</button>
          <button className="btn btn-outline" onClick={() => handleSave(false)} disabled={saving}>Save Draft</button>
          <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            <i className="bi bi-truck" /> Submit GRN
          </button>
        </div>
      </div>

      <SectionCard title="Delivery Information">
        <div className="form-grid form-grid-2">
          <div className="form-group">
            <label className="form-label">Purchase Order</label>
            <select className="form-control" value={form.purchase_order} onChange={e => handlePOChange(e.target.value)} disabled={isEdit}>
              <option value="">— Select Purchase Order —</option>
              {pos.map(po => <option key={po.id} value={po.id}>{po.po_number} — {po.supplier_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Delivery Date</label>
            <input type="date" className="form-control" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Supplier Delivery Note No.</label>
            <input className="form-control" value={form.delivery_note_number} onChange={e => set('delivery_note_number', e.target.value)} placeholder="DN-20250228" />
          </div>
          <div className="form-group">
            <label className="form-label">Supplier Invoice No. (if attached)</label>
            <input className="form-control" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="INV-SUP-001" />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Remarks</label>
            <textarea className="form-control" rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any delivery notes, condition remarks..." />
          </div>
        </div>
      </SectionCard>

      {items.length > 0 && (
        <SectionCard title="Items Received" noPad>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{minWidth:'150px'}}>Item</th><th style={{width:'70px'}}>Unit</th>
                  <th style={{width:'90px'}}>Ordered</th><th style={{width:'100px'}}>Received</th>
                  <th style={{width:'90px'}}>Accepted</th><th style={{width:'90px'}}>Rejected</th>
                  <th style={{width:'160px'}}>Rejection Reason</th><th style={{width:'120px'}}>Batch No.</th>
                  <th style={{width:'120px'}}>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{fontWeight:500}}>{item.item_name}</td>
                    <td className="text-sm">{item.unit}</td>
                    <td className="mono text-sm">{parseFloat(item.quantity_ordered||0).toLocaleString()}</td>
                    <td>
                      <input type="number" className="form-control" style={{padding:'5px 8px'}} value={item.quantity_received}
                        onChange={e => setItem(idx,'quantity_received',e.target.value)}
                        max={item.quantity_ordered} min="0" />
                    </td>
                    <td className="mono text-sm" style={{fontWeight:600,color:'var(--success)'}}>{parseFloat(item.quantity_accepted||0).toLocaleString()}</td>
                    <td>
                      <input type="number" className="form-control" style={{padding:'5px 8px'}} value={item.quantity_rejected}
                        onChange={e => setItem(idx,'quantity_rejected',e.target.value)} min="0" />
                    </td>
                    <td>
                      <input className="form-control" style={{padding:'5px 8px'}} value={item.rejection_reason}
                        onChange={e => setItem(idx,'rejection_reason',e.target.value)} placeholder="If any..."
                        disabled={parseFloat(item.quantity_rejected||0)===0} />
                    </td>
                    <td>
                      <input className="form-control" style={{padding:'5px 8px'}} value={item.batch_number}
                        onChange={e => setItem(idx,'batch_number',e.target.value)} placeholder="BAT-00001" />
                    </td>
                    <td>
                      <input type="date" className="form-control" style={{padding:'5px 8px'}} value={item.expiry_date||''}
                        onChange={e => setItem(idx,'expiry_date',e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </PageWrapper>
  );
}