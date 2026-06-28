import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listLenderRules, createLenderRule, updateLenderRule, archiveLenderRule, listLenders } from '../../services/lendersService';
import './LenderRuleEngine.css';

const VARS = ['credit_score', 'income', 'age', 'location', 'emi_amount', 'category'];
const OPS = ['>=', '<=', '==', '!=', '>', '<'];

// Backend `conditions` is a flexible JSON object, e.g.
// { "credit_score": { "<": 600 } } per the spec example. We build the UI
// around a single condition per rule for simplicity — the field supports
// more complex shapes server-side if needed later.
function conditionsToText(conditions) {
  if (!conditions || typeof conditions !== 'object') return { ifVar: VARS[0], op: '>=', val: '' };
  const [field, ops] = Object.entries(conditions)[0] ?? [];
  if (!field || !ops) return { ifVar: VARS[0], op: '>=', val: '' };
  const [op, val] = Object.entries(ops)[0] ?? [];
  return { ifVar: field, op: op ?? '>=', val: String(val ?? '') };
}

function mapRule(r, lenderNameById) {
  const { ifVar, op, val } = conditionsToText(r.conditions);
  return {
    id: r.id,
    name: r.name ?? '—',
    lenderId: r.lender_id,
    then: lenderNameById[r.lender_id] ?? r.lender?.name ?? `Lender #${r.lender_id}`,
    ifVar, op, val,
    active: (r.status ?? 'active') === 'active',
  };
}

export default function LenderRuleEngine() {
  const { notification, notify, closeNotification } = useNotification();

  const [rules, setRules] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const [newRule, setNewRule] = useState({ name: '', ifVar: VARS[0], op: '>=', val: '', lenderId: '' });
  const [adding, setAdding] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesResult, lendersResult] = await Promise.all([listLenderRules(), listLenders()]);
      const lenderNameById = Object.fromEntries(lendersResult.items.map((l) => [l.id, l.name]));
      setLenders(lendersResult.items);
      setRules(rulesResult.items.map((r) => mapRule(r, lenderNameById)));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load lender rules.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleActive = async (rule) => {
    try {
      setSavingId(rule.id);
      await updateLenderRule(rule.id, {
        name: rule.name,
        lenderId: rule.lenderId,
        conditions: { [rule.ifVar]: { [rule.op]: rule.val } },
        status: rule.active ? 'draft' : 'active',
      });
      notify.success(`Rule ${rule.active ? 'deactivated' : 'activated'}.`);
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to update rule.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleArchive = async (rule) => {
    try {
      setSavingId(rule.id);
      await archiveLenderRule(rule.id);
      notify.success('Rule archived.');
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to archive rule.'));
    } finally {
      setSavingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newRule.name.trim() || !newRule.lenderId || !newRule.val.trim()) {
      notify.warning('Name, target lender, and value are required.');
      return;
    }
    try {
      setAdding(true);
      await createLenderRule({
        name: newRule.name,
        lenderId: Number(newRule.lenderId),
        conditions: { [newRule.ifVar]: { [newRule.op]: newRule.val } },
        status: 'draft',
      });
      notify.success('Rule created as draft.');
      setNewRule({ name: '', ifVar: VARS[0], op: '>=', val: '', lenderId: '' });
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to create rule.'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <PageWrapper
      title="Lender Rule Engine"
      subtitle="Screen 27 — If/then routing rules, versioning (simplified)"
    >
      <Card title="Rules">
        {loading ? <Loader text="Loading rules..." /> : (
          <div className="rule-list">
            {rules.map((r) => (
              <div key={r.id} className="rule-item">
                <Badge variant={r.active ? 'success' : 'warning'}>{r.active ? 'Active' : 'Draft'}</Badge>
                <div className="rule-text">
                  <strong>{r.name}</strong> — IF <strong>{r.ifVar}</strong> {r.op} <strong>{r.val}</strong> THEN route to <strong>{r.then}</strong>
                </div>
                <div className="rule-item__actions">
                  <Button variant="secondary" size="sm" onClick={() => handleToggleActive(r)} loading={savingId === r.id}>
                    Toggle
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleArchive(r)} loading={savingId === r.id}>
                    Archive
                  </Button>
                </div>
              </div>
            ))}
            {!rules.length && <p className="rule-empty">No rules yet.</p>}
          </div>
        )}

        <div className="rule-add">
          <Input label="Rule name" placeholder="e.g. Reject Low Credit" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} />
          <select value={newRule.ifVar} onChange={(e) => setNewRule({ ...newRule, ifVar: e.target.value })}>
            {VARS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={newRule.op} onChange={(e) => setNewRule({ ...newRule, op: e.target.value })}>
            {OPS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <Input label="Value" placeholder="e.g. 600" value={newRule.val} onChange={(e) => setNewRule({ ...newRule, val: e.target.value })} />
          <select value={newRule.lenderId} onChange={(e) => setNewRule({ ...newRule, lenderId: e.target.value })}>
            <option value="">Route to…</option>
            {lenders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <Button variant="teal" onClick={handleAdd} loading={adding}>Add</Button>
        </div>
        <p className="rule-hint">New rules are created as drafts — toggle to activate. A/B testing + full audit history is handled server-side (PRD).</p>
      </Card>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
