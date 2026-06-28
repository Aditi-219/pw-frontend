import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listPendingDisbursals, triggerBatchDisbursal,
  listSettlementBatches, getSettlementEntries, downloadSettlementBatch, disputeSettlementEntry,
} from '../../services/loansService';
import { listLenders } from '../../services/lendersService';
import './DisbursalSettlementQueue.css';

function mapDisbursal(d) {
  return { id: d.id, lender: String(d.lender?.name ?? d.lender_name ?? '—'), amount: d.amount ?? '—', count: d.count ?? 0 };
}
function mapBatch(b) {
  return { id: b.id, date: b.date ?? b.created_at ?? '—', merchant: b.merchant_name ?? '—', gross: b.gross ?? '—', fees: b.fees ?? '—', net: b.net ?? '—', utr: b.utr ?? '—', status: String(b.status ?? '—') };
}
function mapEntry(e) {
  return { id: e.id, description: e.description ?? '—', amount: e.amount ?? '—', status: String(e.reconciliation_status ?? e.status ?? '—') };
}

export default function DisbursalSettlementQueue() {
  const { notification, notify, closeNotification } = useNotification();

  const [disbursals, setDisbursals] = useState([]);
  const [batches, setBatches] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const [disputeId, setDisputeId] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputing, setDisputing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [disbResult, batchResult, lenderResult] = await Promise.allSettled([
        listPendingDisbursals(), listSettlementBatches(), listLenders(),
      ]);
      if (disbResult.status === 'fulfilled') setDisbursals(disbResult.value.items.map(mapDisbursal));
      if (batchResult.status === 'fulfilled') setBatches(batchResult.value.items.map(mapBatch));
      if (lenderResult.status === 'fulfilled') setLenders(lenderResult.value.items);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load data.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleTriggerBatch = async (lenderId) => {
    try {
      setBusyId(lenderId);
      await triggerBatchDisbursal(lenderId);
      notify.success('Batch disbursal triggered.');
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to trigger batch.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleSelectBatch = async (batch) => {
    setSelectedBatch(batch);
    try {
      setEntriesLoading(true);
      const result = await getSettlementEntries(batch.id);
      setEntries(result.items.map(mapEntry));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load entries.'));
    } finally {
      setEntriesLoading(false);
    }
  };

  const handleDownload = async (batchId) => {
    try {
      setBusyId(batchId);
      const blob = await downloadSettlementBatch(batchId);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `settlement-batch-${batchId}.csv`;
      a.click();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Download failed.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) { notify.warning('Reason required.'); return; }
    try {
      setDisputing(true);
      await disputeSettlementEntry(disputeId, disputeReason);
      notify.success('Dispute raised.');
      setDisputeId(null); setDisputeReason('');
      if (selectedBatch) handleSelectBatch(selectedBatch);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Dispute failed.'));
    } finally {
      setDisputing(false);
    }
  };

  const statusVariant = (s) => s === 'matched' ? 'success' : s === 'disputed' ? 'danger' : 'warning';

  return (
    <PageWrapper title="Disbursal & Settlement Queue" subtitle="Screen 36 — Pending disbursals + settlement reconciliation">
      {loading ? <Loader text="Loading..." /> : (
        <div className="dsq-grid">
          <Card title="Pending Disbursals — by Lender">
            {disbursals.map(d => (
              <div key={d.id} className="dsq-disbursal-row">
                <div><strong>{d.lender}</strong> — {d.count} loans — {d.amount}</div>
                <Button variant="teal" size="sm"
                  onClick={() => handleTriggerBatch(lenders.find(l => l.name === d.lender)?.id ?? d.id)}
                  loading={busyId === d.id}>
                  Trigger Batch
                </Button>
              </div>
            ))}
            {!disbursals.length && <p className="dsq-empty">No pending disbursals.</p>}
          </Card>

          <Card title="Settlement Batches">
            <div className="dsq-batch-list">
              {batches.map(b => (
                <div key={b.id} className={`dsq-batch-row ${selectedBatch?.id === b.id ? 'dsq-batch-row--active' : ''}`}
                  onClick={() => handleSelectBatch(b)}>
                  <div className="dsq-batch-meta">
                    <span>{b.date}</span><span>{b.merchant}</span>
                    <span>Gross: {b.gross}</span><span>Net: {b.net}</span>
                    <span>UTR: {b.utr}</span>
                    <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                  </div>
                  <Button variant="secondary" size="sm" onClick={e => { e.stopPropagation(); handleDownload(b.id); }} loading={busyId === b.id}>
                    Download
                  </Button>
                </div>
              ))}
              {!batches.length && <p className="dsq-empty">No batches.</p>}
            </div>
          </Card>

          {selectedBatch && (
            <Card title={`Entries — Batch ${selectedBatch.id}`}>
              {entriesLoading ? <Loader size="sm" /> : (
                <>
                  {entries.map(e => (
                    <div key={e.id} className="dsq-entry-row">
                      <span>{e.description}</span><span>{e.amount}</span>
                      <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
                      {e.status !== 'disputed' && (
                        <Button variant="ghost" size="sm" onClick={() => { setDisputeId(e.id); setDisputeReason(''); }}>Dispute</Button>
                      )}
                    </div>
                  ))}
                  {!entries.length && <p className="dsq-empty">No entries.</p>}
                </>
              )}
            </Card>
          )}

          {disputeId && (
            <Card title="Raise Dispute">
              <input className="dsq-reason-input" placeholder="Reason for dispute..." value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)} />
              <div className="dsq-dispute-actions">
                <Button variant="secondary" onClick={() => setDisputeId(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleDispute} loading={disputing}>Submit Dispute</Button>
              </div>
            </Card>
          )}
        </div>
      )}
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
