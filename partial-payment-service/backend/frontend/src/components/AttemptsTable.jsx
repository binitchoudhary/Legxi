import React from 'react';

const STATUS_OPTIONS = [
  { label: 'All Attempts', value: null },
  { label: 'SUCCESS', value: ['SUCCESS'] },
  { label: 'PENDING / CREATING_ORDER / VERIFYING', value: ['PENDING', 'CREATING_ORDER', 'VERIFYING'] },
  { label: 'FAILED / ROLLBACK', value: ['FAILED', 'ROLLBACK'] }
];

function optionKey(value) {
  return value ? value.join(',') : 'all';
}

// Backed by payment_attempts via /dashboard/attempts — distinct data source from the
// Orders/Partial Payments/Pending Payments tabs, which read shopify_orders_cache.
export default function AttemptsTable({ attempts, pagination, statusFilter, onStatusFilterChange, onPageChange }) {
  if (!attempts) return <div className="loading-state">Loading attempts...</div>;

  return (
    <div>
      <h2 style={{ marginTop: 0, paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>Payment Attempts</h2>

      <div className="filters">
        <select
          value={optionKey(statusFilter)}
          onChange={(e) => {
            const opt = STATUS_OPTIONS.find(o => optionKey(o.value) === e.target.value);
            onStatusFilterChange(opt ? opt.value : null);
          }}
        >
          {STATUS_OPTIONS.map(o => (
            <option key={optionKey(o.value)} value={optionKey(o.value)}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Draft Order</th>
              <th>Order</th>
              <th>Status</th>
              <th>Mode</th>
              <th>Total</th>
              <th>Advance</th>
              <th>Created At</th>
              <th>Notes / Errors</th>
            </tr>
          </thead>
          <tbody>
            {attempts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '20px' }}>No attempts found.</td>
              </tr>
            ) : (
              attempts.map(a => (
                <tr key={a.idempotencyKey}>
                  <td>{a.draftOrderName || '-'}</td>
                  <td>{a.orderName || '-'}</td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                  <td>{a.paymentMode}</td>
                  <td>{a.orderTotal ? `${a.orderTotal} ${a.currency}` : '-'}</td>
                  <td>{a.advanceAmount} {a.currency}</td>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>
                    {a.errorMessage && <span style={{ color: 'var(--critical)' }}>{a.errorMessage}</span>}
                    {a.staffNote && <span>{a.staffNote}</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)</span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
