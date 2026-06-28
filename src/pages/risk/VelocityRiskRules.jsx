import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listRiskRules, createRiskRule, updateRiskRule, simulateRiskRule } from '../../services/riskService';
import './VelocityRiskRules.css';

const RULE_TYPES = ['velocity', 'credit_score', 'income', 'device', 'geo'];
const ACTIONS = ['flag', 'hold', 'reject'];

function mapRule(r) {
  return {
    id: r.id,
    name: String(r.name ?? '—'),
    type: String(r.rule_type ?? r.type ?? '—'),
    threshold: r.threshold ?? '—',
    action: String(r.action ?? '—'),
    active: Boolean(r.is_active ?? r.active ?? true),
    params: r.parameters ?? {},
  };
}

export default function VelocityRiskRules() {
  const { notification, notify, closeNotification } = useNotification();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [form, setForm] = useState({ ruleType: 'velocity', name: '', threshold: '', action: 'flag', params: '{"timeframe_hours":24,"count":5}' });
  const [adding, setAdding] = useState(false);

  const [simRuleId, setSimRuleId] = useState(null);
  const [simDays, setSimDays] = useState('30');
  const [simResult, setSimResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listRiskRules();
      setRules(result.items.map(mapRule));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load risk rules.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.threshold) { notify.warning('Name and threshold required.'); return; }
    let params = {};
    try { params = JSON.parse(form.params || '{}'); } catch { notify.warning('Parameters must be valid JSON.'); return; }
    try {
      setAdding(true);
      await createRiskRule({ ruleType: form.ruleType, name: form.name, parameters: params, threshold: Number(form.threshold), action: form.action });
      notify.success('Rule created.');
      setForm({ ruleType: 'velocity', name: '', threshold: '', action: 'flag', params: '{"timeframe_hours":24,"count":5}' });
      fetchRules();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to create rule.'));
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateThreshold = async (rule, threshold) => {
    try {
      setBusyId(rule.id);
      await updateRiskRule(rule.id, { threshold: Number(threshold) });
      notify.success('Threshold updated.');
      fetchRules();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Update failed.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleSimulate = async () => {
    if (!simRuleId) { notify.warning('Select a rule.'); return; }
    try {
      setSimulating(true);
      const result = await simulateRiskRule({ ruleId: simRuleId, datasetDays: Number(simDays) });
      setSimResult(result);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Simulation failed.'));
    } finally {
      setSimulating(false);
    }
  };

  const actionVariant = { flag:'warning', hold:'info', reject:'danger' };

  return (
    <PageWrapper title="Velocity & Risk Rules" subtitle="Screen 40 — Velocity thresholds and risk-scoring rules">
      <div className="vrr-grid">
        <Card title="Active Rules">
          {loading ? <Loader text="Loading rules..." /> : (
            <div className="vrr-rules-list">
              {rules.map(rule => (
                <div key={rule.id} className="vrr-rule-row">
                  <div className="vrr-rule-info">
                    <Badge variant="purple">{rule.type}</Badge>
                    <strong>{rule.name}</strong>
                    <span>Threshold: {rule.threshold}</span>
                    <Badge variant={actionVariant[rule.action] ?? 'default'}>{rule.action}</Badge>
                  </div>
                  <div className="vrr-rule-actions">
                    <input type="number" defaultValue={rule.threshold} style={{ width:80 }}
                      onBlur={e => e.target.value !== String(rule.threshold) && handleUpdateThreshold(rule, e.target.value)} />
                    <Button variant="ghost" size="sm" onClick={() => setSimRuleId(rule.id)}
                      loading={busyId === rule.id}>Simulate</Button>
                  </div>
                </div>
              ))}
              {!rules.length && <p className="vrr-empty">No rules yet.</p>}
            </div>
          )}
        </Card>

        <Card title="Add Rule">
          <div className="vrr-form">
            <div className="vrr-field">
              <label>Rule type</label>
              <select value={form.ruleType} onChange={e => setForm({ ...form, ruleType: e.target.value })}>
                {RULE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. High velocity PAN" />
            <Input label="Threshold (0–1 score or count)" type="number" value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })} placeholder="e.g. 0.95" />
            <div className="vrr-field">
              <label>Action on breach</label>
              <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="vrr-field">
              <label>Parameters (JSON)</label>
              <textarea rows={3} value={form.params} onChange={e => setForm({ ...form, params: e.target.value })} className="vrr-params" />
            </div>
            <Button variant="teal" onClick={handleAdd} loading={adding}>Create Rule</Button>
          </div>
        </Card>

        <Card title="Rule Simulator">
          <div className="vrr-sim">
            <div className="vrr-field">
              <label>Select rule to simulate</label>
              <select value={simRuleId ?? ''} onChange={e => setSimRuleId(Number(e.target.value))}>
                <option value="">Select…</option>
                {rules.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <Input label="Dataset (days of history)" type="number" value={simDays} onChange={e => setSimDays(e.target.value)} />
            <Button variant="secondary" onClick={handleSimulate} loading={simulating}>Run Simulation</Button>
            {simResult && <pre className="vrr-sim-result">{JSON.stringify(simResult, null, 2)}</pre>}
          </div>
        </Card>
      </div>
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
