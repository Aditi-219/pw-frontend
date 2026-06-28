import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  getApiStatus,
  getQueueDepth,
  getIntegrationsHealth,
  getErrorLogs,
  triggerMaintenance,
} from '../../services/profileService';
import './SystemHealth.css';

// None of these system-health endpoints have documented response
// schemas. Mappers below try several plausible field names and degrade
// to empty lists rather than guessing wrong numbers.
function mapServices(payload) {
  const list = payload?.services ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
  return list.map((s) => ({
    name: s.name ?? s.service ?? '—',
    uptime: s.uptime ?? '—',
    status: s.status ?? 'operational',
    latency: s.latency ?? s.latency_ms ? `${s.latency ?? s.latency_ms}ms` : '—',
  }));
}

function mapQueues(payload) {
  const list = payload?.queues ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
  return list.map((q) => ({
    name: q.name ?? q.queue ?? '—',
    pending: q.pending ?? 0,
    failed: q.failed ?? 0,
    retried: q.retried ?? 0,
  }));
}

function mapIntegrations(payload) {
  const list = payload?.items ?? payload?.integrations ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
  return list.map((i) => ({
    name: i.name ?? '—',
    status: i.status ?? 'live',
    lastSuccess: i.last_success ?? i.lastSuccess ?? '—',
  }));
}

function mapErrors(payload) {
  const list = payload?.items ?? payload?.logs ?? payload?.data ?? (Array.isArray(payload) ? payload : []);
  return list.map((e, i) => ({
    id: e.id ?? `ERR-${i}`,
    service: e.service ?? '—',
    message: e.message ?? '—',
    time: e.time ?? e.created_at ?? '—',
    level: e.level ?? 'warning',
  }));
}

