import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import StatCard from '../../components/charts/StatCard';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getDashboard, getActionTray, getLiveStream } from '../../services/profileService';
import './MasterDashboard.css';

const FALLBACK_TREND_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getStageBadge = (stage) => {
  const map = { Disbursed: 'success', Approved: 'info', eNACH: 'purple', Bureau: 'warning', KYC: 'default' };
  return map[stage] || 'default';
};

const severityVariant = { warning: 'warning', danger: 'danger', info: 'info' };

/**
 * None of GET /admin/dashboard, /dashboard/action-tray, or
 * /dashboard/live-stream have documented response schemas. This mapper
 * is intentionally defensive: it reads several plausible field-name
 * candidates and degrades to empty/placeholder states rather than
 * fabricating numbers, so a shape mismatch is visibly "no data" instead
 * of silently wrong data.
 */
function mapDashboard(d) {
  const kpisRaw = d?.kpis ?? d?.stats ?? {};
  const kpis = [
    { label: 'Total Merchants', value: kpisRaw.total_merchants ?? kpisRaw.merchants ?? '—', change: kpisRaw.merchants_change, changeType: 'up', accent: 'primary', subtitle: kpisRaw.merchants_subtitle },
    { label: 'Active Stores', value: kpisRaw.active_stores ?? kpisRaw.stores ?? '—', change: kpisRaw.stores_change, changeType: 'up', accent: 'accent', subtitle: kpisRaw.stores_subtitle },
    { label: 'Lenders Live', value: kpisRaw.lenders_live ?? kpisRaw.lenders ?? '—', change: kpisRaw.lenders_change, changeType: 'down', accent: 'purple', subtitle: kpisRaw.lenders_subtitle },
    { label: "Today's Disbursals", value: kpisRaw.todays_disbursals ?? kpisRaw.disbursals ?? '—', change: kpisRaw.disbursals_change, changeType: 'up', accent: 'primary', subtitle: kpisRaw.disbursals_subtitle },
  ];

  const trendRaw = d?.trend ?? d?.disbursal_trend ?? {};
  const trendData = {
    disbursal: {
      data: trendRaw.disbursal ?? trendRaw.values ?? [],
      labels: trendRaw.labels ?? FALLBACK_TREND_LABELS,
    },
    revenue: {
      data: (d?.revenue_trend ?? {}).values ?? [],
      labels: (d?.revenue_trend ?? {}).labels ?? FALLBACK_TREND_LABELS,
    },
  };

  const recentSignups = (d?.recent_signups ?? d?.recentSignups ?? []).map((s) => ({
    name: String(s.name ?? s.merchant_name ?? '—'),
    region: s.region ?? ([s.city, s.state].filter(Boolean).join(', ') || '—'),
    plan: s.plan ?? '—',
    time: s.time ?? s.created_at ?? '—',
  }));

  const stagePipeline = (d?.funnel ?? d?.stage_pipeline ?? []).map((s) => ({
    label: s.label ?? s.stage ?? '—',
    value: s.value ?? s.count ?? 0,
  }));

  return { kpis, trendData, recentSignups, stagePipeline };
}

function mapActionTray(payload) {
  const items = payload?.items ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
  return items.map((item, i) => ({
    id: item.id ?? i,
    type: item.type ?? 'info',
    label: item.label ?? item.message ?? '—',
    severity: item.severity ?? 'info',
    link: item.link ?? item.url ?? '#',
  }));
}

function mapLiveStream(payload) {
  const items = payload?.items ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
  return items.map((app) => ({
    id: app.id ?? app.application_id ?? '—',
    merchant: app.merchant ?? app.merchant_name ?? '—',
    amount: app.amount ?? '—',
    stage: app.stage ?? app.status ?? '—',
    time: app.time ?? app.created_at ?? '—',
  }));
}

