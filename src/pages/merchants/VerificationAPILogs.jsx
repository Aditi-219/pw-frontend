import { useState, useEffect, useCallback, useMemo } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/searchbar';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listMerchants, listVerificationLogs, retryVerificationLog, switchVerificationProvider } from '../../services/merchantsService';
import './VerificationAPILogs.css';

const v = { Success: 'success', Failed: 'danger', Pending: 'warning' };

function maskPayload(apiType) {
  if (apiType === 'PAN') return { pan: 'XXXXXX1234', name: 'MASKED' };
  if (apiType === 'GST') return { gst: '22XXXX...XXXX', legalName: 'MASKED' };
  return { account: 'XXXXXX7890', ifsc: 'XXXX000123', name: 'MASKED' };
}

// GET /admin/merchants/{id}/verification-logs response schema isn't
// documented. Mapped defensively from plausible field names.
function mapLog(l) {
  return {
    id: l.id,
    merchant: l.merchant_name ?? l.merchant ?? '—',
    api: l.api_type ?? l.api ?? '—',
    status: l.status ?? 'Pending',
    date: l.date ?? l.created_at ?? '—',
    cost: l.cost ?? '—',
    provider: l.provider ?? '—',
  };
}

// GET .../verification-logs is merchant-scoped (requires an id) — there's
// no cross-merchant global log feed in the API, so this page now requires
// picking a merchant first, sourced from the merchant directory.
export default function VerificationAPILogs() {
  const { notification, notify, closeNotification } = useNotification();

  const [merchants, setMerchants] = useState([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [merchantId, setMerchantId] = useState('');

  const [q, setQ] = useState('');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [switchModal, setSwitchModal] = useState(false);
  const [switchProvider, setSwitchProvider] = useState('karza');
  const [switchCallType, setSwitchCallType] = useState('PAN');
  const [switching, setSwitching] = useState(false);
  const [retryingId, setRetryingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setMerchantsLoading(true);
        const result = await listMerchants({});
        setMerchants(result.items);
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load merchants.'));
      } finally {
        setMerchantsLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const fetchLogs = useCallback(async () => {
    if (!merchantId) { setLogs([]); return; }
    try {
      setLogsLoading(true);
      const result = await listVerificationLogs(merchantId);
      setLogs(result.items.map(mapLog));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load verification logs.'));
    } finally {
      setLogsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const data = useMemo(() => {
    return logs.filter((x) => !q || x.merchant.toLowerCase().includes(q.toLowerCase()) || x.api.toLowerCase().includes(q.toLowerCase()));
  }, [logs, q]);

  const handleSwitchProvider = async () => {
    try {
      setSwitching(true);
      await switchVerificationProvider({ provider: switchProvider, callType: switchCallType });
      notify.success(`Provider switched to ${switchProvider} for ${switchCallType}.`);
      setSwitchModal(false);
      fetchLogs();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Provider switch failed.'));
    } finally {
      setSwitching(false);
    }
  };

  const handleRetry = async (row) => {
    try {
      setRetryingId(row.id);
      await retryVerificationLog(merchantId, row.id);
      notify.success('Retry queued.');
      fetchLogs();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Retry failed.'));
    } finally {
      setRetryingId(null);
    }
  };

  const columns = [
    { key: 'id', label: 'Log ID' },
    { key: 'merchant', label: 'Merchant' },
    { key: 'api', label: 'API Type' },
    { key: 'provider', label: 'Provider' },
    { key: 'date', label: 'Date' },
    { key: 'cost', label: 'Cost' },
    { key: 'status', label: 'Status', render: (s) => <Badge variant={v[s] || 'default'}>{s}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="vlog-actions">
          <Button variant="secondary" size="sm" onClick={() => setModal({ type: 'view', row })}>View</Button>
          <Button variant="teal" size="sm" onClick={() => handleRetry(row)} loading={retryingId === row.id}>Retry</Button>
        </div>
      ),
    },
  ];

  const monthTotal = data.reduce((sum, x) => sum + (Number(String(x.cost).replace(/[^0-9.]/g, '')) || 0), 0);

  return (
    <PageWrapper
      title="Verification API Logs"
      subtitle="Screen 18 — Filter logs, masked payload viewer, retry, provider switching (per call type)"
      actions={<Badge variant="info">Session total: ₹{monthTotal.toFixed(1)}</Badge>}
    >
      <Card className="vlog-picker">
        <label>Merchant</label>
        {merchantsLoading ? <Loader size="sm" text="Loading merchants..." /> : (
          <select value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
            <option value="">Select a merchant…</option>
            {merchants.map((m) => (
              <option key={m.id} value={m.id}>{m.name ?? m.business_name ?? `Merchant #${m.id}`}</option>
            ))}
          </select>
        )}
      </Card>

      <Card>
        <div className="vlog-toolbar">
          <SearchBar placeholder="Search merchant or API type..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="secondary" onClick={() => setSwitchModal(true)}>Provider switchboard</Button>
        </div>
        {logsLoading ? <Loader text="Loading logs..." /> : (
          <Table columns={columns} data={data} emptyMessage={merchantId ? 'No logs for this merchant' : 'Select a merchant to view logs'} />
        )}
      </Card>

      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title="Request / Response (masked)"
        footer={<Button variant="secondary" onClick={() => setModal(null)}>Close</Button>}
      >
        {modal?.row && (
          <>
            <div className="vlog-json">
              <div className="vlog-json__title">Request</div>
              <pre>{JSON.stringify(maskPayload(modal.row.api), null, 2)}</pre>
            </div>
            <div className="vlog-json">
              <div className="vlog-json__title">Response</div>
              <pre>{JSON.stringify({ status: modal.row.status, provider: modal.row.provider, ts: modal.row.date }, null, 2)}</pre>
            </div>
          </>
        )}
      </Modal>

      {switchModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setSwitchModal(false)}>
          <div style={{background:'var(--color-bg-card)',borderRadius:8,padding:'1.5rem',minWidth:320,display:'flex',flexDirection:'column',gap:'0.75rem'}} onClick={e=>e.stopPropagation()}>
            <h3 style={{margin:0}}>Switch Verification Provider</h3>
            <div><label style={{display:'block',fontSize:'0.8rem',marginBottom:'0.3rem'}}>Provider</label>
              <select value={switchProvider} onChange={e=>setSwitchProvider(e.target.value)} style={{width:'100%'}}>
                <option value="karza">Karza</option><option value="surepass">Surepass</option><option value="signzy">Signzy</option>
              </select>
            </div>
            <div><label style={{display:'block',fontSize:'0.8rem',marginBottom:'0.3rem'}}>Call Type</label>
              <select value={switchCallType} onChange={e=>setSwitchCallType(e.target.value)} style={{width:'100%'}}>
                <option value="PAN">PAN</option><option value="GST">GST</option><option value="Bank">Bank</option><option value="Aadhaar">Aadhaar</option>
              </select>
            </div>
            <div style={{display:'flex',gap:'0.5rem',justifyContent:'flex-end'}}>
              <button onClick={() => setSwitchModal(false)} style={{padding:'0.4rem 1rem',cursor:'pointer'}}>Cancel</button>
              <button onClick={handleSwitchProvider} disabled={switching} style={{padding:'0.4rem 1rem',background:'var(--color-primary,#2563eb)',color:'#fff',border:'none',borderRadius:6,cursor:'pointer'}}>{switching?'Switching…':'Switch'}</button>
            </div>
          </div>
        </div>
      )}
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
