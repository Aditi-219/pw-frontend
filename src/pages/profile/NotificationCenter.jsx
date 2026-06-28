import { useState, useEffect, useCallback, useMemo } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Tabs from '../../components/common/Tabs';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/searchbar';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  bulkMarkRead,
  bulkArchive,
  bulkSnooze,
} from '../../services/profileService';
import './NotificationCenter.css';

const TAB_DEFS = [
  { id: 'all', label: 'All' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'system', label: 'System' },
  { id: 'mentions', label: 'Mentions' },
];

const priorityVariant = { critical: 'danger', high: 'warning', medium: 'info', info: 'default' };

// GET /admin/notifications response schema isn't documented beyond the
// `tab` query param. Field names below are best-guess; unknown ones fall
// back gracefully.
function mapNotification(n) {
  return {
    id: n.id,
    title: n.title ?? n.subject ?? '—',
    body: n.body ?? n.message ?? '',
    type: n.type ?? n.category ?? 'system',
    priority: n.priority ?? 'info',
    read: Boolean(n.read ?? n.is_read),
    date: n.date ?? n.created_at?.slice(0, 10) ?? '—',
    mention: Boolean(n.mention ?? n.is_mention),
  };
}

export default function NotificationCenter() {
  const { notification, notify, closeNotification } = useNotification();

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selected, setSelected] = useState([]);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listNotifications({ tab: activeTab });
      setItems(result.items.map(mapNotification));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load notifications.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Search and date filtering happen client-side — the backend only
  // supports filtering by `tab`, not free-text search or date range.
  const filtered = useMemo(() => {
    return items.filter((n) => {
      const searchMatch = n.title.toLowerCase().includes(search.toLowerCase()) || n.body.toLowerCase().includes(search.toLowerCase());
      const dateMatch = !dateFrom || n.date >= dateFrom;
      return searchMatch && dateMatch;
    });
  }, [items, search, dateFrom]);

  const tabs = TAB_DEFS.map((t) => ({
    ...t,
    count: t.id === 'all' ? items.length : items.filter((n) => n.type === t.id).length,
  }));

  const toggleSelect = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const runBulk = async (label, fn) => {
    if (!selected.length) return;
    try {
      setActionLoading(true);
      await fn(selected);
      notify.success(label);
      setSelected([]);
      fetchNotifications();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Action failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const markReadOne = async (id) => {
    try {
      await markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to mark as read.'));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setActionLoading(true);
      await markAllNotificationsRead();
      notify.success('All notifications marked read.');
      fetchNotifications();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to mark all read.'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Notification Center"
      subtitle="Screen 05 — Approvals, alerts, system events, mentions"
      actions={
        <>
          <Button variant="secondary" onClick={() => runBulk('Marked as read.', bulkMarkRead)} disabled={!selected.length || actionLoading}>Mark read</Button>
          <Button variant="secondary" onClick={() => runBulk('Snoozed for 1 hour.', (ids) => bulkSnooze(ids, 60))} disabled={!selected.length || actionLoading}>Snooze</Button>
          <Button variant="secondary" onClick={() => runBulk('Archived.', bulkArchive)} disabled={!selected.length || actionLoading}>Archive</Button>
          <Button variant="primary" onClick={handleMarkAllRead} loading={actionLoading}>Mark all read</Button>
        </>
      }
    >
      <Card>
        <div className="notif-toolbar">
          <SearchBar placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Input label="From date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        {loading ? (
          <Loader text="Loading notifications..." />
        ) : (
          <ul className="notif-list">
            {filtered.map((n) => (
              <li key={n.id} className={`notif-item ${n.read ? 'notif-item--read' : ''} notif-item--${n.priority}`}>
                <input type="checkbox" checked={selected.includes(n.id)} onChange={() => toggleSelect(n.id)} />
                <div className="notif-item__body">
                  <div className="notif-item__head">
                    <strong>{n.title}</strong>
                    <Badge variant={priorityVariant[n.priority]}>{n.priority}</Badge>
                    {n.mention && <Badge variant="purple">@mention</Badge>}
                  </div>
                  <p>{n.body}</p>
                  <span className="notif-item__date">{n.date}</span>
                </div>
                <div className="notif-item__actions">
                  <Button variant="ghost" size="sm" onClick={() => markReadOne(n.id)}>Read</Button>
                  <Button variant="ghost" size="sm">Open</Button>
                </div>
              </li>
            ))}
            {!filtered.length && <li className="notif-empty">No notifications</li>}
          </ul>
        )}
      </Card>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
