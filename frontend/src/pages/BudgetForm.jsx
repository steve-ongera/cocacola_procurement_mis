// pages/BudgetForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { budgetsAPI, departmentsAPI, fiscalYearsAPI, quarterBudgetsAPI, budgetLineItemsAPI } from '../services/api';
import { PageWrapper, SectionCard } from '../components/common';
import { useToast } from '../context/AppContext';
import { useAuth } from '../context/AppContext';

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const Q_LABELS = { Q1:'Q1 Jan–Mar', Q2:'Q2 Apr–Jun', Q3:'Q3 Jul–Sep', Q4:'Q4 Oct–Dec' };
const Q_DATES  = {
  Q1: { start:'2025-01-01', end:'2025-03-31' },
  Q2: { start:'2025-04-01', end:'2025-06-30' },
  Q3: { start:'2025-07-01', end:'2025-09-30' },
  Q4: { start:'2025-10-01', end:'2025-12-31' },
};

const emptyLine = () => ({ item_name:'', description:'', unit:'', quantity:'', unit_price:'', category:'' });

export default function BudgetForm() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const toast    = useToast();
  const { user } = useAuth();
  const isEdit   = !!slug;

  const [departments, setDepartments] = useState([]);
  const [fiscalYears, setFiscalYears] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [loading, setLoading]         = useState(isEdit);
  const [activeQ, setActiveQ]         = useState('Q1');

  const [form, setForm] = useState({
    title: '', fiscal_year: '', department: '', total_amount: '', status: 'draft', notes: '',
  });

  const [quarters, setQuarters] = useState({
    Q1: { allocated_amount: '', start_date: Q_DATES.Q1.start, end_date: Q_DATES.Q1.end, notes: '', items: [emptyLine()] },
    Q2: { allocated_amount: '', start_date: Q_DATES.Q2.start, end_date: Q_DATES.Q2.end, notes: '', items: [emptyLine()] },
    Q3: { allocated_amount: '', start_date: Q_DATES.Q3.start, end_date: Q_DATES.Q3.end, notes: '', items: [emptyLine()] },
    Q4: { allocated_amount: '', start_date: Q_DATES.Q4.start, end_date: Q_DATES.Q4.end, notes: '', items: [emptyLine()] },
  });

  useEffect(() => {
    departmentsAPI.list().then(r => setDepartments(r.results || r)).catch(() => {});
    fiscalYearsAPI.list().then(r => setFiscalYears(r.results || r)).catch(() => {});
    if (isEdit) {
      budgetsAPI.get(slug).then(b => {
        setForm({ title: b.title, fiscal_year: b.fiscal_year, department: b.department, total_amount: b.total_amount, status: b.status, notes: b.notes });
        if (b.quarters?.length) {
          const qMap = {};
          b.quarters.forEach(q => {
            qMap[q.quarter] = {
              id: q.id, slug: q.slug,
              allocated_amount: q.allocated_amount,
              start_date: q.start_date, end_date: q.end_date,
              notes: q.notes,
              items: q.line_items?.length ? q.line_items.map(li => ({ ...li, _id: li.id })) : [emptyLine()],
            };
          });
          setQuarters(prev => ({ ...prev, ...qMap }));
        }
      }).finally(() => setLoading(false));
    }
  }, []);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setQ = (q, k, v) => setQuarters(prev => ({ ...prev, [q]: { ...prev[q], [k]: v } }));
  const setItem = (q, idx, k, v) => {
    const items = [...quarters[q].items];
    items[idx] = { ...items[idx], [k]: v };
    setQ(q, 'items', items);
  };
  const addItem = (q) => setQ(q, 'items', [...quarters[q].items, emptyLine()]);
  const removeItem = (q, idx) => {
    const items = quarters[q].items.filter((_, i) => i !== idx);
    setQ(q, 'items', items.length ? items : [emptyLine()]);
  };

  const calcQTotal = (q) =>
    quarters[q].items.reduce((sum, i) => sum + (parseFloat(i.quantity || 0) * parseFloat(i.unit_price || 0)), 0);

  const totalAlloc = QUARTERS.reduce((s, q) => s + parseFloat(quarters[q].allocated_amount || 0), 0);

  const handleSave = async () => {
    if (!form.title || !form.fiscal_year || !form.department) {
      toast.error('Title, fiscal year and department are required.');
      return;
    }
    setSaving(true);
    try {
      let budget;
      if (isEdit) {
        budget = await budgetsAPI.update(slug, form);
      } else {
        budget = await budgetsAPI.create({ ...form, total_amount: form.total_amount || totalAlloc });
      }

      // Upsert quarters and line items
      for (const q of QUARTERS) {
        const qd = quarters[q];
        if (!qd.allocated_amount) continue;
        let qObj;
        if (qd.slug) {
          qObj = await quarterBudgetsAPI.update(qd.slug, {
            budget: budget.id, quarter: q,
            allocated_amount: qd.allocated_amount,
            start_date: qd.start_date, end_date: qd.end_date, notes: qd.notes,
          });
        } else {
          qObj = await quarterBudgetsAPI.create({
            budget: budget.id, quarter: q,
            allocated_amount: qd.allocated_amount,
            start_date: qd.start_date, end_date: qd.end_date, notes: qd.notes,
          });
        }
        for (const item of qd.items) {
          if (!item.item_name) continue;
          const payload = { quarter_budget: qObj.id, item_name: item.item_name, description: item.description, unit: item.unit, quantity: item.quantity, unit_price: item.unit_price, category: item.category };
          if (item._id) { await budgetLineItemsAPI.update(item.slug, payload); }
          else { await budgetLineItemsAPI.create(payload); }
        }
      }

      toast.success(isEdit ? 'Budget updated.' : 'Budget created.');
      navigate('/budgets');
    } catch (e) {
      toast.error('Save failed. Please check all fields.');
    } finally { setSaving(false); }
  };

  if (loading) return <PageWrapper><div className="loading-center"><div className="spinner" /></div></PageWrapper>;

  return (
    <PageWrapper>
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isEdit ? 'Edit Budget' : 'New Budget'}</h1>
          <p>{isEdit ? 'Update budget details and quarterly allocations' : 'Create an annual budget with 4-quarter planning'}</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/budgets')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <span className="spinner spinner-sm" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Budget'}
          </button>
        </div>
      </div>

      {/* Budget Info */}
      <SectionCard title="Budget Details">
        <div className="form-grid form-grid-2">
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Budget Title</label>
            <input className="form-control" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Procurement Operations Budget FY2025" />
          </div>
          <div className="form-group">
            <label className="form-label">Fiscal Year</label>
            <select className="form-control" value={form.fiscal_year} onChange={e => setF('fiscal_year', e.target.value)}>
              <option value="">— Select Fiscal Year —</option>
              {fiscalYears.map(fy => <option key={fy.id} value={fy.id}>{fy.name}{fy.is_active ? ' (Active)' : ''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-control" value={form.department} onChange={e => setF('department', e.target.value)}>
              <option value="">— Select Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Total Amount (KES)</label>
            <input type="number" className="form-control" value={form.total_amount} onChange={e => setF('total_amount', e.target.value)}
              placeholder={`Auto-calc from quarters: ${totalAlloc.toLocaleString()}`} />
            <div className="form-hint">Leave blank to auto-calculate from quarterly allocations</div>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={e => setF('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Notes</label>
            <textarea className="form-control" rows={3} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Budget justification or additional notes..." />
          </div>
        </div>
      </SectionCard>

      {/* Quarter Allocations */}
      <SectionCard title="Quarterly Allocations & Planned Items"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
            <span className="text-muted">Total Allocated:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>KES {totalAlloc.toLocaleString()}</span>
          </div>
        }
      >
        {/* Quarter tabs */}
        <div className="tabs">
          {QUARTERS.map(q => (
            <div key={q} className={`tab${activeQ === q ? ' active' : ''}`} onClick={() => setActiveQ(q)}>
              {Q_LABELS[q]}
              {quarters[q].allocated_amount && (
                <span className="tab-count">KES {parseFloat(quarters[q].allocated_amount || 0).toLocaleString()}</span>
              )}
            </div>
          ))}
        </div>

        {/* Active quarter panel */}
        {QUARTERS.map(q => activeQ !== q ? null : (
          <div key={q}>
            <div className="form-grid form-grid-3" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Allocated Amount (KES)</label>
                <input type="number" className="form-control" value={quarters[q].allocated_amount}
                  onChange={e => setQ(q, 'allocated_amount', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-control" value={quarters[q].start_date} onChange={e => setQ(q, 'start_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-control" value={quarters[q].end_date} onChange={e => setQ(q, 'end_date', e.target.value)} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Quarter Notes</label>
                <input className="form-control" value={quarters[q].notes} onChange={e => setQ(q, 'notes', e.target.value)} placeholder={`Notes for ${q}...`} />
              </div>
            </div>

            {/* Line items */}
            <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-500)' }}>
                  Planned Items
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="text-xs text-muted">Total: KES {calcQTotal(q).toLocaleString()}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => addItem(q)}>
                    <i className="bi bi-plus-lg" /> Add Item
                  </button>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '160px' }}>Item Name</th>
                      <th style={{ minWidth: '120px' }}>Category</th>
                      <th style={{ width: '80px' }}>Unit</th>
                      <th style={{ width: '90px' }}>Qty</th>
                      <th style={{ width: '110px' }}>Unit Price</th>
                      <th style={{ width: '120px' }}>Total</th>
                      <th style={{ width: '200px' }}>Description</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarters[q].items.map((item, idx) => {
                      const lineTotal = (parseFloat(item.quantity || 0) * parseFloat(item.unit_price || 0));
                      return (
                        <tr key={idx}>
                          <td>
                            <input className="form-control" style={{ padding: '6px 8px' }} value={item.item_name}
                              onChange={e => setItem(q, idx, 'item_name', e.target.value)} placeholder="Item name" />
                          </td>
                          <td>
                            <input className="form-control" style={{ padding: '6px 8px' }} value={item.category}
                              onChange={e => setItem(q, idx, 'category', e.target.value)} placeholder="e.g. ICT" />
                          </td>
                          <td>
                            <input className="form-control" style={{ padding: '6px 8px' }} value={item.unit}
                              onChange={e => setItem(q, idx, 'unit', e.target.value)} placeholder="Units" />
                          </td>
                          <td>
                            <input type="number" className="form-control" style={{ padding: '6px 8px' }} value={item.quantity}
                              onChange={e => setItem(q, idx, 'quantity', e.target.value)} placeholder="0" />
                          </td>
                          <td>
                            <input type="number" className="form-control" style={{ padding: '6px 8px' }} value={item.unit_price}
                              onChange={e => setItem(q, idx, 'unit_price', e.target.value)} placeholder="0.00" />
                          </td>
                          <td className="mono text-sm" style={{ fontWeight: 600 }}>
                            {lineTotal > 0 ? lineTotal.toLocaleString() : '—'}
                          </td>
                          <td>
                            <input className="form-control" style={{ padding: '6px 8px' }} value={item.description}
                              onChange={e => setItem(q, idx, 'description', e.target.value)} placeholder="Specs / notes" />
                          </td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => removeItem(q, idx)}
                              style={{ color: 'var(--danger)' }}>
                              <i className="bi bi-trash" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </SectionCard>

      {/* Sticky save bar */}
      <div style={{
        position: 'sticky', bottom: 0, background: 'var(--white)', borderTop: '1px solid var(--gray-200)',
        padding: '14px 0', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px',
      }}>
        <button className="btn btn-outline" onClick={() => navigate('/budgets')}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving && <span className="spinner spinner-sm" />}
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Budget'}
        </button>
      </div>
    </PageWrapper>
  );
}