import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listTickets, getTicketStats, createTicket } from '../../services/supportService';
import './MasterTicketQueue.css';

// GET /admin/tickets response schema isn't documented. Mapped defensively
// from plausible field names. priority/status are coerced to strings
// since rendering assumes string methods (.toLowerCase/.replace) — a
// non-string or null value here previously crashed the whole page render.
function mapTicket(t) {
  return {
    id: t.id,
    customer: t.customer_name ?? t.customer ?? '—',
    subject: t.subject ?? t.title ?? '—',
    priority: String(t.priority ?? 'medium'),
    status: String(t.status ?? 'open'),
    assignedTo: t.assigned_to_name ?? t.assignedTo ?? 'Unassigned',
    created: t.created_at ?? t.created ?? '—',
    sla: t.sla_remaining ?? t.sla ?? '—',
  };
}

function mapStats(payload) {
  const s = payload ?? {};
  return {
    open: s.open ?? 0,
    inProgress: s.in_progress ?? s.inProgress ?? 0,
    resolved: s.resolved ?? 0,
    slaBreached: s.sla_breached ?? s.slaBreached ?? 0,
  };
}

export default function MasterTicketQueue() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [filter, setFilter] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, slaBreached: 0 });
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject:'', description:'', priority:'medium', category:'general' });
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketsResult, statsResult] = await Promise.allSettled([
        listTickets({ status: filter === 'all' ? undefined : filter }),
        getTicketStats(),
      ]);
      if (ticketsResult.status === 'fulfilled') setTickets(ticketsResult.value.items.map(mapTicket));
      else notify.error(getErrorMessage(ticketsResult.reason, 'Failed to load tickets.'));
      if (statsResult.status === 'fulfilled') setStats(mapStats(statsResult.value));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim()) { notify.warning('Subject required.'); return; }
    try {
      setCreating(true);
      await createTicket(newTicket);
      notify.success('Ticket created.');
      setCreateModal(false);
      setNewTicket({ subject:'', description:'', priority:'medium', category:'general' });
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to create ticket.'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageWrapper title="Master Ticket Queue" subtitle="Manage all support tickets and customer queries">
      <div className="ticket-queue">
        <div className="queue-header">
          <button className="create-ticket" onClick={() => setCreateModal(true)}>+ Create Ticket</button>
        </div>

        <Card>
          <div className="ticket-stats">
            <div className="stat"><span>Open</span><strong>{stats.open}</strong></div>
            <div className="stat"><span>In Progress</span><strong>{stats.inProgress}</strong></div>
            <div className="stat"><span>Resolved</span><strong>{stats.resolved}</strong></div>
            <div className="stat"><span>SLA Breached</span><strong>{stats.slaBreached}</strong></div>
          </div>

          <div className="ticket-filters">
            <button className={`filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Open</button>
            <button className={`filter ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>In Progress</button>
            <button className={`filter ${filter === 'resolved' ? 'active' : ''}`} onClick={() => setFilter('resolved')}>Resolved</button>
          </div>

          {loading ? <Loader text="Loading tickets..." /> : (
            <div className="tickets-list">
              {tickets.map(ticket => (
                <div key={ticket.id} className="ticket-item">
                  <div className="ticket-main">
                    <div className="ticket-id">{ticket.id}</div>
                    <div className="ticket-subject">{ticket.subject}</div>
                    <div className={`ticket-priority priority-${(ticket.priority || 'medium').toLowerCase()}`}>{ticket.priority}</div>
                    <div className={`ticket-status status-${(ticket.status || 'open')}`}>{(ticket.status || 'open').replace('_', ' ')}</div>
                  </div>
                  <div className="ticket-details">
                    <div className="detail">Customer: {ticket.customer}</div>
                    <div className="detail">Assigned: {ticket.assignedTo}</div>
                    <div className="detail">Created: {ticket.created}</div>
                    <div className="detail">SLA: {ticket.sla}</div>
                  </div>
                  <div className="ticket-actions">
                    <button className="view-ticket" onClick={() => navigate(`/ticket-detail-sla-tracking?id=${ticket.id}`)}>View →</button>
                  </div>
                </div>
              ))}
              {!tickets.length && <p className="ticket-empty">No tickets found.</p>}
            </div>
          )}
        </Card>
      </div>

      {createModal && (
        <div className="ct-modal-overlay" onClick={() => setCreateModal(false)}>
          <div className="ct-modal" onClick={e => e.stopPropagation()}>
            <h3>Create Ticket</h3>
            <input placeholder="Subject *" value={newTicket.subject} onChange={e => setNewTicket(t=>({...t,subject:e.target.value}))} />
            <textarea placeholder="Description" rows={3} value={newTicket.description} onChange={e => setNewTicket(t=>({...t,description:e.target.value}))} />
            <select value={newTicket.priority} onChange={e => setNewTicket(t=>({...t,priority:e.target.value}))}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
            </select>
            <select value={newTicket.category} onChange={e => setNewTicket(t=>({...t,category:e.target.value}))}>
              <option value="general">General</option><option value="technical">Technical</option><option value="billing">Billing</option><option value="compliance">Compliance</option>
            </select>
            <div className="ct-modal-actions">
              <button onClick={() => setCreateModal(false)}>Cancel</button>
              <button className="ct-create-btn" onClick={handleCreateTicket} disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
