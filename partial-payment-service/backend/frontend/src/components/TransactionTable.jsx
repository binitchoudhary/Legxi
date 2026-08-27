import React, { useState } from 'react';

export default function TransactionTable({ transactions, pagination, onFilterChange, onPageChange }) {
  const [filters, setFilters] = useState({
    status: '',
    paymentMode: '',
    search: '',
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    // Debounce search logic can be added here, simplified for now
    onFilterChange(newFilters);
  };

  if (!transactions) return <div className="loading-state">Loading transactions...</div>;

  return (
    <div>
      <div className="filters">
        <input 
          type="text" 
          name="search" 
          placeholder="Search Order or Draft Name..." 
          value={filters.search} 
          onChange={handleFilterChange} 
        />
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Statuses</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="PENDING">PENDING</option>
          <option value="FAILED">FAILED</option>
          <option value="ROLLBACK">ROLLBACK</option>
        </select>
        <select name="paymentMode" value={filters.paymentMode} onChange={handleFilterChange}>
          <option value="">All Modes</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Razorpay">Razorpay</option>
          <option value="Other">Other</option>
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
              <th>Remaining</th>
              <th>Created At</th>
              <th>Notes / Errors</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>No transactions found.</td>
              </tr>
            ) : (
              transactions.map(t => (
                <tr key={t.idempotencyKey}>
                  <td>{t.draftOrderName || '-'}</td>
                  <td>{t.orderName || '-'}</td>
                  <td><span className={`badge ${t.status}`}>{t.status}</span></td>
                  <td>{t.paymentMode}</td>
                  <td>{t.orderTotal ? `${t.orderTotal} ${t.currency}` : '-'}</td>
                  <td>{t.advanceAmount} {t.currency}</td>
                  <td>{t.remainingBalance ? `${t.remainingBalance} ${t.currency}` : '-'}</td>
                  <td>{new Date(t.createdAt).toLocaleString()}</td>
                  <td>
                    {t.errorMessage && <span style={{ color: 'var(--critical)' }}>{t.errorMessage}</span>}
                    {t.staffNote && <span>{t.staffNote}</span>}
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
