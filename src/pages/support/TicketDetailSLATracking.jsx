import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listTickets,
  getTicket,
  getTicketSla,
  addTicketMessage,
  escalateTicket,
  resolveTicket,
  updateTicket,
  reassignTicket,
} from '../../services/supportService';
import './TicketDetailSLATracking.css';

// GET /admin/tickets/{id} and /sla response schemas aren't documented.
// Mapped defensively from plausible field names.
function mapTicket(t) {
  return {
    id: t.id,
    customer: t.customer_name ?? t.customer ?? '—',
    subject: t.subject ?? t.title ?? '—',
    description: t.description ?? t.body ?? '—',
    priority: String(t.priority ?? 'Medium'),
    status: String(t.status ?? 'open'),
    assignedTo: t.assigned_to_name ?? t.assignedTo ?? 'Unassigned',
    created: t.created_at ?? t.created ?? '—',
    lastUpdated: t.updated_at ?? t.lastUpdated ?? '—',
    category: t.category ?? '—',
    channel: t.channel ?? t.source_role ?? '—',
    messages: (t.messages ?? []).map((m, i) => ({
      id: m.id ?? i,
      user: m.author_name ?? m.user ?? 'Unknown',
      message: m.body ?? m.message ?? '',
      timestamp: m.created_at ?? m.timestamp ?? '—',
      type: m.visibility === 'internal' ? 'internal' : (m.is_system ? 'system' : 'customer'),
    })),
  };
}

function mapSla(payload) {
  const s = payload ?? {};
  return {
    timeRemaining: s.time_remaining ?? s.timeRemaining ?? '—',
    target: s.target_at ?? s.slaTarget ?? '—',
    progressPercent: s.progress_percent ?? s.progressPercent ?? 0,
  };
}

