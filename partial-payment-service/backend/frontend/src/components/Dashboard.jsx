import React from 'react';

export default function Dashboard({ metrics }) {
  if (!metrics) return <div className="loading-state">Loading metrics...</div>;

  return (
    <div className="metrics-grid">
      <div className="card">
        <h3>Total Partial Payments</h3>
        <p className="value">{metrics.total}</p>
      </div>
      <div className="card">
        <h3>Completed</h3>
        <p className="value" style={{ color: 'var(--success)' }}>{metrics.completed}</p>
      </div>
      <div className="card">
        <h3>Pending</h3>
        <p className="value" style={{ color: 'var(--warning)' }}>{metrics.pending}</p>
      </div>
      <div className="card">
        <h3>Failed / Rolled Back</h3>
        <p className="value" style={{ color: 'var(--critical)' }}>{metrics.failed + metrics.rolledBack}</p>
      </div>
      <div className="card">
        <h3>Total Advance Collected</h3>
        <p className="value">{metrics.totalAdvanceCollected.toLocaleString()} INR</p>
      </div>
      <div className="card">
        <h3>Today's Payments</h3>
        <p className="value">{metrics.todayPayments}</p>
      </div>
      <div className="card">
        <h3>Today's Advance Collected</h3>
        <p className="value">{metrics.todayAdvanceCollected.toLocaleString()} INR</p>
      </div>
    </div>
  );
}
