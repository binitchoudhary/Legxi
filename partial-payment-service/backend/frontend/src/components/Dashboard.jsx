import React from 'react';

export default function Dashboard({ metrics }) {
  if (!metrics || !metrics.orderLevel || !metrics.attemptLevel) return <div className="loading-state">Loading metrics...</div>;

  const { orderLevel, attemptLevel } = metrics;

  return (
    <div className="dashboard-content">
      <h2 style={{ marginTop: '0', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>Order-Level Metrics (Deduplicated)</h2>
      <div className="metrics-grid">
        <div className="card">
          <h3>App-Created Partial Payment Orders</h3>
          <p className="value">{orderLevel.totalPartialPaymentOrders}</p>
        </div>
        <div className="card">
          <h3>Total Advance Collected</h3>
          <p className="value">{Number(orderLevel.totalAdvanceCollected).toLocaleString()} INR</p>
        </div>
        <div className="card">
          <h3>Total Remaining Balance</h3>
          <p className="value">{Number(orderLevel.totalRemainingBalance).toLocaleString()} INR</p>
        </div>
      </div>

      <h2 style={{ marginTop: '30px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>Attempt-Level Metrics (System Health)</h2>
      <div className="metrics-grid">
        <div className="card">
          <h3>Total Payment Attempts</h3>
          <p className="value">{attemptLevel.totalPaymentAttempts}</p>
        </div>
        <div className="card">
          <h3>Completed Attempts</h3>
          <p className="value" style={{ color: 'var(--success)' }}>{attemptLevel.completedAttempts}</p>
        </div>
        <div className="card">
          <h3>Pending Attempts</h3>
          <p className="value" style={{ color: 'var(--warning)' }}>{attemptLevel.pendingAttempts}</p>
        </div>
        <div className="card">
          <h3>Failed / Rolled Back Attempts</h3>
          <p className="value" style={{ color: 'var(--critical)' }}>{attemptLevel.failedAttempts}</p>
        </div>
      </div>
    </div>
  );
}
