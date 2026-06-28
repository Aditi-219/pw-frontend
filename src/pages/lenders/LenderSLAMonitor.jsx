import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import StatCard from '../../components/charts/StatCard';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getLenderSlaMetrics, exportLenderSlaMetrics } from '../../services/lendersService';
import './LenderSLAMonitor.css';

// GET /admin/lender-sla/metrics response schema isn't documented. Mapped
// defensively from plausible field names; missing pieces fall back to
// placeholders rather than fabricated numbers.
function mapSlaMetrics(payload) {
  const kpis = payload?.kpis ?? payload ?? {};
  return {
    p95Latency: kpis.p95_latency ?? kpis.p95Latency ?? '—',
    p95LatencyChange: kpis.p95_latency_change ?? null,
    approvalRate: kpis.approval_rate ?? kpis.approvalRate ?? '—',
    approvalRateChange: kpis.approval_rate_change ?? null,
    disbursalTime: kpis.disbursal_time ?? kpis.disbursalTime ?? '—',
    disbursalTimeChange: kpis.disbursal_time_change ?? null,
    breaches24h: kpis.breaches_24h ?? kpis.breaches24h ?? '—',
    breachesChange: kpis.breaches_change ?? null,
    latencyTrend: payload?.latency_trend ?? { data: [], labels: [] },
    approvalByLender: (payload?.approval_by_lender ?? payload?.approvalByLender ?? []).map((l) => ({
      label: l.name ?? l.label ?? '—',
      value: l.approval_rate ?? l.value ?? 0,
      color: 'var(--color-teal)',
    })),
  };
}

export default function LenderSLAMonitor() {
  const { notification, notify, closeNotification } = useNotification();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await getLenderSlaMetrics();
      setMetrics(mapSlaMetrics(payload));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load SLA metrics.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportLenderSlaMetrics();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lender-sla-metrics.csv';
      a.click();
      notify.success('Export started — check your downloads.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Lender SLA & Performance Monitor" subtitle="Screen 28 — Latency percentiles, approval, disbursal speed, breach alerts">
        <Loader text="Loading SLA metrics..." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Lender SLA & Performance Monitor"
      subtitle="Screen 28 — Latency percentiles, approval, disbursal speed, breach alerts"
      actions={<Button variant="secondary" onClick={handleExport} loading={exporting}>Export CSV</Button>}
    >
      <div className="sla-kpis">
        <StatCard label="P95 Latency" value={metrics.p95Latency} change={metrics.p95LatencyChange} changeType="down" accent="accent" />
        <StatCard label="Approval Rate" value={metrics.approvalRate} change={metrics.approvalRateChange} changeType="up" accent="primary" />
        <StatCard label="Disbursal Time" value={metrics.disbursalTime} change={metrics.disbursalTimeChange} changeType="up" accent="teal" />
        <StatCard label="Breaches (24h)" value={metrics.breaches24h} change={metrics.breachesChange} changeType="down" accent="accent" />
      </div>

      <div className="sla-charts">
        {metrics.latencyTrend.data?.length ? (
          <LineChart title="Latency trend" data={metrics.latencyTrend.data} labels={metrics.latencyTrend.labels} color="var(--color-sky)" />
        ) : (
          <Card><p className="sla-empty">No latency trend data available.</p></Card>
        )}
        {metrics.approvalByLender.length ? (
          <BarChart title="Approval rate by lender" data={metrics.approvalByLender} />
        ) : (
          <Card><p className="sla-empty">No per-lender approval data available.</p></Card>
        )}
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
