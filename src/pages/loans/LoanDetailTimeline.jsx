import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listLoans, getLoan, getLoanTimeline, getLoanDocuments, getLoanCommunications } from '../../services/loansService';
import './LoanDetailTimeline.css';

export default function LoanDetailTimeline() {
  const [searchParams, setSearchParams] = useSearchParams();
  const loanId = searchParams.get('id');
  const { notification, notify, closeNotification } = useNotification();

  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [loan, setLoan] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline');

  useEffect(() => {
    listLoans({}).then(r => setQueue(r.items)).catch(() => {}).finally(() => setQueueLoading(false));
  }, []);

  const fetchLoan = useCallback(async () => {
    if (!loanId) return;
    try {
      setLoading(true);
      const [loanData, timelineData, docsData, commsData] = await Promise.allSettled([
        getLoan(loanId),
        getLoanTimeline(loanId),
        getLoanDocuments(loanId),
        getLoanCommunications(loanId),
      ]);
      if (loanData.status === 'fulfilled') setLoan(loanData.value);
      if (timelineData.status === 'fulfilled') setTimeline(timelineData.value.items);
      if (docsData.status === 'fulfilled') setDocuments(docsData.value.items);
      if (commsData.status === 'fulfilled') setComms(commsData.value.items);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load loan.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  useEffect(() => { fetchLoan(); }, [fetchLoan]);

  return (
    <PageWrapper title="Loan Detail & Timeline" subtitle="Screen 34 — Full loan drill-down">
      <Card>
        <label className="loan-picker-label">Loan</label>
        {queueLoading ? <Loader size="sm" /> : (
          <select className="loan-picker" value={loanId ?? ''} onChange={e => setSearchParams(e.target.value ? { id: e.target.value } : {})}>
            <option value="">Select a loan…</option>
            {queue.map(l => <option key={l.id} value={l.id}>{l.id} — {l.customer_name ?? l.customer ?? 'Customer'} — {l.status}</option>)}
          </select>
        )}
      </Card>

      {!loanId && <Card><p className="loan-empty">Select a loan to view details.</p></Card>}
      {loanId && loading && <Loader text="Loading loan..." />}

      {loanId && !loading && loan && (
        <div className="loan-detail-grid">
          <Card>
            <div className="loan-header-info">
              <div><strong>{loan.customer_name ?? loan.customer ?? '—'}</strong></div>
              <div>{loan.merchant?.name ?? loan.merchant_name ?? '—'} · {loan.store?.name ?? loan.store_name ?? '—'}</div>
              <div>Amount: <strong>{loan.loan_amount ?? loan.amount ?? '—'}</strong> · EMI: {loan.emi_plan ?? '—'}</div>
              <Badge variant="info">{String(loan.status ?? '—')}</Badge>
            </div>

            <div className="loan-tabs">
              {['timeline','documents','communications'].map(t => (
                <button key={t} className={`loan-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
              ))}
            </div>

            {activeTab === 'timeline' && (
              <div className="loan-timeline">
                {timeline.map((ev, i) => (
                  <div key={ev.id ?? i} className="timeline-event">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-event-name">{ev.event ?? ev.type ?? ev.stage ?? '—'}</div>
                      <div className="timeline-time">{ev.created_at ?? ev.timestamp ?? '—'}</div>
                      {ev.payload && <pre className="timeline-payload">{JSON.stringify(ev.payload, null, 2)}</pre>}
                    </div>
                  </div>
                ))}
                {!timeline.length && <p className="loan-empty">No timeline events.</p>}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="loan-docs">
                {documents.map((d, i) => (
                  <div key={d.id ?? i} className="loan-doc-row">
                    <span>📄 {d.name ?? d.file_name ?? d.type ?? '—'}</span>
                    <span className="doc-date">{d.created_at ?? '—'}</span>
                  </div>
                ))}
                {!documents.length && <p className="loan-empty">No documents.</p>}
              </div>
            )}

            {activeTab === 'communications' && (
              <div className="loan-comms">
                {comms.map((c, i) => (
                  <div key={c.id ?? i} className="loan-comm-row">
                    <Badge variant="info">{String(c.channel ?? c.type ?? '—')}</Badge>
                    <span>{c.subject ?? c.template_key ?? '—'}</span>
                    <span className="comm-status">{String(c.status ?? '—')}</span>
                    <span>{c.sent_at ?? c.created_at ?? '—'}</span>
                  </div>
                ))}
                {!comms.length && <p className="loan-empty">No communications.</p>}
              </div>
            )}
          </Card>
        </div>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
