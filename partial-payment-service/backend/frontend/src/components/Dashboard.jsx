import React from 'react';

function Card({ title, value, color, onClick }) {
  return (
    <div
      className={`card${onClick ? ' clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <h3>{title}</h3>
      <p className="value" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

export default function Dashboard({ metrics, onNavigate }) {
  if (!metrics || !metrics.orderLevel || !metrics.attemptLevel) return <div className="loading-state">Loading metrics...</div>;

  const { orderLevel, attemptLevel, allOrders, pendingPayments } = metrics;
  const nav = onNavigate || (() => {});

  return (
    <div className="dashboard-content">
      <h2 style={{ marginTop: '0', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>Order-Level Metrics (All Shopify Orders)</h2>
      <div className="metrics-grid">
        <Card
          title="Overall Total Orders"
          value={Number(allOrders?.totalOrders ?? 0).toLocaleString('en-IN')}
          onClick={() => nav('orders')}
        />
        <Card
          title="Pending Payment Orders"
          value={Number(pendingPayments?.count ?? 0).toLocaleString('en-IN')}
          color="var(--warning)"
          onClick={() => nav('pending')}
        />
        <Card
          title="Pending Remaining Balance"
          value={`${Number(pendingPayments?.remainingBalance ?? 0).toLocaleString('en-IN')} INR`}
          color="var(--warning)"
          onClick={() => nav('pending')}
        />
      </div>

      <h2 style={{ marginTop: '30px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>Order-Level Metrics (Deduplicated)</h2>
      <div className="metrics-grid">
        <Card
          title="App-Created Partial Payment Orders"
          value={Number(orderLevel.totalPartialPaymentOrders ?? 0).toLocaleString('en-IN')}
          onClick={() => nav('partial')}
        />
        <Card
          title="Total Advance Collected"
          value={`${Number(orderLevel.totalAdvanceCollected ?? 0).toLocaleString('en-IN')} INR`}
          onClick={() => nav('partial')}
        />
        <Card
          title="Partial Remaining Balance"
          value={`${Number(orderLevel.totalRemainingBalance ?? 0).toLocaleString('en-IN')} INR`}
          onClick={() => nav('partial')}
        />
      </div>

      <h2 style={{ marginTop: '30px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>Attempt-Level Metrics (System Health)</h2>
      <div className="metrics-grid">
        <Card
          title="Total Payment Attempts"
          value={Number(attemptLevel.totalPaymentAttempts ?? 0).toLocaleString('en-IN')}
          onClick={() => nav('attempts', null)}
        />
        <Card
          title="Completed Attempts"
          value={Number(attemptLevel.completedAttempts ?? 0).toLocaleString('en-IN')}
          color="var(--success)"
          onClick={() => nav('attempts', ['SUCCESS'])}
        />
        <Card
          title="Pending Attempts"
          value={Number(attemptLevel.pendingAttempts ?? 0).toLocaleString('en-IN')}
          color="var(--warning)"
          onClick={() => nav('attempts', ['PENDING', 'CREATING_ORDER', 'VERIFYING'])}
        />
        <Card
          title="Failed / Rolled Back Attempts"
          value={Number(attemptLevel.failedAttempts ?? 0).toLocaleString('en-IN')}
          color="var(--critical)"
          onClick={() => nav('attempts', ['FAILED', 'ROLLBACK'])}
        />
      </div>
    </div>
  );
}
