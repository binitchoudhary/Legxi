import React from 'react';

// Reused across the Orders / Partial Payments / Pending Payments tabs — all three read
// the same shopify_orders_cache-backed /dashboard/transactions endpoint, differing only
// in which financial-status filter the parent (App.jsx) applies before fetching.
export default function TransactionTable({ title, transactions, pagination, searchTerm, onSearchChange, onPageChange }) {
  if (!transactions) return <div className="loading-state">Loading orders...</div>;

  return (
    <div>
      {title && <h2 style={{ marginTop: 0, paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>{title}</h2>}

      <div className="filters">
        <input
          type="text"
          name="search"
          placeholder="Search Order Name..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Financial Status</th>
              <th>Total</th>
              <th>Received</th>
              <th>Remaining</th>
              <th>Created At</th>
              <th>Updated At</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No orders found.</td>
              </tr>
            ) : (
              transactions.map(t => (
                <tr key={t.orderId || t.idempotencyKey}>
                  <td>{t.orderName || '-'}</td>
                  <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                  <td>{t.orderTotal ? `${t.orderTotal} ${t.currency}` : '-'}</td>
                  <td>{t.advanceAmount} {t.currency}</td>
                  <td>{t.remainingBalance ? `${t.remainingBalance} ${t.currency}` : '-'}</td>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>{t.completedAt ? new Date(t.completedAt).toLocaleString() : '-'}</td>
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
