// components/common/index.jsx  –  Shared UI primitives

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
const STATUS_MAP = {
  // Generic
  draft:              'badge-default',
  active:             'badge-success',
  inactive:           'badge-default',
  blacklisted:        'badge-danger',
  pending:            'badge-warning',
  completed:          'badge-success',
  cancelled:          'badge-danger',
  failed:             'badge-danger',
  reversed:           'badge-danger',
  processing:         'badge-info',
  // Budget / Requisition
  submitted:          'badge-info',
  approved:           'badge-success',
  rejected:           'badge-danger',
  hod_approved:       'badge-info',
  procurement_review: 'badge-info',
  converted_to_po:    'badge-black',
  // Tender
  published:          'badge-info',
  evaluation:         'badge-warning',
  awarded:            'badge-success',
  closed:             'badge-default',
  // PO
  issued:             'badge-info',
  acknowledged:       'badge-info',
  partially_received: 'badge-warning',
  fully_received:     'badge-success',
  // Invoice
  received:           'badge-info',
  matched:            'badge-info',
  approved_payment:   'badge-warning',
  partially_paid:     'badge-warning',
  paid:               'badge-success',
  disputed:           'badge-danger',
  // GRN
  verified:           'badge-success',
  // Priority
  low:                'badge-default',
  medium:             'badge-info',
  high:               'badge-warning',
  critical:           'badge-danger',
  // Pending approval
  pending_approval:   'badge-warning',
};

export function StatusBadge({ status }) {
  if (!status) return null;
  const cls   = STATUS_MAP[status] || 'badge-default';
  const label = status.replace(/_/g, ' ');
  return <span className={`badge ${cls}`}>{label}</span>;
}

// ─────────────────────────────────────────────
// LOADING STATE
// ─────────────────────────────────────────────
export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="loading-center">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────
export function EmptyState({ icon = 'bi-inbox', title = 'No records', description = '', action }) {
  return (
    <div className="empty-state">
      <i className={`bi ${icon}`} />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────────
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, loading = false }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '13px', color: 'var(--gray-600)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <span className="spinner spinner-sm" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────
export function Pagination({ count, page, pageSize = 20, onChange }) {
  const total = Math.ceil(count / pageSize);
  if (total <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 0', justifyContent: 'flex-end' }}>
      <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginRight: '8px' }}>
        {count} records
      </span>
      <button
        className="btn btn-ghost btn-sm"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        <i className="bi bi-chevron-left" />
      </button>
      {Array.from({ length: Math.min(total, 7) }, (_, i) => {
        const p = i + 1;
        return (
          <button
            key={p}
            className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
            style={{ minWidth: '32px', padding: '5px 8px' }}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        );
      })}
      <button
        className="btn btn-ghost btn-sm"
        disabled={page === total}
        onClick={() => onChange(page + 1)}
      >
        <i className="bi bi-chevron-right" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// AMOUNT DISPLAY
// ─────────────────────────────────────────────
export function Amount({ value, currency = 'KES', className = '' }) {
  const formatted = new Intl.NumberFormat('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
  return (
    <span className={`text-mono ${className}`}>
      {currency} {formatted}
    </span>
  );
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
export function StatCard({ label, value, icon, dark = false, change }) {
  return (
    <div className={`stat-card${dark ? ' dark' : ''}`}>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {change && <div className="stat-change">{change}</div>}
      </div>
      <i className={`bi ${icon} stat-icon`} />
    </div>
  );
}

// ─────────────────────────────────────────────
// DETAIL FIELD
// ─────────────────────────────────────────────
export function DetailField({ label, value, mono = false }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className={`detail-value${mono ? ' text-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// PAGE WRAPPER
// ─────────────────────────────────────────────
export function PageWrapper({ children }) {
  return <div className="page-body">{children}</div>;
}

// ─────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────
export function SectionCard({ title, actions, children, noPad = false }) {
  return (
    <div className="card mb-24">
      {title && (
        <div className="card-header">
          <span className="card-title">{title}</span>
          {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
        </div>
      )}
      <div className={noPad ? '' : 'card-body'}>{children}</div>
    </div>
  );
}