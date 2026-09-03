import React, { useState, useEffect, useCallback } from 'react';
import { dashboardFetch } from './api';
import Dashboard from './components/Dashboard';
import TransactionTable from './components/TransactionTable';
import AttemptsTable from './components/AttemptsTable';
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

// Order-detail tabs (Orders / Partial Payments / Pending Payments) all share the same
// shopify_orders_cache-backed table/endpoint, distinguished only by financial-status filter.
const ORDER_TABS = {
  orders: { title: 'All Orders', financialStatus: null },
  partial: { title: 'Partial Payments', financialStatus: ['PARTIALLY_PAID', 'PAID'] },
  pending: { title: 'Pending Payments', financialStatus: ['PENDING'] }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Data states
  const [metrics, setMetrics] = useState(null);
  const [ordersData, setOrdersData] = useState({ transactions: [], pagination: null });
  const [attemptsData, setAttemptsData] = useState({ attempts: [], pagination: null });
  const [healthData, setHealthData] = useState(null);

  // Filters & Pagination — order tabs (Orders/Partial Payments/Pending Payments) share one
  // search + page state since only one of them is ever visible at a time.
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPage, setOrderPage] = useState(1);

  // Filters & Pagination — Attempts tab (payment_attempts, separate dataset)
  const [attemptsStatusFilter, setAttemptsStatusFilter] = useState(null);
  const [attemptsPage, setAttemptsPage] = useState(1);

  // Date Filter State
  const [datePreset, setDatePreset] = useState('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appliedDateRange, setAppliedDateRange] = useState(getUTCDateRange('last30'));

  const handleApplyDateRange = () => {
    const range = getUTCDateRange(datePreset, customStartDate, customEndDate);
    setAppliedDateRange(range);
    setOrderPage(1);
    setAttemptsPage(1);
  };

  const handleCancelDateRange = () => {
    setDatePreset('last30');
    setCustomStartDate('');
    setCustomEndDate('');
    setAppliedDateRange(getUTCDateRange('last30'));
    setOrderPage(1);
    setAttemptsPage(1);
  };

  // Navigate from a clicked Summary card to its detail tab, applying the card's
  // filter while preserving the currently-selected global date range.
  const navigateToDetail = (tab, attemptStatus = null) => {
    setActiveTab(tab);
    setOrderPage(1);
    setOrderSearch('');
    if (tab === 'attempts') {
      setAttemptsStatusFilter(attemptStatus);
      setAttemptsPage(1);
    }
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
      } else if (ORDER_TABS[activeTab]) {
        const { financialStatus } = ORDER_TABS[activeTab];
        const queryParams = new URLSearchParams({
          page: orderPage,
          limit: 20,
          ...dateParams
        });
        if (financialStatus) queryParams.set('status', financialStatus.join(','));
        if (orderSearch) queryParams.set('search', orderSearch);
        const data = await dashboardFetch(`/api/v1/dashboard/transactions?${queryParams.toString()}`);
        setOrdersData({ transactions: data.transactions, pagination: data.pagination });
      } else if (activeTab === 'attempts') {
        const queryParams = new URLSearchParams({
          page: attemptsPage,
          limit: 20,
          ...dateParams
        });
        if (attemptsStatusFilter) queryParams.set('status', attemptsStatusFilter.join(','));
        const data = await dashboardFetch(`/api/v1/dashboard/attempts?${queryParams.toString()}`);
        setAttemptsData({ attempts: data.attempts, pagination: data.pagination });
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
  }, [activeTab, orderPage, orderSearch, attemptsPage, attemptsStatusFilter, appliedDateRange]);

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

  const TABS = [
    { key: 'summary', label: 'Summary' },
    { key: 'orders', label: 'Orders' },
    { key: 'partial', label: 'Partial Payments' },
    { key: 'pending', label: 'Pending Payments' },
    { key: 'attempts', label: 'Attempts' },
    { key: 'health', label: 'System Health' }
  ];

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
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(t.key);
              if (ORDER_TABS[t.key]) { setOrderPage(1); }
              if (t.key === 'attempts') { setAttemptsPage(1); }
            }}
          >
            {t.label}
          </button>
        ))}
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
          {activeTab === 'summary' && <Dashboard metrics={metrics} onNavigate={navigateToDetail} />}
          {ORDER_TABS[activeTab] && (
            <TransactionTable
              title={ORDER_TABS[activeTab].title}
              transactions={ordersData.transactions}
              pagination={ordersData.pagination}
              searchTerm={orderSearch}
              onSearchChange={(value) => {
                setOrderSearch(value);
                setOrderPage(1);
              }}
              onPageChange={(newPage) => setOrderPage(newPage)}
            />
          )}
          {activeTab === 'attempts' && (
            <AttemptsTable
              attempts={attemptsData.attempts}
              pagination={attemptsData.pagination}
              statusFilter={attemptsStatusFilter}
              onStatusFilterChange={(value) => {
                setAttemptsStatusFilter(value);
                setAttemptsPage(1);
              }}
              onPageChange={(newPage) => setAttemptsPage(newPage)}
            />
          )}
          {activeTab === 'health' && <HealthPanel data={healthData} />}
        </>
      )}
    </div>
  );
}
