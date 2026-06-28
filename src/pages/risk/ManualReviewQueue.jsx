import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listManualReviews, getManualReview, decideManualReview } from '../../services/riskService';
import './ManualReviewQueue.css';

const DECISIONS = ['Approved', 'Rejected', 'Escalate'];
const riskVariant = (score) => score >= 80 ? 'danger' : score >= 60 ? 'warning' : 'info';

function mapReview(r) {
  return {
    id: r.id,
    customer: String(r.customer_name ?? r.customer ?? '—'),
    riskScore: Number(r.risk_score ?? r.score ?? 0),
    signals: (r.risk_signals ?? r.signals ?? []).map(s => String(s)),
    priority: String(r.priority ?? 'medium'),
    sla: String(r.sla_remaining ?? r.sla ?? '—'),
    amount: r.loan_amount ?? r.amount ?? '—',
  };
}

export default function ManualReviewQueue() {
  const { notification, notify, closeNotification } = useNotification();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [decision, setDecision] = useState('Approved');
  const [deciding, setDeciding] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listManualReviews();
      setReviews(result.items.map(mapReview));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load review queue.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSelect = async (review) => {
    setSelected(review);
    try {
      setDetailLoading(true);
      const d = await getManualReview(review.id);
      setDetail(d);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load review detail.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDecide = async () => {
    if (!selected) return;
    try {
      setDeciding(true);
      await decideManualReview(selected.id, decision);
      notify.success(`Decision: ${decision} — logged.`);
      setSelected(null); setDetail(null);
      fetchReviews();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Decision failed.'));
    } finally {
      setDeciding(false);
    }
  };

  return (
    <PageWrapper title="Manual Review Queue" subtitle="Screen 41 — Applications flagged by risk engine for human review">
      <div className="mrq-grid">
        <Card title={`Queue (${reviews.length})`}>
          {loading ? <Loader text="Loading..." /> : (
            <div className="mrq-list">
              {reviews.map(r => (
                <div key={r.id} className={`mrq-item ${selected?.id === r.id ? 'mrq-item--selected' : ''}`} onClick={() => handleSelect(r)}>
                  <div className="mrq-item-head">
                    <Badge variant={riskVariant(r.riskScore)}>Risk {r.riskScore}</Badge>
                    <span className="mrq-customer">{r.customer}</span>
                    <Badge variant="warning">{r.priority}</Badge>
                  </div>
                  <div className="mrq-item-meta">
                    <span>Amount: {r.amount}</span>
                    <span>SLA: {r.sla}</span>
                  </div>
                  {r.signals.length > 0 && (
                    <div className="mrq-signals">
                      {r.signals.map((s, i) => <span key={i} className="mrq-signal">{s}</span>)}
                    </div>
                  )}
                </div>
              ))}
              {!reviews.length && <p className="mrq-empty">Queue is empty.</p>}
            </div>
          )}
        </Card>

        <div className="mrq-detail-pane">
          {!selected && <Card><p className="mrq-empty">Select an application to review.</p></Card>}
          {selected && (
            <Card title={`Review — ${selected.customer}`}>
              {detailLoading ? <Loader size="sm" /> : (
                <>
                  <div className="mrq-detail-block">
                    <div><strong>Risk Score:</strong> <Badge variant={riskVariant(selected.riskScore)}>{selected.riskScore}</Badge></div>
                    <div><strong>Amount:</strong> {selected.amount}</div>
                    <div><strong>SLA Remaining:</strong> {selected.sla}</div>
                    <div><strong>Signals:</strong> {selected.signals.join(', ') || 'None'}</div>
                  </div>
                  {detail && (
                    <pre className="mrq-detail-json">{JSON.stringify(detail, null, 2)}</pre>
                  )}
                  <div className="mrq-decision">
                    <label>Decision</label>
                    <select value={decision} onChange={e => setDecision(e.target.value)}>
                      {DECISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <Button variant={decision === 'Rejected' ? 'danger' : 'teal'} onClick={handleDecide} loading={deciding}>
                      Submit Decision
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
