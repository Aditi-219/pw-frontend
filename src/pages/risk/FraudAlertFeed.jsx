import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listFraudAlerts, getFraudHeatmap, blockFraudAlert, unblockFraudAlert, escalateFraudAlert } from '../../services/riskService';
import './FraudAlertFeed.css';

const severityVariant = { Critical:'danger', High:'warning', Medium:'info', Low:'default' };

function mapAlert(a) {
  return {
    id: a.id,
    type: String(a.signal_type ?? a.type ?? '—'),
    severity: String(a.severity ?? 'Low'),
    customer: String(a.customer_name ?? a.customer ?? '—'),
    merchant: String(a.merchant_name ?? a.merchant ?? '—'),
    description: String(a.description ?? a.message ?? '—'),
    timestamp: a.created_at ?? a.timestamp ?? '—',
    blocked: Boolean(a.is_blocked ?? a.blocked),
  };
}

export default function FraudAlertFeed() {
  const { notification, notify, closeNotification } = useNotification();

  const [alerts, setAlerts] = useState([]);
  const [heatmap, setHeatmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [alertsResult, heatmapResult] = await Promise.allSettled([listFraudAlerts(), getFraudHeatmap()]);
      if (alertsResult.status === 'fulfilled') setAlerts(alertsResult.value.items.map(mapAlert));
      else notify.error(getErrorMessage(alertsResult.reason, 'Failed to load fraud alerts.'));
      if (heatmapResult.status === 'fulfilled') setHeatmap(heatmapResult.value);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (id, action) => {
    try {
      setBusyId(`${id}-${action}`);
      if (action === 'block') await blockFraudAlert(id);
      else if (action === 'unblock') await unblockFraudAlert(id);
      else if (action === 'escalate') await escalateFraudAlert(id);
      notify.success(`Alert ${action}ed.`);
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, `Failed to ${action} alert.`));
    } finally {
      setBusyId(null);
    }
  };

  const types = ['all', ...new Set(alerts.map(a => a.type))];
  const filtered = typeFilter === 'all' ? alerts : alerts.filter(a => a.type === typeFilter);

  return (
    <PageWrapper title="Fraud Alert Feed" subtitle="Screen 38 — Live fraud signals, block/unblock/escalate">
      <div className="fraud-feed-grid">
        <Card title="Live Feed">
          <div className="fraud-filters">
            {types.map(t => (
              <button key={t} className={`fraud-type-btn ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>{t}</button>
            ))}
          </div>
          {loading ? <Loader text="Loading alerts..." /> : (
            <div className="fraud-alert-list">
              {filtered.map(alert => (
                <div key={alert.id} className={`fraud-alert-item fraud-alert-item--${alert.severity.toLowerCase()}`}>
                  <div className="fraud-alert-head">
                    <Badge variant={severityVariant[alert.severity] ?? 'default'}>{alert.severity}</Badge>
                    <span className="fraud-type">{alert.type}</span>
                    <span className="fraud-time">{alert.timestamp}</span>
                  </div>
                  <div className="fraud-alert-body">
                    <span>{alert.description}</span>
                    <span>{alert.customer} · {alert.merchant}</span>
                  </div>
                  <div className="fraud-alert-actions">
                    {alert.blocked
                      ? <Button variant="secondary" size="sm" onClick={() => handleAction(alert.id, 'unblock')} loading={busyId === `${alert.id}-unblock`}>Unblock</Button>
                      : <Button variant="danger" size="sm" onClick={() => handleAction(alert.id, 'block')} loading={busyId === `${alert.id}-block`}>Block</Button>
                    }
                    <Button variant="ghost" size="sm" onClick={() => handleAction(alert.id, 'escalate')} loading={busyId === `${alert.id}-escalate`}>Escalate</Button>
                  </div>
                </div>
              ))}
              {!filtered.length && <p className="fraud-empty">No fraud alerts.</p>}
            </div>
          )}
        </Card>

        <Card title="Region Heatmap">
          {heatmap ? (
            <pre className="heatmap-json">{JSON.stringify(heatmap, null, 2)}</pre>
          ) : (
            <p className="fraud-empty">No heatmap data.</p>
          )}
        </Card>
      </div>
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
