import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getLenderAnalytics } from '../../services/analyticsService';
import { listLenders } from '../../services/lendersService';
import './LenderLoanAnalytics.css';

// GET /admin/analytics/lender response schema isn't documented. Mapped
// defensively from plausible field names.
function mapAnalytics(payload) {
  const k = payload?.kpis ?? payload ?? {};
  return {
    stats: [
      { icon: '🏦', label: 'Active Lenders', value: k.active_lenders ?? '—', trend: k.active_lenders_trend ?? '' },
      { icon: '📊', label: 'Total Disbursed', value: k.total_disbursed ?? '—', trend: k.total_disbursed_trend ?? '' },
      { icon: '⭐', label: 'Avg Credit Score', value: k.avg_credit_score ?? '—', trend: k.avg_credit_score_trend ?? '' },
    ],
    lenders: (payload?.lenders ?? []).map((l) => ({
      name: l.name ?? '—',
      total: l.total_disbursed ?? l.total ?? '—',
      active: l.active_borrowers ?? l.active ?? 0,
      avgSize: l.avg_loan_size ?? l.avgSize ?? '—',
      defaultRate: l.default_rate ?? l.defaultRate ?? '—',
    })),
    products: (payload?.product_mix ?? payload?.loanProducts ?? []).map((p) => ({
      name: p.name ?? '—',
      count: p.count ?? 0,
      amount: p.amount ?? '—',
      growth: p.growth ?? '',
    })),
  };
}

export default function LenderLoanAnalytics() {
  const { notification, notify, closeNotification } = useNotification();

  const [lenderOptions, setLenderOptions] = useState([]);
  const [selectedLender, setSelectedLender] = useState('all');
  const [data, setData] = useState({ stats: [], lenders: [], products: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await listLenders();
        setLenderOptions(result.items);
      } catch {
        // non-critical for the filter dropdown
      }
    })();
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await getLenderAnalytics({ lenderId: selectedLender !== 'all' ? selectedLender : undefined });
      setData(mapAnalytics(payload));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load lender analytics.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLender]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const maxCount = Math.max(1, ...data.products.map((p) => p.count));

  return (
    <PageWrapper title="Lender & Loan Analytics" subtitle="Deep dive into lender performance and loan products">
      <div className="lender-analytics">
        <div className="analytics-header">
          <select className="lender-select" value={selectedLender} onChange={(e) => setSelectedLender(e.target.value)}>
            <option value="all">All Lenders</option>
            {lenderOptions.map(lender => <option key={lender.id} value={lender.id}>{lender.name}</option>)}
          </select>
        </div>

        {loading ? <Loader text="Loading analytics..." /> : (
          <>
            <div className="stats-cards">
              {data.stats.map((stat) => (
                <Card key={stat.label}>
                  <div className="stat-card">
                    <div className="stat-icon">{stat.icon}</div>
                    <div className="stat-content">
                      <div className="stat-label">{stat.label}</div>
                      <div className="stat-value">{stat.value}</div>
                      {stat.trend && <div className="stat-trend">{stat.trend}</div>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="analytics-grid">
              <Card>
                <h3 className="section-title">Lender Performance</h3>
                <div className="lender-table">
                  <div className="table-header">
                    <div>Lender</div>
                    <div>Total Disbursed</div>
                    <div>Active Borrowers</div>
                    <div>Avg. Loan Size</div>
                    <div>Default Rate</div>
                  </div>
                  {data.lenders.map(lender => (
                    <div key={lender.name} className="table-row">
                      <div className="lender-name">{lender.name}</div>
                      <div>{lender.total}</div>
                      <div>{lender.active}</div>
                      <div>{lender.avgSize}</div>
                      <div className={`default-rate ${parseFloat(lender.defaultRate) > 3 ? 'high' : 'low'}`}>{lender.defaultRate}</div>
                    </div>
                  ))}
                  {!data.lenders.length && <p className="la-empty">No lender data available.</p>}
                </div>
              </Card>

              <Card>
                <h3 className="section-title">Loan Product Distribution</h3>
                <div className="product-list">
                  {data.products.map(product => (
                    <div key={product.name} className="product-item">
                      <div className="product-header">
                        <span className="product-name">{product.name}</span>
                        {product.growth && <span className="product-growth">{product.growth}</span>}
                      </div>
                      <div className="product-stats">
                        <span>{product.count} loans</span>
                        <span>{product.amount}</span>
                      </div>
                      <div className="product-bar">
                        <div className="bar-fill" style={{ width: `${(product.count / maxCount) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                  {!data.products.length && <p className="la-empty">No product mix data available.</p>}
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
