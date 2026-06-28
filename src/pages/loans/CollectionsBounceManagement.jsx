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
import { listCollections, listBounces, retryBounce, assignCollectionAgent, setNpaStatus } from '../../services/loansService';
import './CollectionsBounceManagement.css';

const DPD_BUCKETS = ['0-30', '31-60', '61-90', '90+'];
const NPA_STATUSES = ['Active', 'Settled', 'Written Off', 'NPA'];

function mapCollection(c) {
  return {
    id: c.id, customer: String(c.customer_name ?? c.customer ?? '—'),
    amount: c.outstanding_amount ?? c.amount ?? '—',
    dpd: String(c.dpd_days ?? c.dpd ?? '0'),
    bucket: c.dpd_bucket ?? (Number(c.dpd_days ?? 0) > 90 ? '90+' : Number(c.dpd_days ?? 0) > 60 ? '61-90' : Number(c.dpd_days ?? 0) > 30 ? '31-60' : '0-30'),
    agent: String(c.assigned_agent ?? c.agent ?? 'Unassigned'),
    npaStatus: String(c.npa_status ?? 'Active'),
  };
}
function mapBounce(b) {
  return {
    id: b.id, customer: String(b.customer_name ?? b.customer ?? '—'),
    amount: b.amount ?? '—', reason: String(b.reason ?? '—'),
    attempts: b.retry_count ?? b.attempts ?? 0,
    nextRetry: b.next_retry_at ?? b.next_retry ?? '—',
    status: String(b.status ?? '—'),
  };
}

export default function CollectionsBounceManagement() {
  const { notification, notify, closeNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('collections');
  const [dpd, setDpd] = useState('all');

  const [collections, setCollections] = useState([]);
  const [bounces, setBounces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [npaId, setNpaId] = useState(null);
  const [npaStatusVal, setNpaStatusVal] = useState('Settled');
  const [agentId, setAgentId] = useState(null);
  const [agentInput, setAgentInput] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [collResult, bounceResult] = await Promise.allSettled([listCollections(), listBounces()]);
      if (collResult.status === 'fulfilled') setCollections(collResult.value.items.map(mapCollection));
      if (bounceResult.status === 'fulfilled') setBounces(bounceResult.value.items.map(mapBounce));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load collections data.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRetryBounce = async (id) => {
    try {
      setBusyId(id);
      await retryBounce(id);
      notify.success('Bounce retry queued.');
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Retry failed.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleAssignAgent = async () => {
    if (!agentInput.trim()) { notify.warning('Enter an agent ID.'); return; }
    try {
      setBusyId(agentId);
      await assignCollectionAgent(agentId, Number(agentInput));
      notify.success('Agent assigned.');
      setAgentId(null); setAgentInput('');
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to assign agent.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleSetNpa = async () => {
    try {
      setBusyId(npaId);
      await setNpaStatus(npaId, npaStatusVal);
      notify.success(`NPA status set to ${npaStatusVal}.`);
      setNpaId(null);
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to set NPA status.'));
    } finally {
      setBusyId(null);
    }
  };

  const bucketCounts = DPD_BUCKETS.reduce((acc, b) => {
    acc[b] = collections.filter(c => c.bucket === b).length;
    return acc;
  }, {});

  const filteredCollections = dpd === 'all' ? collections : collections.filter(c => c.bucket === dpd);
  const bucketVariant = (b) => b === '90+' ? 'danger' : b === '61-90' ? 'warning' : b === '31-60' ? 'info' : 'default';

  return (
    <PageWrapper title="Collections & Bounce Management" subtitle="Screen 37 — DPD buckets, bounces, agent assignment, NPA tagging">
      <div className="cbm-tabs">
        <button className={`cbm-tab ${activeTab === 'collections' ? 'active' : ''}`} onClick={() => setActiveTab('collections')}>Collections</button>
        <button className={`cbm-tab ${activeTab === 'bounces' ? 'active' : ''}`} onClick={() => setActiveTab('bounces')}>Bounce Feed</button>
      </div>

      {loading ? <Loader text="Loading..." /> : (
        <>
          {activeTab === 'collections' && (
            <Card>
              <div className="cbm-dpd-buckets">
                <button className={`dpd-btn ${dpd === 'all' ? 'active' : ''}`} onClick={() => setDpd('all')}>All ({collections.length})</button>
                {DPD_BUCKETS.map(b => (
                  <button key={b} className={`dpd-btn dpd-btn--${b} ${dpd === b ? 'active' : ''}`} onClick={() => setDpd(b)}>
                    DPD {b} ({bucketCounts[b] ?? 0})
                  </button>
                ))}
              </div>
              <div className="cbm-collection-list">
                {filteredCollections.map(c => (
                  <div key={c.id} className="cbm-collection-row">
                    <div className="cbm-col-info">
                      <strong>{c.customer}</strong>
                      <span>Outstanding: {c.amount}</span>
                      <Badge variant={bucketVariant(c.bucket)}>DPD {c.dpd}</Badge>
                      <span>Agent: {c.agent}</span>
                      <Badge variant="info">{c.npaStatus}</Badge>
                    </div>
                    <div className="cbm-col-actions">
                      <Button variant="secondary" size="sm" onClick={() => { setAgentId(c.id); setAgentInput(''); }}>Assign Agent</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setNpaId(c.id); setNpaStatusVal('Settled'); }}>Set NPA</Button>
                    </div>
                  </div>
                ))}
                {!filteredCollections.length && <p className="cbm-empty">No collections in this bucket.</p>}
              </div>
            </Card>
          )}

          {activeTab === 'bounces' && (
            <Card title="Bounce Event Feed">
              <div className="cbm-bounce-list">
                {bounces.map(b => (
                  <div key={b.id} className="cbm-bounce-row">
                    <div className="cbm-bounce-info">
                      <strong>{b.customer}</strong>
                      <span>Amount: {b.amount}</span>
                      <span>Reason: {b.reason}</span>
                      <span>Attempts: {b.attempts}</span>
                      <span>Next retry: {b.nextRetry}</span>
                      <Badge variant="warning">{b.status}</Badge>
                    </div>
                    <Button variant="teal" size="sm" onClick={() => handleRetryBounce(b.id)} loading={busyId === b.id}>Retry</Button>
                  </div>
                ))}
                {!bounces.length && <p className="cbm-empty">No bounce events.</p>}
              </div>
            </Card>
          )}
        </>
      )}

      {agentId && (
        <Card title="Assign Collection Agent">
          <Input label="Agent ID" value={agentInput} onChange={e => setAgentInput(e.target.value)} type="number" placeholder="Enter agent user ID" />
          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.5rem' }}>
            <Button variant="secondary" onClick={() => setAgentId(null)}>Cancel</Button>
            <Button variant="teal" onClick={handleAssignAgent} loading={busyId === agentId}>Assign</Button>
          </div>
        </Card>
      )}

      {npaId && (
        <Card title="Set NPA Status">
          <select value={npaStatusVal} onChange={e => setNpaStatusVal(e.target.value)} style={{ width:'100%', marginBottom:'0.75rem' }}>
            {NPA_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <Button variant="secondary" onClick={() => setNpaId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleSetNpa} loading={busyId === npaId}>Confirm</Button>
          </div>
        </Card>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