export default function MasterDashboard() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [trendMetric, setTrendMetric] = useState('disbursal');
  const [loading, setLoading] = useState(true);

  const [kpis, setKpis] = useState([]);
  const [trendData, setTrendData] = useState({ disbursal: { data: [], labels: FALLBACK_TREND_LABELS }, revenue: { data: [], labels: FALLBACK_TREND_LABELS } });
  const [recentSignups, setRecentSignups] = useState([]);
  const [stagePipeline, setStagePipeline] = useState([]);
  const [actionTray, setActionTray] = useState([]);
  const [liveApplications, setLiveApplications] = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardRes, trayRes, streamRes] = await Promise.allSettled([
        getDashboard(),
        getActionTray(),
        getLiveStream(),
      ]);

      if (dashboardRes.status === 'fulfilled') {
        const mapped = mapDashboard(dashboardRes.value);
        setKpis(mapped.kpis);
        setTrendData(mapped.trendData);
        setRecentSignups(mapped.recentSignups);
        setStagePipeline(mapped.stagePipeline);
      } else {
        notify.error(getErrorMessage(dashboardRes.reason, 'Failed to load dashboard KPIs.'));
      }

      if (trayRes.status === 'fulfilled') {
        setActionTray(mapActionTray(trayRes.value));
      }

      if (streamRes.status === 'fulfilled') {
        setLiveApplications(mapLiveStream(streamRes.value));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Live stream is meant to feel real-time — poll it lightly.
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        setLiveApplications(mapLiveStream(await getLiveStream()));
      } catch {
        // silent — don't spam toasts on a background poll
      }
    }, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <PageWrapper title="Master Dashboard" subtitle="Single pane of glass — live KPIs across every merchant, store, and lender">
        <Loader text="Loading dashboard..." fullPage={false} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Master Dashboard"
      subtitle="Single pane of glass — live KPIs across every merchant, store, and lender"
      actions={
        <>
          <Button variant="secondary" size="md" onClick={() => navigate('/merchants')}>
            Approve Merchant
          </Button>
          <Button variant="teal" size="md" onClick={() => navigate('/lenders')}>
            Add Lender
          </Button>
          <Button variant="primary" size="md" onClick={() => navigate('/notifications')}>
            Broadcast Notice
          </Button>
        </>
      }
    >
      <div className="master-dashboard">
        <div className="md-kpi-grid">
          {kpis.map((kpi) => (
            <StatCard key={kpi.label} {...kpi} />
          ))}
        </div>

        <div className="md-main-grid">
          <Card className="md-trend-card">
            <div className="md-trend-toggle">
              <button
                className={`md-trend-toggle__btn ${trendMetric === 'disbursal' ? 'md-trend-toggle__btn--active' : ''}`}
                onClick={() => setTrendMetric('disbursal')}
              >
                Disbursal Trend
              </button>
              <button
                className={`md-trend-toggle__btn ${trendMetric === 'revenue' ? 'md-trend-toggle__btn--active' : ''}`}
                onClick={() => setTrendMetric('revenue')}
              >
                Revenue Trend
              </button>
            </div>
            <LineChart
              title={trendMetric === 'disbursal' ? 'Disbursal Volume (₹ Cr)' : 'Revenue (₹ Cr)'}
              data={trendData[trendMetric].data}
              labels={trendData[trendMetric].labels}
              periods={['7d', '30d', '90d']}
            />
          </Card>

          <Card title="Action Tray" subtitle="Items needing Super Admin attention">
            <div className="md-action-tray">
              {actionTray.map((item) => (
                <button
                  key={item.id}
                  className="md-action-item"
                  onClick={() => navigate(item.link)}
                  type="button"
                >
                  <Badge variant={severityVariant[item.severity] || 'info'}>
                    {item.severity === 'danger' ? '●' : item.severity === 'warning' ? '▲' : 'ℹ'}
                  </Badge>
                  <span className="md-action-item__label">{item.label}</span>
                  <span className="md-action-item__arrow">→</span>
                </button>
              ))}
              {!actionTray.length && <p className="md-empty">No items need attention right now.</p>}
            </div>
          </Card>
        </div>

        <div className="md-main-grid">
          <Card title="Live Application Stream" subtitle="Most recent activity across the platform" className="md-stream-card">
            <div className="md-stream-list">
              {liveApplications.map((app) => (
                <div key={app.id} className="md-stream-row">
                  <div className="md-stream-row__main">
                    <span className="md-stream-row__id">{app.id}</span>
                    <span className="md-stream-row__merchant">{app.merchant}</span>
                  </div>
                  <div className="md-stream-row__meta">
                    <span className="md-stream-row__amount">{app.amount}</span>
                    <Badge variant={getStageBadge(app.stage)}>{app.stage}</Badge>
                    <span className="md-stream-row__time">{app.time}</span>
                  </div>
                </div>
              ))}
              {!liveApplications.length && <p className="md-empty">No recent activity.</p>}
            </div>
          </Card>

          <Card title="Recent Merchant Signups">
            <div className="md-signup-list">
              {recentSignups.map((s, i) => (
                <div key={`${s.name}-${i}`} className="md-signup-row">
                  <div className="md-signup-row__avatar">{s.name.charAt(0)}</div>
                  <div className="md-signup-row__info">
                    <span className="md-signup-row__name">{s.name}</span>
                    <span className="md-signup-row__region">{s.region}</span>
                  </div>
                  <div className="md-signup-row__meta">
                    <Badge variant="purple">{s.plan}</Badge>
                    <span className="md-signup-row__time">{s.time}</span>
                  </div>
                </div>
              ))}
              {!recentSignups.length && <p className="md-empty">No recent signups.</p>}
            </div>
          </Card>
        </div>

        <Card title="Application Funnel" subtitle="Today — across all stages">
          {stagePipeline.length
            ? <BarChart data={stagePipeline} color="var(--color-teal)" />
            : <p className="md-empty">No funnel data available.</p>}
        </Card>
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
