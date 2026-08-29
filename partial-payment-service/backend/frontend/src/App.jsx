import React, { useState, useEffect, useCallback } from 'react';
import { dashboardFetch } from './api';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import HealthPanel from './components/HealthPanel';

// Utility for getting UTC ISO boundaries for local dates
function getUTCDateRange(preset, customStart, customEnd) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'last7':
      start.setDate(start.getDate() - 6);
      break;
    case 'last30':
      start.setDate(start.getDate() - 29);
      break;
    case 'wtd':
      const day = start.getDay(); // 0 is Sunday
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
      start.setDate(diff);
      break;
    case 'mtd':
      start.setDate(1);
      break;
    case 'custom':
      if (customStart) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
      }
      break;
    default:
      return { dateFrom: null, dateTo: null };
  }

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString()
  };
}

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

  // Date Filter State
  const [datePreset, setDatePreset] = useState('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedDateRange, setAppliedDateRange] = useState(getUTCDateRange('last30'));

  const handleApplyDateRange = () => {
    const range = getUTCDateRange(datePreset, customStartDate, customEndDate);
    setAppliedDateRange(range);
    setPage(1); // Reset pagination on date change
  };

  const handleCancelDateRange = () => {
    setDatePreset('last30');
    setCustomStartDate('');
    setCustomEndDate('');
    setAppliedDateRange(getUTCDateRange('last30'));
    setPage(1);
  };

  const fetchData = useCallback(async (isAutoRefresh = false) => {
    if (!isAutoRefresh) setLoading(true);
    setError(null);

    const dateParams = {};
    if (appliedDateRange.dateFrom) dateParams.dateFrom = appliedDateRange.dateFrom;
    if (appliedDateRange.dateTo) dateParams.dateTo = appliedDateRange.dateTo;

    try {
      if (activeTab === 'summary') {
        const queryParams = new URLSearchParams(dateParams);
        const data = await dashboardFetch(`/api/v1/dashboard/metrics?${queryParams.toString()}`);
        setMetrics(data.metrics);
      } else if (activeTab === 'transactions') {
        const queryParams = new URLSearchParams({
          page,
          limit: 20,
          ...filters,
          ...dateParams
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
  }, [activeTab, page, filters, appliedDateRange]);

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
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <h1>Partial Payment Dashboard</h1>
        
        {/* Date Filter UI */}
        <div className="date-filter" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} style={{ padding: '6px', borderRadius: '4px' }}>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 days</option>
            <option value="last30">Last 30 days</option>
            <option value="wtd">Week to date</option>
            <option value="mtd">Month to date</option>
            <option value="custom">Custom range</option>
          </select>
          
          {datePreset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={{ padding: '5px' }} />
              <span>to</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={{ padding: '5px' }} />
            </div>
          )}
          
          <button className="refresh-btn" onClick={handleApplyDateRange} style={{ padding: '6px 12px' }}>Apply</button>
          {datePreset === 'custom' && <button className="refresh-btn" onClick={handleCancelDateRange} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 12px' }}>Cancel</button>}
        </div>

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
