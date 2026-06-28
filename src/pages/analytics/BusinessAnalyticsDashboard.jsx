import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getBusinessAnalytics, saveAnalyticsSnapshot } from '../../services/analyticsService';
import './BusinessAnalyticsDashboard.css';

// GET /admin/analytics/business response schema isn't documented. Mapped
// defensively from plausible field names; missing pieces fall back to
// placeholders rather than fabricated numbers.
function mapAnalytics(payload) {
  const k = payload?.kpis ?? payload ?? {};
  return {
    metrics: [
      { label: 'Total Loan Disbursed', value: k.total_disbursed ?? '—', change: k.total_disbursed_change ?? '', trend: 'up' },
      { label: 'Active Borrowers', value: k.active_borrowers ?? '—', change: k.active_borrowers_change ?? '', trend: 'up' },
      { label: 'Avg. Loan Size', value: k.avg_loan_size ?? '—', change: k.avg_loan_size_change ?? '', trend: 'down' },
      { label: 'Default Rate', value: k.default_rate ?? '—', change: k.default_rate_change ?? '', trend: 'down' },
    ],
    volumeTrend: (payload?.volume_trend ?? []).map((v) => ({ label: v.label, height: v.value })),
    topPerformers: (payload?.top_lenders ?? payload?.topPerformers ?? []).map((l) => ({
      lender: l.name ?? l.lender ?? '—',
      loans: l.loans ?? l.count ?? 0,
      amount: l.amount ?? '—',
      growth: l.growth ?? '',
    })),
  };
}

export default function BusinessAnalyticsDashboard() {
  const { notification, notify, closeNotification } = useNotification();
  const [timeRange, setTimeRange] = useState('month');
  const [data, setData] = useState({ metrics: [], volumeTrend: [], topPerformers: [] });
  const [loading, setLoading] = useState(true);
  const [snapshotting, setSnapshotting] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await getBusinessAnalytics({ period: timeRange });
      setData(mapAnalytics(payload));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load analytics.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleSnapshot = async () => {
    try {
      setSnapshotting(true);
      await saveAnalyticsSnapshot();
      notify.success('Snapshot saved for board reporting.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save snapshot.'));
    } finally {
      setSnapshotting(false);
    }
  };

  const maxHeight = Math.max(1, ...data.volumeTrend.map((v) => v.height || 0));

  return (
    <PageWrapper
      title="Business Analytics Dashboard"
      subtitle="Key business metrics and performance indicators"
    >
      <div className="business-analytics">
        <div className="time-range-selector">
          <button className={`range-btn ${timeRange === 'week' ? 'active' : ''}`} onClick={() => setTimeRange('week')}>Week</button>
          <button className={`range-btn ${timeRange === 'month' ? 'active' : ''}`} onClick={() => setTimeRange('month')}>Month</button>
          <button className={`range-btn ${timeRange === 'quarter' ? 'active' : ''}`} onClick={() => setTimeRange('quarter')}>Quarter</button>
          <button className={`range-btn ${timeRange === 'year' ? 'active' : ''}`} onClick={() => setTimeRange('year')}>Year</button>
          <button className="range-btn" onClick={handleSnapshot} disabled={snapshotting}>{snapshotting ? 'Saving…' : 'Save Snapshot'}</button>
        </div>

        {loading ? <Loader text="Loading analytics..." /> : (
          <>
            <div className="metrics-grid">
              {data.metrics.map(metric => (
                <Card key={metric.label}>
                  <div className="metric-card">
                    <div className="metric-label">{metric.label}</div>
                    <div className="metric-value">{metric.value}</div>
                    {metric.change && <div className={`metric-change ${metric.trend}`}>{metric.change}</div>}
                  </div>
                </Card>
              ))}
            </div>

            <div className="analytics-grid">
              <Card>
                <h3 className="section-title">Loan Volume Trend</h3>
                {data.volumeTrend.length ? (
                  <div className="chart-placeholder">
                    <div className="bar-chart">
                      {data.volumeTrend.map((v) => (
                        <div key={v.label} className="bar" style={{ height: `${(v.height / maxHeight) * 100}px` }}>{v.label}</div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="ba-empty">No trend data available.</p>
                )}
              </Card>

              <Card>
                <h3 className="section-title">Top Performing Lenders</h3>
                <div className="lenders-list">
                  {data.topPerformers.map(lender => (
                    <div key={lender.lender} className="lender-row">
                      <div className="lender-name">{lender.lender}</div>
                      <div className="lender-stats">
                        <span>{lender.loans} loans</span>
                        <span>{lender.amount}</span>
                        {lender.growth && <span className="growth">{lender.growth}</span>}
                      </div>
                    </div>
                  ))}
                  {!data.topPerformers.length && <p className="ba-empty">No lender data available.</p>}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
