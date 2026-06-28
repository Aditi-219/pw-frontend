import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listLenders, listLenderWaterfalls, createLenderWaterfall, updateLenderWaterfall, simulateLenderWaterfall } from '../../services/lendersService';
import './WaterfallBuilder.css';

export default function WaterfallBuilder() {
  const { notification, notify, closeNotification } = useNotification();

  const [lenders, setLenders] = useState([]);
  const [waterfall, setWaterfall] = useState(null); // the active waterfall record, if any
  const [order, setOrder] = useState([]); // array of lender ids in priority order
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [simPayload, setSimPayload] = useState('{\n  "loan_amount": 50000,\n  "credit_score": 750,\n  "merchant_tier": "Gold"\n}');
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [lendersResult, waterfallsResult] = await Promise.all([listLenders(), listLenderWaterfalls()]);
      setLenders(lendersResult.items);
      const active = waterfallsResult.items.find((w) => w.is_active) ?? waterfallsResult.items[0] ?? null;
      setWaterfall(active);
      setOrder(active?.priority_order ?? lendersResult.items.map((l) => l.id));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load waterfall data.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const lenderName = (id) => lenders.find((l) => l.id === id)?.name ?? `Lender #${id}`;

  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (waterfall) {
        await updateLenderWaterfall(waterfall.id, { name: waterfall.name, priorityOrder: order, isActive: true });
      } else {
        await createLenderWaterfall({ name: 'Default Priority', priorityOrder: order, isActive: true });
      }
      notify.success('Waterfall saved.');
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save waterfall.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSimulate = async () => {
    let payload;
    try {
      payload = JSON.parse(simPayload);
    } catch {
      notify.error('Simulator input must be valid JSON.');
      return;
    }
    try {
      setSimulating(true);
      const result = await simulateLenderWaterfall(payload);
      setSimResult(result);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Simulation failed.'));
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Waterfall Routing Builder" subtitle="Screen 26 — Priority order by category/geo/time (simplified reorder UI)">
        <Loader text="Loading waterfall..." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Waterfall Routing Builder"
      subtitle="Screen 26 — Priority order by category/geo/time (simplified reorder UI)"
      actions={<Button variant="teal" onClick={handleSave} loading={saving}>Save</Button>}
    >
      <Card title="Priority Order">
        <div className="wf-list">
          {order.map((id, i) => (
            <div key={id} className="wf-item">
              <div className="wf-rank">{i + 1}</div>
              <div className="wf-name">{lenderName(id)}</div>
              <div className="wf-actions">
                <Button variant="secondary" size="sm" onClick={() => move(i, -1)}>Up</Button>
                <Button variant="secondary" size="sm" onClick={() => move(i, 1)}>Down</Button>
              </div>
            </div>
          ))}
          {!order.length && <p className="wf-empty">No lenders to order yet.</p>}
        </div>
        <div className="wf-sim">
          <h4>Simulator</h4>
          <textarea className="wf-text" rows={6} value={simPayload} onChange={(e) => setSimPayload(e.target.value)} />
          <Button variant="secondary" onClick={handleSimulate} loading={simulating}>Simulate</Button>
          {simResult && (
            <pre className="wf-sim-result">{JSON.stringify(simResult, null, 2)}</pre>
          )}
        </div>
      </Card>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
