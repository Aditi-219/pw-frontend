import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Tabs from '../../components/common/Tabs';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listMerchants, getMerchant, approveMerchant, rejectMerchant, reKycMerchant, getMerchantDocuments, viewMerchantDocument, addEphemeralNote } from '../../services/merchantsService';
import './KYCReviewWorkspace.css';

const tabs = [
  { id: 'docs', label: 'Documents' },
  { id: 'verification', label: 'Verification Results' },
  { id: 'notes', label: 'Internal Notes' },
];

// This page was not parametrized in the router (no :id) — it's reached
// only from the sidebar with no merchant context. Since the backend's
// approve/reject/re-kyc actions are all merchant-scoped, we add a
// merchant picker (?merchant=<id> in the URL) sourced from the
// Submitted/Under Review queue so the workspace is actually usable.
export default function KYCReviewWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const merchantId = searchParams.get('merchant');
  const { notification, notify, closeNotification } = useNotification();

  const [active, setActive] = useState('docs');
  const [decision, setDecision] = useState(null);
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocContent, setSelectedDocContent] = useState(null);

  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [merchant, setMerchant] = useState(null);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setQueueLoading(true);
        const result = await listMerchants({ status: 'Submitted' });
        const underReview = await listMerchants({ status: 'Under Review' });
        setQueue([...result.items, ...underReview.items]);
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load KYC queue.'));
      } finally {
        setQueueLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const fetchMerchant = useCallback(async () => {
    if (!merchantId) { setMerchant(null); setDocuments([]); return; }
    try {
      setMerchantLoading(true);
      const [data, docsData] = await Promise.all([
        getMerchant(merchantId),
        getMerchantDocuments(merchantId).catch(() => ({ items: [] }))
      ]);
      setMerchant(data);
      setDocuments(docsData.items || []);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load merchant.'));
    } finally {
      setMerchantLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  useEffect(() => { fetchMerchant(); }, [fetchMerchant]);

  const decisionColor = decision === 'approve' ? 'success' : decision === 'reject' ? 'danger' : 'warning';

  const handleSubmitDecision = async () => {
    if (!merchantId) { notify.warning('Select a merchant first.'); return; }
    if (!decision) { notify.warning('Select an action.'); return; }
    if (!comment.trim()) { notify.warning('Reason required.'); return; }
    try {
      setSubmitting(true);
      if (decision === 'approve') await approveMerchant(merchantId, comment);
      else if (decision === 'reject') await rejectMerchant(merchantId, comment);
      else if (decision === 'rekyc') await reKycMerchant(merchantId, comment);
      notify.success(`Decision: ${decision.toUpperCase()} — Audit stamped.`);
      setDecision(null);
      setComment('');
      fetchMerchant();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to submit decision.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper
      title="Merchant KYC Review Workspace"
      subtitle="Screen 15 — Document viewer + verification + approve/reject/re-KYC (audit stamped)"
      actions={
        <>
          <Button variant="secondary" onClick={() => setDecision('rekyc')} disabled={!merchantId}>Request Re-KYC</Button>
          <Button variant="danger" onClick={() => setDecision('reject')} disabled={!merchantId}>Reject</Button>
          <Button variant="teal" onClick={() => setDecision('approve')} disabled={!merchantId}>Approve</Button>
        </>
      }
    >
      <Card className="kyc-picker">
        <label>Merchant (Submitted / Under Review queue)</label>
        {queueLoading ? <Loader size="sm" text="Loading queue..." /> : (
          <select
            value={merchantId ?? ''}
            onChange={(e) => setSearchParams(e.target.value ? { merchant: e.target.value } : {})}
          >
            <option value="">Select a merchant…</option>
            {queue.map((m) => (
              <option key={m.id} value={m.id}>{m.name ?? m.business_name ?? `Merchant #${m.id}`} — {m.status}</option>
            ))}
          </select>
        )}
      </Card>

      {!merchantId && (
        <Card><p className="kyc-empty-state">Select a merchant above to begin review.</p></Card>
      )}

      {merchantId && (
        <div className="kyc-grid">
          <Card title="Review Pane">
            <Tabs tabs={tabs} active={active} onChange={setActive} />
            {merchantLoading ? <Loader text="Loading merchant..." /> : (
              <>
                {active === 'docs' && (
                  <div className="kyc-docs">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <h4>Documents List</h4>
                        {documents.length === 0 ? <p>No documents found.</p> : (
                          <ul style={{ listStyle: 'none', padding: 0 }}>
                            {documents.map(doc => (
                              <li key={doc.id} style={{ padding: '0.5rem', border: '1px solid #ddd', marginBottom: '0.5rem', cursor: 'pointer' }}
                                onClick={async () => {
                                  try {
                                    const content = await viewMerchantDocument(merchantId, doc.id);
                                    setSelectedDocContent(content);
                                  } catch (err) {
                                    notify.error('Failed to view document.');
                                  }
                                }}
                              >
                                {doc.name || doc.file_name} ({doc.type})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="kyc-preview" style={{ flex: 2, padding: '1rem', border: '1px solid #ccc', minHeight: '300px' }}>
                        {selectedDocContent ? (
                          <div>
                            <h4>Document Viewer Panel</h4>
                            <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(selectedDocContent, null, 2)}</pre>
                          </div>
                        ) : (
                          <div className="kyc-preview__box">Select a document to view</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {active === 'verification' && (
                  <div className="kyc-verify">
                    <p className="kyc-note">
                      Verification results come from per-merchant logs (Verification API Logs page) —
                      this page doesn't have its own summarized verification-status endpoint.
                    </p>
                  </div>
                )}

                {active === 'notes' && (
                  <div className="kyc-notes">
                    <p className="kyc-note">
                      Internal notes thread (browser-only, not persisted)
                    </p>
                    {notes.map((n, idx) => (
                      <div key={idx} className="kyc-note-item">
                        <div className="kyc-note__head">
                          <strong>{n.by}</strong>
                          <span>{n.at}</span>
                        </div>
                        <p>{n.text}</p>
                      </div>
                    ))}
                    <div className="kyc-note__add">
                      <Input label="Add internal note" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Type note..." />
                      <Button
                        variant="primary"
                        onClick={async () => {
                          if (!comment.trim()) return;
                          try {
                            await addEphemeralNote(merchantId, comment.trim());
                            setNotes((x) => [{ by: 'Super Admin', text: comment.trim(), at: new Date().toLocaleTimeString() }, ...x]);
                            setComment('');
                            notify.success('Ephemeral note sent.');
                          } catch (err) {
                            notify.error('Failed to send note.');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card title="Decision Panel" subtitle="Approve / Reject / Re-KYC require reason">
            <div className="kyc-decision">
              <div className="kyc-decision__status">
                Current: <Badge variant={decision ? decisionColor : 'default'}>{decision || 'No action selected'}</Badge>
              </div>
              {merchant && (
                <div className="kyc-decision__merchant">
                  Reviewing: <strong>{merchant.name ?? merchant.business_name}</strong> — <Badge variant="info">{merchant.status}</Badge>
                </div>
              )}
              <Input label="Mandatory decision reason" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reason for audit..." />
              <Button
                variant={decision === 'approve' ? 'teal' : decision === 'reject' ? 'danger' : 'secondary'}
                onClick={handleSubmitDecision}
                loading={submitting}
              >
                Submit Decision
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
