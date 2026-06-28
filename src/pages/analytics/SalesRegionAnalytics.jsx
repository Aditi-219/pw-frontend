import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getSalesAnalytics } from '../../services/analyticsService';
import './SalesRegionAnalytics.css';

// GET /admin/analytics/sales response schema isn't documented. Mapped
// defensively from plausible field names.
function mapAnalytics(payload) {
  return {
    regions: (payload?.regions ?? []).map((r) => ({
      name: r.name ?? r.region ?? '—',
      loans: r.loans ?? 0,
      amount: r.amount ?? '—',
      growth: r.growth ?? '',
      topProduct: r.top_product ?? r.topProduct ?? '—',
    })),
    cities: (payload?.top_cities ?? payload?.topCities ?? []).map((c) => ({
      city: c.city ?? '—',
      loans: c.loans ?? 0,
      amount: c.amount ?? '—',
      growth: c.growth ?? '',
    })),
    trend: (payload?.monthly_trend ?? []).map((t) => ({ label: t.label, value: t.value })),
    insight: payload?.insight ?? null,
  };
}

export default function SalesRegionAnalytics() {
  const { notification, notify, closeNotification } = useNotification();

  const [selectedRegion, setSelectedRegion] = useState('all');
  const [data, setData] = useState({ regions: [], cities: [], trend: [], insight: null });
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await getSalesAnalytics({ region: selectedRegion !== 'all' ? selectedRegion : undefined });
      setData(mapAnalytics(payload));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load sales analytics.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const maxTrend = Math.max(1, ...data.trend.map((t) => t.value || 0));

  return (
    <PageWrapper title="Sales & Region Analytics" subtitle="Regional performance and sales insights">
      <div className="sales-analytics">
        <div className="region-summary">
          <Card>
            <div className="summary-header">
              <h3 className="section-title">Regional Overview</h3>
              <select className="region-select" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
                <option value="all">All Regions</option>
                {data.regions.map(region => <option key={region.name} value={region.name}>{region.name}</option>)}
              </select>
            </div>
            {loading ? <Loader text="Loading regions..." /> : (
              <div className="regions-grid">
                {data.regions.map(region => (
                  <div key={region.name} className="region-card">
                    <div className="region-name">{region.name}</div>
                    <div className="region-stats">
                      <div className="stat-item"><span className="stat-label">Loans</span><span className="stat-number">{region.loans}</span></div>
                      <div className="stat-item"><span className="stat-label">Amount</span><span className="stat-number">{region.amount}</span></div>
                      <div className="stat-item"><span className="stat-label">Growth</span><span className={`stat-number ${region.growth.includes('+') ? 'positive' : 'negative'}`}>{region.growth}</span></div>
                    </div>
                    <div className="region-top-product">Top: {region.topProduct}</div>
                  </div>
                ))}
                {!data.regions.length && <p className="sa-empty">No region data available.</p>}
              </div>
            )}
          </Card>
        </div>

        {!loading && (
          <div className="analytics-grid">
            <Card>
              <h3 className="section-title">Top Performing Cities</h3>
              <div className="cities-list">
                {data.cities.map(city => (
                  <div key={city.city} className="city-item">
                    <div className="city-info">
                      <div className="city-name">{city.city}</div>
                      <div className="city-stats"><span>{city.loans} loans</span><span>{city.amount}</span></div>
                    </div>
                    {city.growth && <div className="city-growth">{city.growth}</div>}
                  </div>
                ))}
                {!data.cities.length && <p className="sa-empty">No city data available.</p>}
              </div>
            </Card>

            <Card>
              <h3 className="section-title">Monthly Performance Trend</h3>
              {data.trend.length ? (
                <div className="trend-chart">
                  <div className="trend-line">
                    {data.trend.map((t) => (
                      <div key={t.label} className="line-point" style={{ bottom: `${(t.value / maxTrend) * 80}px` }}>{t.label}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="sa-empty">No trend data available.</p>
              )}
              {data.insight && (
                <div className="insight-box">
                  <div className="insight-icon">📈</div>
                  <div className="insight-text">{data.insight}</div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