export default function SystemHealth() {
  const { notification, notify, closeNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [queues, setQueues] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [errorFeed, setErrorFeed] = useState([]);

  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const [bannerMessage, setBannerMessage] = useState(
    'Scheduled maintenance — some features may be temporarily unavailable.'
  );

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, queueRes, integrationsRes, errorsRes] = await Promise.allSettled([
        getApiStatus(),
        getQueueDepth(),
        getIntegrationsHealth(),
        getErrorLogs(),
      ]);

      if (statusRes.status === 'fulfilled') setServices(mapServices(statusRes.value));
      else notify.error(getErrorMessage(statusRes.reason, 'Failed to load service status.'));

      if (queueRes.status === 'fulfilled') setQueues(mapQueues(queueRes.value));
      if (integrationsRes.status === 'fulfilled') setIntegrations(mapIntegrations(integrationsRes.value));
      if (errorsRes.status === 'fulfilled') setErrorFeed(mapErrors(errorsRes.value.items ?? errorsRes.value));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const statusVariant = { operational: 'success', degraded: 'warning', down: 'danger', live: 'success' };
  const queuePressure = (q) => (q.failed > 3 ? 'danger' : q.failed > 0 ? 'warning' : 'success');

  const handleToggleMaintenance = async () => {
    const nextEnabled = !maintenanceActive;
    try {
      setMaintenanceSaving(true);
      await triggerMaintenance({ enabled: nextEnabled, banner: nextEnabled ? bannerMessage : undefined });
      setMaintenanceActive(nextEnabled);
      setMaintenanceOpen(false);
      notify.success(nextEnabled ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to update maintenance mode.'));
    } finally {
      setMaintenanceSaving(false);
    }
  };

  return (
    <PageWrapper
      title="System Health & Monitoring"
      subtitle="Real-time view of API health, queue depth, and third-party integration status"
      actions={
        <Button
          variant={maintenanceActive ? 'danger' : 'secondary'}
          onClick={() => setMaintenanceOpen(true)}
        >
          {maintenanceActive ? 'Maintenance Mode: ON' : 'Trigger Maintenance Mode'}
        </Button>
      }
    >
      <div className="system-health">
        {maintenanceActive && (
          <div className="sh-banner">
            <span>🛠 {bannerMessage}</span>
          </div>
        )}

        {loading ? (
          <Loader text="Loading system health..." />
        ) : (
          <>
            <Card title="API Uptime by Service">
              <div className="sh-service-grid">
                {services.map((s) => (
                  <div key={s.name} className="sh-service-card">
                    <div className="sh-service-card__top">
                      <span className="sh-service-card__name">{s.name}</span>
                      <Badge variant={statusVariant[s.status] || 'default'}>{s.status}</Badge>
                    </div>
                    <div className="sh-service-card__metrics">
                      <div>
                        <span className="sh-metric-label">Uptime</span>
                        <span className="sh-metric-value">{s.uptime}</span>
                      </div>
                      <div>
                        <span className="sh-metric-label">Latency</span>
                        <span className="sh-metric-value">{s.latency}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!services.length && <p className="sh-empty">No service status data available.</p>}
              </div>
            </Card>

            <div className="sh-grid-2">
              <Card title="Queue Depth" subtitle="Redis jobs — pending / failed / retried">
                <div className="sh-queue-list">
                  {queues.map((q) => (
                    <div key={q.name} className="sh-queue-row">
                      <div className="sh-queue-row__name">
                        <Badge variant={queuePressure(q)}>●</Badge>
                        <span>{q.name}</span>
                      </div>
                      <div className="sh-queue-row__stats">
                        <span><strong>{q.pending}</strong> pending</span>
                        <span className={q.failed > 0 ? 'sh-queue-failed' : ''}><strong>{q.failed}</strong> failed</span>
                        <span><strong>{q.retried}</strong> retried</span>
                      </div>
                    </div>
                  ))}
                  {!queues.length && <p className="sh-empty">No queue data available.</p>}
                </div>
              </Card>

              <Card title="Third-Party Integration Status">
                <div className="sh-integration-list">
                  {integrations.map((i) => (
                    <div key={i.name} className="sh-integration-row">
                      <span className="sh-integration-row__name">{i.name}</span>
                      <div className="sh-integration-row__right">
                        <span className="sh-integration-row__time">{i.lastSuccess}</span>
                        <Badge variant={statusVariant[i.status] || 'default'}>{i.status}</Badge>
                      </div>
                    </div>
                  ))}
                  {!integrations.length && <p className="sh-empty">No integration data available.</p>}
                </div>
              </Card>
            </div>

            <Card title="Error Log Feed" subtitle="Live stream of platform errors and warnings">
              <div className="sh-error-list">
                {errorFeed.map((e) => (
                  <div key={e.id} className={`sh-error-row sh-error-row--${e.level}`}>
                    <div className="sh-error-row__main">
                      <Badge variant={e.level === 'error' ? 'danger' : 'warning'}>{e.id}</Badge>
                      <span className="sh-error-row__service">{e.service}</span>
                      <span className="sh-error-row__message">{e.message}</span>
                    </div>
                    <span className="sh-error-row__time">{e.time}</span>
                  </div>
                ))}
                {!errorFeed.length && <p className="sh-empty">No errors in the recent log window.</p>}
              </div>
            </Card>
          </>
        )}
      </div>

      <Modal
        isOpen={maintenanceOpen}
        onClose={() => setMaintenanceOpen(false)}
        title="Maintenance Mode"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMaintenanceOpen(false)} disabled={maintenanceSaving}>Cancel</Button>
            <Button
              variant={maintenanceActive ? 'secondary' : 'danger'}
              onClick={handleToggleMaintenance}
              loading={maintenanceSaving}
            >
              {maintenanceActive ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
            </Button>
          </>
        }
      >
        <p style={{ margin: '0 0 0.75rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Enabling maintenance mode will display a banner across the platform and may restrict write actions.
        </p>
        <textarea
          className="sh-banner-input"
          rows={3}
          value={bannerMessage}
          onChange={(e) => setBannerMessage(e.target.value)}
        />
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
