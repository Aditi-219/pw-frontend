import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listLenders, toggleLender } from '../../services/lendersService';
import './LenderDirectory.css';

const v = { Live: 'success', active: 'success', Degraded: 'warning', Down: 'danger', inactive: 'danger' };

// GET /admin/lenders response schema isn't documented. Mapped
// defensively from plausible field names.
function mapLender(l) {
  return {
    id: l.id,
    name: l.name ?? '—',
    status: l.status ?? (l.is_active ? 'active' : 'inactive'),
    enabled: (l.status ?? '').toLowerCase() === 'active' || Boolean(l.is_active),
    volume: l.volume_30d ?? l.volume ?? '—',
    approval: l.approval_rate ?? l.approval ?? '—',
  };
}

export default function LenderDirectory() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const fetchLenders = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listLenders();
      setLenders(result.items.map(mapLender));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load lenders.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchLenders(); }, [fetchLenders]);

  const handleToggle = async (lender) => {
    try {
      setTogglingId(lender.id);
      await toggleLender(lender.id);
      notify.success(`${lender.name} ${lender.enabled ? 'disabled' : 'enabled'}.`);
      fetchLenders();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to toggle lender.'));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <PageWrapper
      title="Lender Directory"
      subtitle="Screen 24 — Lenders, live status, volume contribution, on/off toggle"
      actions={<Button variant="teal" onClick={() => navigate('/lenders/config')}>+ Add Lender</Button>}
    >
      {loading ? (
        <Loader text="Loading lenders..." />
      ) : (
        <div className="lenders-grid">
          {lenders.map((l) => (
            <Card key={l.id} className="lender-card">
              <div className="lender-card__head">
                <h3>{l.name}</h3>
                <Badge variant={v[l.status] || 'default'}>{l.status}</Badge>
              </div>
              <div className="lender-card__meta">
                <div><span>Volume (30d)</span><strong>{l.volume}</strong></div>
                <div><span>Approval</span><strong>{l.approval}</strong></div>
              </div>
              <div className="lender-card__actions">
                <label className="lender-toggle">
                  <input
                    type="checkbox"
                    checked={l.enabled}
                    onChange={() => handleToggle(l)}
                    disabled={togglingId === l.id}
                  />
                  Enabled
                </label>
                <Button variant="secondary" size="sm" onClick={() => navigate('/lenders/sla')}>SLA</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/lenders/rules')}>Rules</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/lenders/config?id=${l.id}`)}>Edit</Button>
              </div>
            </Card>
          ))}
          {!lenders.length && <p className="lenders-empty">No lenders found.</p>}
        </div>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
