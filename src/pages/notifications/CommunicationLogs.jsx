import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listCommunicationLogs, getCommunicationSummary, resendCommunicationLogs } from '../../services/templatesService';
import './CommunicationLogs.css';

// GET /admin/communication-logs response schema isn't documented. Mapped
// defensively from plausible field names.
function mapLog(l) {
  return {
    id: l.id,
    recipient: l.recipient ?? '—',
    type: String(l.channel ?? l.type ?? 'unknown'),
    subject: l.template_key ?? l.subject ?? '—',
    status: String(l.status ?? 'unknown'),
    timestamp: l.sent_at ?? l.created_at ?? l.timestamp ?? '—',
  };
}

export default function CommunicationLogs() {
  const { notification, notify, closeNotification } = useNotification();

  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [logsResult, summaryResult] = await Promise.allSettled([
        listCommunicationLogs({ channel: filter !== 'all' ? filter : undefined, recipient: search || undefined }),
        getCommunicationSummary('30d'),
      ]);
      if (logsResult.status === 'fulfilled') setLogs(logsResult.value.items.map(mapLog));
      else notify.error(getErrorMessage(logsResult.reason, 'Failed to load logs.'));
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRetry = async (log) => {
    try {
      setRetryingId(log.id);
      await resendCommunicationLogs([log.id]);
      notify.success('Resend queued.');
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Resend failed.'));
    } finally {
      setRetryingId(null);
    }
  };

  const s = summary ?? {};

  return (
    <PageWrapper title="Communication Logs" subtitle="Track all customer communications">
      <div className="comm-logs">
        <Card>
          <div className="logs-filters">
            <div className="filter-buttons">
              <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
              <button className={`filter-btn ${filter === 'email' ? 'active' : ''}`} onClick={() => setFilter('email')}>Email</button>
              <button className={`filter-btn ${filter === 'sms' ? 'active' : ''}`} onClick={() => setFilter('sms')}>SMS</button>
              <button className={`filter-btn ${filter === 'push' ? 'active' : ''}`} onClick={() => setFilter('push')}>Push</button>
            </div>
            <input type="text" placeholder="Search by recipient..." className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? <Loader text="Loading logs..." /> : (
            <div className="logs-table">
              <div className="table-header">
                <div>Timestamp</div>
                <div>Recipient</div>
                <div>Type</div>
                <div>Subject</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              {logs.map(log => (
                <div key={log.id} className="table-row">
                  <div className="timestamp">{log.timestamp}</div>
                  <div className="recipient">{log.recipient}</div>
                  <div className="type">
                    <span className={`type-badge type-${log.type.toLowerCase()}`}>{log.type}</span>
                  </div>
                  <div className="subject">{log.subject}</div>
                  <div className="status">
                    <span className={`status-badge status-${log.status}`}>{log.status}</span>
                  </div>
                  <div className="actions">
                    {log.status === 'failed' && (
                      <button className="retry-btn" onClick={() => handleRetry(log)} disabled={retryingId === log.id}>
                        {retryingId === log.id ? '…' : 'Retry'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {!logs.length && <p className="comm-empty">No communication logs found.</p>}
            </div>
          )}

          <div className="logs-summary">
            <div className="summary-item"><span className="summary-label">Total Sent</span><span className="summary-value">{s.total_sent ?? '—'}</span></div>
            <div className="summary-item"><span className="summary-label">Delivered</span><span className="summary-value">{s.delivered ?? '—'}</span></div>
            <div className="summary-item"><span className="summary-label">Failed</span><span className="summary-value">{s.failed ?? '—'}</span></div>
            <div className="summary-item"><span className="summary-label">Delivery Rate</span><span className="summary-value">{s.delivery_rate ?? '—'}</span></div>
          </div>
        </Card>
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
