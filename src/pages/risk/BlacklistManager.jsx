import { useState, useEffect, useCallback, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listBlacklist, addToBlacklist, removeFromBlacklist, whitelistOverride, bulkImportBlacklist } from '../../services/riskService';
import './BlacklistManager.css';

const CATEGORIES = ['PAN', 'mobile', 'device', 'aadhaar', 'bank_account'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

function mapEntry(e) {
  return {
    id: e.id,
    category: String(e.category ?? '—'),
    value: String(e.value ?? '—'),
    reason: String(e.reason ?? '—'),
    severity: String(e.severity ?? 'Low'),
    expiry: e.expiry_date ?? e.expiry ?? '—',
    source: String(e.source ?? '—'),
  };
}

export default function BlacklistManager() {
  const { notification, notify, closeNotification } = useNotification();
  const fileRef = useRef(null);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ category: 'PAN', value: '', reason: '', severity: 'High', expiry: '' });
  const [adding, setAdding] = useState(false);

  const [removeId, setRemoveId] = useState(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removing, setRemoving] = useState(false);

  const [overrideId, setOverrideId] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideApprover, setOverrideApprover] = useState('');
  const [overriding, setOverriding] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listBlacklist();
      setEntries(result.items.map(mapEntry));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load blacklist.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const filtered = entries.filter(e =>
    !search || e.value.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.value.trim() || !form.reason.trim()) { notify.warning('Value and reason required.'); return; }
    try {
      setAdding(true);
      await addToBlacklist(form);
      notify.success('Added to blacklist.');
      setForm({ category: 'PAN', value: '', reason: '', severity: 'High', expiry: '' });
      fetchEntries();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to add to blacklist.'));
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removeReason.trim()) { notify.warning('Reason required.'); return; }
    try {
      setRemoving(true);
      await removeFromBlacklist(removeId, removeReason);
      notify.success('Removed from blacklist. Audit stamped.');
      setRemoveId(null); setRemoveReason('');
      fetchEntries();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Removal failed.'));
    } finally {
      setRemoving(false);
    }
  };

  const handleWhitelistOverride = async () => {
    if (!overrideReason.trim() || !overrideApprover) { notify.warning('Reason and approver required.'); return; }
    try {
      setOverriding(true);
      await whitelistOverride(overrideId, { overrideApprovedBy: Number(overrideApprover), reason: overrideReason });
      notify.success('Whitelist override approved (dual approval logged).');
      setOverrideId(null); setOverrideReason(''); setOverrideApprover('');
      fetchEntries();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Override failed.'));
    } finally {
      setOverriding(false);
    }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setBusyId('import');
      await bulkImportBlacklist(file);
      notify.success('Bulk import complete.');
      fetchEntries();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Import failed.'));
    } finally {
      setBusyId(null);
    }
  };

  const severityVariant = { Critical:'danger', High:'warning', Medium:'info', Low:'default' };

  return (
    <PageWrapper title="Blacklist Manager" subtitle="Screen 39 — PAN, mobile, device, Aadhaar, bank account"
      actions={
        <>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={handleBulkImport} />
          <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={busyId === 'import'}>Bulk Import CSV</Button>
        </>
      }
    >
      <div className="bl-grid">
        <Card title="Add to Blacklist">
          <div className="bl-form">
            <div className="bl-field">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Value (PAN/mobile/device ID etc.)" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            <Input label="Reason" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            <div className="bl-field">
              <label>Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <Input label="Expiry date (optional)" type="date" value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} />
            <Button variant="danger" onClick={handleAdd} loading={adding}>Add to Blacklist</Button>
          </div>
        </Card>

        <Card title="Blacklist Entries">
          <input className="bl-search" placeholder="Search by value or category..." value={search} onChange={e => setSearch(e.target.value)} />
          {loading ? <Loader text="Loading..." /> : (
            <div className="bl-list">
              {filtered.map(e => (
                <div key={e.id} className="bl-entry">
                  <div className="bl-entry-info">
                    <Badge variant="purple">{e.category}</Badge>
                    <span className="bl-value">{e.value}</span>
                    <Badge variant={severityVariant[e.severity] ?? 'default'}>{e.severity}</Badge>
                    <span className="bl-reason">{e.reason}</span>
                    <span className="bl-expiry">Exp: {e.expiry}</span>
                  </div>
                  <div className="bl-entry-actions">
                    <Button variant="ghost" size="sm" onClick={() => { setOverrideId(e.id); setOverrideReason(''); setOverrideApprover(''); }}>Whitelist Override</Button>
                    <Button variant="danger" size="sm" onClick={() => { setRemoveId(e.id); setRemoveReason(''); }}>Remove</Button>
                  </div>
                </div>
              ))}
              {!filtered.length && <p className="bl-empty">No entries found.</p>}
            </div>
          )}
        </Card>
      </div>

      {removeId && (
        <Card title="Remove from Blacklist">
          <Input label="Reason (audit stamped)" value={removeReason} onChange={e => setRemoveReason(e.target.value)} />
          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem' }}>
            <Button variant="secondary" onClick={() => setRemoveId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleRemove} loading={removing}>Confirm Remove</Button>
          </div>
        </Card>
      )}

      {overrideId && (
        <Card title="Whitelist Override (Dual Approval)">
          <Input label="Reason" value={overrideReason} onChange={e => setOverrideReason(e.target.value)} />
          <Input label="Approver Admin ID" type="number" value={overrideApprover} onChange={e => setOverrideApprover(e.target.value)} />
          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem' }}>
            <Button variant="secondary" onClick={() => setOverrideId(null)}>Cancel</Button>
            <Button variant="teal" onClick={handleWhitelistOverride} loading={overriding}>Approve Override</Button>
          </div>
        </Card>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
