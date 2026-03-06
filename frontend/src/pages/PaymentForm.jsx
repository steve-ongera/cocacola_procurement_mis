// pages/PaymentForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { paymentsAPI, invoicesAPI, suppliersAPI } from '../services/api';
import { PageWrapper, SectionCard, Amount } from '../components/common';
import { useToast } from '../context/AppContext';

const METHODS = [
  { value:'bank_transfer', label:'Bank Transfer',  icon:'bi-bank' },
  { value:'cheque',        label:'Cheque',         icon:'bi-file-text' },
  { value:'mobile_money',  label:'Mobile Money',   icon:'bi-phone' },
  { value:'cash',          label:'Cash',           icon:'bi-cash-stack' },
];

export default function PaymentForm() {
  const navigate   = useNavigate();
  const { slug }   = useParams();
  const [sp]       = useSearchParams();
  const toast      = useToast();
  const isEdit     = !!slug;

  const [invoices, setInvoices]   = useState([]);
  const [saving, setSaving]       = useState(false);
  const [loading, setLoading]     = useState(isEdit);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [form, setForm] = useState({
    invoice:'', supplier:'', amount:'', currency:'KES', payment_method:'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    transaction_reference:'', bank_name:'', account_number:'', remarks:'',
  });

  useEffect(() => {
    invoicesAPI.list({ status:'approved,partially_paid', page_size:100 }).then(r => {
      const list = r.results || r;
      setInvoices(list);
      const fromInv = sp.get('from_invoice');
      if (fromInv) {
        const inv = list.find(i => i.slug === fromInv);
        if (inv) handleInvoiceSelect(inv, list);
      }
    }).catch(()=>{});

    if (isEdit) {
      paymentsAPI.get(slug).then(p => {
        setForm({ invoice: p.invoice, supplier: p.supplier, amount: p.amount, currency: p.currency,
          payment_method: p.payment_method, payment_date: p.payment_date,
          transaction_reference: p.transaction_reference || '', bank_name: p.bank_name || '',
          account_number: p.account_number || '', remarks: p.remarks || '' });
      }).finally(() => setLoading(false));
    }
  }, []);

  const handleInvoiceSelect = (inv, list) => {
    const src = inv || (list || invoices).find(i => String(i.id) === String(form.invoice));
    if (!src) return;
    setSelectedInvoice(src);
    setForm(f => ({
      ...f, invoice: src.id, supplier: src.supplier, amount: src.balance || src.total_amount,
      currency: src.currency, bank_name: src.supplier_bank_name || '', account_number: src.supplier_bank_account || '',
    }));
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.invoice || !form.amount || !form.payment_date) {
      toast.error('Invoice, amount and payment date are required.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit) { await paymentsAPI.update(slug, form); toast.success('Payment updated.'); }
      else        { await paymentsAPI.create(form);       toast.success('Payment recorded.'); }
      navigate('/payments');
    } catch { toast.error('Save failed.'); }
    finally  { setSaving(false); }
  };

  if (loading) return <PageWrapper><div className="loading-center"><div className="spinner"/></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isEdit ? 'Edit Payment' : 'Record Payment'}</h1>
          <p>Process payment against an approved supplier invoice</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/payments')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            {isEdit ? 'Save Changes' : 'Record Payment'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' }}>
        <div>
          <SectionCard title="Payment Details">
            <div className="form-grid form-grid-2">
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Invoice</label>
                <select className="form-control" value={form.invoice} onChange={e => handleInvoiceSelect(null, invoices.filter(i=>String(i.id)===e.target.value))} disabled={isEdit}>
                  <option value="">— Select Invoice —</option>
                  {invoices.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {inv.supplier_name} — Balance: {inv.currency} {parseFloat(inv.balance||0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input type="date" className="form-control" value={form.payment_date} onChange={e => set('payment_date',e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-control" value={form.currency} onChange={e => set('currency',e.target.value)}>
                  {['KES','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{fontWeight:700}}>Amount ({form.currency})</label>
                <input type="number" className="form-control" value={form.amount} onChange={e => set('amount',e.target.value)}
                  style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:'16px'}} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Transaction Reference</label>
                <input className="form-control" value={form.transaction_reference} onChange={e => set('transaction_reference',e.target.value)} placeholder="TXN-123456" />
              </div>
            </div>
          </SectionCard>

          {/* Payment method */}
          <SectionCard title="Payment Method">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px' }}>
              {METHODS.map(m => (
                <div key={m.value}
                  onClick={() => set('payment_method', m.value)}
                  style={{
                    border: `2px solid ${form.payment_method===m.value?'var(--black)':'var(--gray-200)'}`,
                    background: form.payment_method===m.value?'var(--black)':'var(--white)',
                    color: form.payment_method===m.value?'var(--white)':'var(--gray-600)',
                    padding:'12px 8px', textAlign:'center', cursor:'pointer', transition:'all .15s',
                  }}
                >
                  <i className={`bi ${m.icon}`} style={{fontSize:'18px',display:'block',marginBottom:'6px'}} />
                  <span style={{fontSize:'11px',fontWeight:600}}>{m.label}</span>
                </div>
              ))}
            </div>

            {['bank_transfer','cheque'].includes(form.payment_method) && (
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input className="form-control" value={form.bank_name} onChange={e => set('bank_name',e.target.value)} placeholder="Equity Bank" />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input className="form-control" value={form.account_number} onChange={e => set('account_number',e.target.value)} placeholder="0190000001234" />
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Remarks">
            <textarea className="form-control" rows={2} value={form.remarks} onChange={e => set('remarks',e.target.value)} placeholder="Payment remarks or internal notes..." />
          </SectionCard>
        </div>

        {/* Invoice summary */}
        {selectedInvoice && (
          <div>
            <SectionCard title="Invoice Summary">
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <div style={{background:'var(--gray-50)',padding:'10px 12px',marginBottom:'8px'}}>
                  <div style={{fontSize:'11px',color:'var(--gray-500)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'2px'}}>Invoice</div>
                  <div style={{fontFamily:'var(--font-mono)',fontWeight:700,fontSize:'14px'}}>{selectedInvoice.invoice_number}</div>
                </div>
                {[
                  {label:'Supplier',      value:selectedInvoice.supplier_name},
                  {label:'Invoice Total', value:<Amount value={selectedInvoice.total_amount} />},
                  {label:'Amount Paid',   value:<span style={{color:'var(--success)'}}><Amount value={selectedInvoice.amount_paid} /></span>},
                  {label:'Balance Due',   value:<span style={{fontWeight:700,color:parseFloat(selectedInvoice.balance||0)>0?'var(--danger)':'var(--success)'}}><Amount value={selectedInvoice.balance} /></span>},
                  {label:'Due Date',      value:new Date(selectedInvoice.due_date).toLocaleDateString()},
                ].map(r => (
                  <div key={r.label} style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                    <span className="text-muted">{r.label}</span>
                    <span>{r.value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}