export default function TicketDetailSLATracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketId = searchParams.get('id');
  const { notification, notify, closeNotification } = useNotification();

  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [sla, setSla] = useState(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setQueueLoading(true);
        const result = await listTickets({});
        setQueue(result.items);
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load tickets.'));
      } finally {
        setQueueLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) { setTicket(null); setSla(null); return; }
    try {
      setLoading(true);
      const [ticketData, slaResult] = await Promise.allSettled([getTicket(ticketId), getTicketSla(ticketId)]);
      if (ticketData.status === 'fulfilled') setTicket(mapTicket(ticketData.value));
      else notify.error(getErrorMessage(ticketData.reason, 'Failed to load ticket.'));
      if (slaResult.status === 'fulfilled') setSla(mapSla(slaResult.value));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    try {
      setPosting(true);
      await addTicketMessage(ticketId, comment.trim(), 'internal');
      setComment('');
      notify.success('Comment added.');
      fetchTicket();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to add comment.'));
    } finally {
      setPosting(false);
    }
  };

  const runAction = async (type) => {
    try {
      setActionLoading(type);
      if (type === 'escalate') {
        await escalateTicket(ticketId, 'level_2', 'Escalated from ticket detail view');
        notify.success('Ticket escalated to Level 2.');
      } else if (type === 'resolve') {
        await resolveTicket(ticketId, { resolutionCategory: 'resolved', resolutionNote: 'Resolved from ticket detail view', triggerCsat: true });
        notify.success('Ticket marked as resolved.');
      } else if (type === 'close') {
        await updateTicket(ticketId, { status: 'closed' });
        notify.success('Ticket closed.');
      } else if (type === 'reassign') {
        const assigneeId = window.prompt("Enter the User ID to reassign this ticket to:");
        if (!assigneeId) {
          setActionLoading(null);
          return;
        }
        await reassignTicket(ticketId, assigneeId);
        notify.success('Ticket reassigned.');
      }
      fetchTicket();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Action failed.'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <PageWrapper title="Ticket Detail & SLA Tracking" subtitle="View and manage ticket details with SLA monitoring">
      <div className="ticket-detail">
        <Card>
          <label className="ticket-picker-label">Ticket</label>
          {queueLoading ? <Loader size="sm" text="Loading tickets..." /> : (
            <select
              className="ticket-picker"
              value={ticketId ?? ''}
              onChange={(e) => setSearchParams(e.target.value ? { id: e.target.value } : {})}
            >
              <option value="">Select a ticket…</option>
              {queue.map((t) => (
                <option key={t.id} value={t.id}>{t.id} — {t.subject ?? t.title ?? 'Ticket'}</option>
              ))}
            </select>
          )}
        </Card>

        {!ticketId && <Card><p className="ticket-detail-empty">Select a ticket above to view details.</p></Card>}

        {ticketId && loading && <Loader text="Loading ticket..." />}

        {ticketId && !loading && ticket && (
          <div className="detail-grid">
            <div className="detail-main">
              <Card>
                <div className="ticket-header">
                  <div>
                    <h3 className="ticket-id">{ticket.id}</h3>
                    <h1 className="ticket-subject">{ticket.subject}</h1>
                  </div>
                  <div className="ticket-badges">
                    <span className={`priority-badge priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                    <span className={`status-badge status-${ticket.status}`}>{ticket.status}</span>
                  </div>
                </div>

                <div className="ticket-info-grid">
                  <div className="info-item"><span className="label">Customer</span><span className="value">{ticket.customer}</span></div>
                  <div className="info-item"><span className="label">Assigned To</span><span className="value">{ticket.assignedTo}</span></div>
                  <div className="info-item"><span className="label">Created</span><span className="value">{ticket.created}</span></div>
                  <div className="info-item"><span className="label">Last Updated</span><span className="value">{ticket.lastUpdated}</span></div>
                  <div className="info-item"><span className="label">Category</span><span className="value">{ticket.category}</span></div>
                  <div className="info-item"><span className="label">Channel</span><span className="value">{ticket.channel}</span></div>
                </div>

                <div className="ticket-description">
                  <h4>Description</h4>
                  <p>{ticket.description}</p>
                </div>

                <div className="comments-section">
                  <h4>Activity Timeline</h4>
                  <div className="comments-list">
                    {ticket.messages.map((c) => (
                      <div key={c.id} className={`comment ${c.type}`}>
                        <div className="comment-header">
                          <span className="comment-user">{c.user}</span>
                          <span className="comment-time">{c.timestamp}</span>
                        </div>
                        <div className="comment-message">{c.message}</div>
                      </div>
                    ))}
                    {!ticket.messages.length && <p className="ticket-detail-empty">No messages yet.</p>}
                  </div>
                  <div className="add-comment">
                    <textarea placeholder="Add an internal comment..." rows="3" value={comment} onChange={(e) => setComment(e.target.value)} />
                    <button className="add-comment-btn" onClick={handleAddComment} disabled={posting}>
                      {posting ? 'Adding…' : 'Add Comment'}
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            <div className="detail-sidebar">
              <Card>
                <h4>SLA Monitoring</h4>
                <div className="sla-timer">
                  <div className="sla-label">Time Remaining</div>
                  <div className="sla-time">{sla?.timeRemaining ?? '—'}</div>
                  <div className="sla-target">Target: {sla?.target ?? '—'}</div>
                  <div className="sla-progress">
                    <div className="progress-bar" style={{ width: `${sla?.progressPercent ?? 0}%` }}></div>
                  </div>
                </div>

                <div className="quick-actions">
                  <h4>Quick Actions</h4>
                  <button className="action-btn escalate" onClick={() => runAction('escalate')} disabled={actionLoading === 'escalate'}>
                    {actionLoading === 'escalate' ? 'Escalating…' : 'Escalate to Level 2'}
                  </button>
                  <button className="action-btn reassign" onClick={() => runAction('reassign')} disabled={actionLoading === 'reassign'}>
                    Reassign Ticket
                  </button>
                  <button className="action-btn resolve" onClick={() => runAction('resolve')} disabled={actionLoading === 'resolve'}>
                    {actionLoading === 'resolve' ? 'Resolving…' : 'Mark as Resolved'}
                  </button>
                  <button className="action-btn close" onClick={() => runAction('close')} disabled={actionLoading === 'close'}>
                    {actionLoading === 'close' ? 'Closing…' : 'Close Ticket'}
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
