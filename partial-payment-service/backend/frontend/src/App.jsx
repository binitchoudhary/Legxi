import React, { useState, useEffect, useCallback } from 'react';
import { dashboardFetch } from './api';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import HealthPanel from './components/HealthPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Data states
  const [metrics, setMetrics] = useState(null);
  const [transactionsData, setTransactionsData] = useState({ transactions: [], pagination: null });
  const [healthData, setHealthData] = useState(null);

  // Filters & Pagination for transactions
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoading(true);
    setError(null);

    try {
      if (activeTab === 'summary') {
        const data = await dashboardFetch('/api/v1/dashboard/metrics');
        setMetrics(data.metrics);
      } else if (activeTab === 'transactions') {
        const queryParams = new URLSearchParams({
          page,
          limit: 20,
          ...filters
        });
        const data = await dashboardFetch(`/api/v1/dashboard/transactions?${queryParams.toString()}`);
        setTransactionsData({ transactions: data.transactions, pagination: data.pagination });
      } else if (activeTab === 'health') {
        const data = await dashboardFetch('/api/v1/dashboard/health');
        setHealthData(data);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      if (!isAutoRefresh) setLoading(false);
    }
  }, [activeTab, page, filters]);

  // Initial load and tab change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="dashboard-container">
      <div className="header-actions">
        <h1>Partial Payment Dashboard</h1>
        <div>
          <span style={{ marginRight: '15px', color: 'var(--text-muted)', fontSize: '12px' }}>
            {lastRefreshed ? `Last updated: ${lastRefreshed.toLocaleTimeString()}` : ''}
          </span>
          <button className="refresh-btn" onClick={() => fetchData()}>
            {loading ? 'Refreshing...' : 'Manual Refresh'}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('transactions');
            setPage(1); // Reset page on tab switch
          }}
        >
          Transactions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          System Health
        </button>
      </div>

      {error ? (
        <div className="error-state">
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button className="refresh-btn" onClick={() => fetchData()} style={{ marginTop: '10px' }}>
            Retry
          </button>
        </div>
      ) : loading && !lastRefreshed ? (
        <div className="loading-state">Loading dashboard...</div>
      ) : (
        <>
          {activeTab === 'summary' && <Dashboard metrics={metrics} />}
          {activeTab === 'transactions' && (
            <TransactionTable 
              transactions={transactionsData.transactions}
              pagination={transactionsData.pagination}
              onFilterChange={(newFilters) => {
                setFilters(newFilters);
                setPage(1); // Reset to page 1 on filter change
              }}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
          {activeTab === 'health' && <HealthPanel data={healthData} />}
        </>
      )}
    </div>
  );
}
