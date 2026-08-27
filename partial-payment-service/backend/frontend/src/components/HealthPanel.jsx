import React from 'react';

export default function HealthPanel({ data }) {
  if (!data) return <div className="loading-state">Loading health status...</div>;

  return (
    <div>
      <div className="metrics-grid">
        <div className="card">
          <h3>API Status</h3>
          <p className="value" style={{ color: data.health.api === 'ok' ? 'var(--success)' : 'var(--critical)' }}>
            {data.health.api.toUpperCase()}
          </p>
        </div>
        <div className="card">
          <h3>Database</h3>
          <p className="value" style={{ color: data.health.database === 'connected' ? 'var(--success)' : 'var(--critical)' }}>
            {data.health.database.toUpperCase()}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Version: {data.health.databaseVersion}</p>
        </div>
        <div className="card">
          <h3>Environment</h3>
          <p className="value">{data.health.environment}</p>
        </div>
        <div className="card">
          <h3>Uptime</h3>
          <p className="value">{Math.floor(data.health.uptime / 3600)}h {Math.floor((data.health.uptime % 3600) / 60)}m</p>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Recent Failures</h3>
        {data.recentFailures.length === 0 ? (
          <p>No recent failures.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Error</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recentFailures.map((f, i) => (
                  <tr key={i}>
                    <td>{f.orderName || f.draftOrderName}</td>
                    <td style={{ color: 'var(--critical)' }}>{f.errorMessage}</td>
                    <td>{new Date(f.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Rollback Warnings (Manual Action Required)</h3>
        {data.rollbackWarnings.length === 0 ? (
          <p>No pending manual actions.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Reason</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {data.rollbackWarnings.map((w, i) => (
                  <tr key={i}>
                    <td>{w.orderName}</td>
                    <td>{w.reason}</td>
                    <td>{new Date(w.rolledBackAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
