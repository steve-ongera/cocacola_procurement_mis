// pages/Requisitions.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requisitionsAPI, departmentsAPI } from '../services/api';
import {
  StatusBadge, LoadingState, EmptyState, Pagination,
  ConfirmModal, Amount, SectionCard, PageWrapper
} from '../components/common';
import { useToast } from '../context/AppContext';

const STATUSES = ['', 'draft', 'submitted', 'hod_approved', 'procurement_review', 'approved', 'rejected', 'converted_to_po'];
const PRIORITIES = ['', 'low', 'medium', 'high', 'critical'];

export default function Requisitions() {
  const navigate       = useNavigate();
  const toast          = useToast();
  const [searchParams] = useSearchParams();

  const [data, setData]         = useState({ results: [], count: 0 });
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [type, setType]         = useState('');
  const [priority, setPriority] = useState('');
  const [confirm, setConfirm]   = useState(null);  // { action, slug, label }
  const [acting, setActing]     = useState(false);

  const fetchData = () => {
    setLoading(true);
    requisitionsAPI.list({ page, search, status, requisition_type: type, priority })
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page, search, status, type, priority]);

  const handleAction = async () => {
    setActing(true);
    try {
      const { action, slug, extra } = confirm;
      if (action === 'submit')      await requisitionsAPI.submit(slug);
      if (action === 'hod_approve') await requisitionsAPI.hodApprove(slug);
      if (action === 'approve')     await requisitionsAPI.approve(slug);
      if (action === 'reject')      await requisitionsAPI.reject(slug, extra);
      if (action === 'convert')     await requisitionsAPI.convertToPO(slug);
      toast.success(`Requisition ${action}d successfully`);
      fetchData();
    } catch (e) {
      toast.error('Action failed. Please try again.');
    } finally {
      setActing(false);
      setConfirm(null);
    }
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Requisitions</h1>
          <p>Manage planned and emergency procurement requests</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/requisitions/new?type=emergency')}>
            <i className="bi bi-exclamation-octagon" /> Emergency
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/requisitions/new')}>
            <i className="bi bi-plus-lg" /> New Requisition
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="search-box">
          <i className="bi bi-search" />
          <input
            placeholder="Search by title or reference..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="filter-select" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
        <select className="filter-select" value={type} onChange={e => { setType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          <option value="planned">Planned</option>
          <option value="emergency">Emergency</option>
        </select>
        <select className="filter-select" value={priority} onChange={e => { setPriority(e.target.value); setPage(1); }}>
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <SectionCard noPad>
        {loading ? (
          <LoadingState />
        ) : data.results?.length === 0 ? (
          <EmptyState
            icon="bi-file-earmark-text"
            title="No requisitions found"
            description="Create your first requisition to get started"
            action={
              <button className="btn btn-primary" onClick={() => navigate('/requisitions/new')}>
                <i className="bi bi-plus-lg" /> Create Requisition
              </button>
            }
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Est. Cost</th>
                  <th>Status</th>
                  <th>Requested By</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.results.map(req => (
                  <tr key={req.id}>
                    <td>
                      <span
                        className="mono"
                        style={{ cursor: 'pointer', borderBottom: '1px solid var(--gray-200)' }}
                        onClick={() => navigate(`/requisitions/${req.slug}`)}
                      >
                        {req.reference_number}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, maxWidth: '200px' }}>
                      <span
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/requisitions/${req.slug}`)}
                      >
                        {req.title}
                      </span>
                    </td>
                    <td>
                      {req.requisition_type === 'emergency' ? (
                        <span className="badge badge-danger">
                          <i className="bi bi-exclamation-octagon" /> Emergency
                        </span>
                      ) : (
                        <span className="badge badge-default">Planned</span>
                      )}
                    </td>
                    <td className="text-sm">{req.department_name}</td>
                    <td><StatusBadge status={req.priority} /></td>
                    <td><Amount value={req.total_estimated_cost} /></td>
                    <td><StatusBadge status={req.status} /></td>
                    <td className="text-sm text-muted">{req.requested_by_name}</td>
                    <td className="text-sm text-muted mono">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title="View"
                          onClick={() => navigate(`/requisitions/${req.slug}`)}
                        >
                          <i className="bi bi-eye" />
                        </button>
                        {req.status === 'draft' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Submit"
                            onClick={() => setConfirm({ action: 'submit', slug: req.slug, label: 'Submit this requisition for approval?' })}
                          >
                            <i className="bi bi-send" />
                          </button>
                        )}
                        {req.status === 'submitted' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="HOD Approve"
                            onClick={() => setConfirm({ action: 'hod_approve', slug: req.slug, label: 'Approve as Head of Department?' })}
                          >
                            <i className="bi bi-check-lg" />
                          </button>
                        )}
                        {req.status === 'hod_approved' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Final Approve"
                            onClick={() => setConfirm({ action: 'approve', slug: req.slug, label: 'Final approval for this requisition?' })}
                          >
                            <i className="bi bi-check2-all" />
                          </button>
                        )}
                        {req.status === 'approved' && (
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Convert to PO"
                            onClick={() => setConfirm({ action: 'convert', slug: req.slug, label: 'Convert this requisition to a Purchase Order?' })}
                          >
                            <i className="bi bi-arrow-right-circle" />
                          </button>
                        )}
                      </div>
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

      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleAction}
        title="Confirm Action"
        message={confirm?.label}
        loading={acting}
      />
    </PageWrapper>
  );
}