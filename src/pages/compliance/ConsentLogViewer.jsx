import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listConsentLogs, exportConsentLogs, withdrawConsent } from '../../services/complianceService';
import './ConsentLogViewer.css';

function mapConsent(c) {
  return {
    id: c.id,
    customer: String(c.customer_name ?? c.customer ?? '—'),
    merchant: String(c.merchant_name ?? c.merchant ?? '—'),
    type: String(c.consent_type ?? c.type ?? '—'),
    ip: String(c.ip_address ?? c.ip ?? '—'),
    device: String(c.device ?? '—'),
    version: String(c.version ?? '1.0'),
    timestamp: c.consented_at ?? c.created_at ?? '—',
    withdrawn: Boolean(c.withdrawn),
  };
}

export default function ConsentLogViewer() {
  const { notification, notify, closeNotification } = useNotification();
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [withdrawId, setWithdrawId] = useState(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchConsents = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listConsentLogs();
      setConsents(result.items.map(mapConsent));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load consent logs.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchConsents(); }, [fetchConsents]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportConsentLogs();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'consent-logs.csv';
      a.click();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawReason.trim()) { notify.warning('Reason required.'); return; }
    try {
      setWithdrawing(true);
      await withdrawConsent(withdrawId, withdrawReason);
      notify.success('Consent withdrawn. Data principal request processed.');
      setWithdrawId(null); setWithdrawReason('');
      fetchConsents();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Withdrawal failed.'));
    } finally {
      setWithdrawing(false);
    }
  };

  const filtered = consents.filter(c => !search ||
    c.customer.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageWrapper title="Consent Log Viewer" subtitle="Screen 43 — RBI KFS, T&C, data sharing consent records"
      actions={<Button variant="secondary" onClick={handleExport} loading={exporting}>Export CSV</Button>}
    >
      <Card>
        <input className="consent-search" placeholder="Search by customer or consent type..." value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <Loader text="Loading consent logs..." /> : (
          <div className="consent-list">
            <div className="consent-header-row">
              <div>Customer</div><div>Type</div><div>Merchant</div><div>IP</div><div>Version</div><div>Date</div><div>Status</div><div>Actions</div>
            </div>
            {filtered.map(c => (
              <div key={c.id} className="consent-row">
                <div>{c.customer}</div>
                <div><Badge variant="info">{c.type}</Badge></div>
                <div>{c.merchant}</div>
                <div>{c.ip}</div>
                <div>v{c.version}</div>
                <div>{c.timestamp}</div>
                <div><Badge variant={c.withdrawn ? 'danger' : 'success'}>{c.withdrawn ? 'Withdrawn' : 'Active'}</Badge></div>
                <div>
                  {!c.withdrawn && (
                    <Button variant="ghost" size="sm" onClick={() => { setWithdrawId(c.id); setWithdrawReason(''); }}>
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!filtered.length && <p className="consent-empty">No consent records found.</p>}
          </div>
        )}
      </Card>

      {withdrawId && (
        <Card title="Process Withdrawal Request">
          <textarea className="consent-reason" rows={3} placeholder="Reason / data-principal request reference..."
            value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} />
          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem' }}>
            <Button variant="secondary" onClick={() => setWithdrawId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleWithdraw} loading={withdrawing}>Confirm Withdrawal</Button>
          </div>
        </Card>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
