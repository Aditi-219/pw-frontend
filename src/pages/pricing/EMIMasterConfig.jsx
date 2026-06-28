import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listEmiTypes, createEmiType, toggleEmiType } from '../../services/pricingService';
import './EMIMasterConfig.css';

// GET /admin/pricing/emi-types response schema isn't documented. The
// schema has no enabled/disabled field at all (only name/type/min/max/
// tiers/effective_from) — we treat the type as "enabled" unless a future
// effective_from date marks it as not-yet-active, and surface that as a
// read-only status rather than faking a toggle that doesn't persist.
function mapEmiType(e) {
  const effectiveFrom = e.effective_from ? new Date(e.effective_from) : null;
  const isFuture = effectiveFrom && effectiveFrom > new Date();
  return {
    id: e.id,
    type: e.name ?? '—',
    kind: e.type ?? '—',
    min: e.min_loan_amount != null ? `₹${e.min_loan_amount}` : '—',
    max: e.max_loan_amount != null ? `₹${e.max_loan_amount}` : '—',
    effectiveFrom: e.effective_from ?? null,
    status: isFuture ? 'Scheduled' : 'Active',
    enabled: e.is_enabled ?? true,
  };
}

export default function EMIMasterConfig() {
  const { notification, notify, closeNotification } = useNotification();

  const [emi, setEmi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'no-cost', minLoanAmount: '', maxLoanAmount: '', effectiveFrom: '',
  });

  const fetchEmiTypes = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listEmiTypes();
      setEmi(result.items.map(mapEmiType));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load EMI types.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchEmiTypes(); }, [fetchEmiTypes]);

  const handleCreate = async () => {
    if (!form.name.trim()) { notify.warning('Name is required.'); return; }
    try {
      setSaving(true);
      await createEmiType({
        name: form.name,
        type: form.type,
        minLoanAmount: form.minLoanAmount ? Number(form.minLoanAmount) : undefined,
        maxLoanAmount: form.maxLoanAmount ? Number(form.maxLoanAmount) : undefined,
        effectiveFrom: form.effectiveFrom || undefined,
      });
      notify.success('EMI type created.');
      setModal(false);
      setForm({ name: '', type: 'no-cost', minLoanAmount: '', maxLoanAmount: '', effectiveFrom: '' });
      fetchEmiTypes();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to create EMI type.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id, currentEnabled) => {
    try {
      await toggleEmiType(id);
      notify.success(`EMI type ${currentEnabled ? 'disabled' : 'enabled'}.`);
      fetchEmiTypes();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to toggle EMI type.'));
    }
  };

  return (
    <PageWrapper
      title="EMI Master Configuration"
      subtitle="Screen 29 — Global EMI types and bounds, future-dated changes"
      actions={<Button variant="teal" onClick={() => setModal(true)}>+ Add EMI Type</Button>}
    >
      <Card title="EMI Types">
        {loading ? <Loader text="Loading EMI types..." /> : (
          <div className="emi-list">
            {emi.map((e) => (
              <div key={e.id} className="emi-item">
                <div className="emi-left">
                  <strong>{e.type}</strong>
                  <span>{e.min} → {e.max} · {e.kind}</span>
                </div>
                <div className="emi-right" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={e.enabled} onChange={() => handleToggle(e.id, e.enabled)} />
                    {e.enabled ? 'Enabled' : 'Disabled'}
                  </label>
                  <Badge variant={e.status === 'Active' ? 'success' : 'warning'}>{e.status}</Badge>
                  {e.effectiveFrom && <span className="emi-eff">from {e.effectiveFrom}</span>}
                </div>
              </div>
            ))}
            {!emi.length && <p className="emi-empty">No EMI types configured yet.</p>}
          </div>
        )}
        <p className="emi-note">
          Merchant portals inherit these bounds (override approvals handled in Offer Approval Queue).
        </p>
      </Card>

      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Add EMI Type"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)} disabled={saving}>Cancel</Button>
            <Button variant="teal" onClick={handleCreate} loading={saving}>Create</Button>
          </>
        }
      >
        <div className="emi-form">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard No Cost EMI" />
          <div className="emi-form__field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="no-cost">No-cost</option>
              <option value="interest-bearing">Interest-bearing</option>
              <option value="deferred">Deferred</option>
            </select>
          </div>
          <Input label="Min loan amount" type="number" value={form.minLoanAmount} onChange={(e) => setForm({ ...form, minLoanAmount: e.target.value })} />
          <Input label="Max loan amount" type="number" value={form.maxLoanAmount} onChange={(e) => setForm({ ...form, maxLoanAmount: e.target.value })} />
          <Input label="Effective from" type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
        </div>
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
