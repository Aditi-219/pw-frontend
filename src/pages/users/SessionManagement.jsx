import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listSessions, revokeSession, revokeAllUserSessions, updateIpSessionRules, bulkRevokeSessions } from '../../services/usersService';
import './SessionManagement.css';

// GET /admin/sessions response schema isn't documented. We map common
// field-name candidates defensively; fields we can't find fall back to
// a placeholder instead of crashing the table.
function mapSession(s) {
  return {
    id: s.id,
    userId: s.user_id ?? s.user?.id,
    user: s.user?.name ?? s.user_name ?? s.user ?? '—',
    role: s.role ?? s.user?.role ?? '—',
    ip: s.ip_address ?? s.ip ?? '—',
    device: s.device ?? s.user_agent ?? '—',
    loginTime: s.login_at ?? s.created_at ?? s.loginTime ?? '—',
    suspicious: Boolean(s.is_suspicious ?? s.suspicious),
  };
}

export default function SessionManagement() {
  const { notification, notify, closeNotification } = useNotification();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [allowlist, setAllowlist] = useState('103.21.45.0/24');
  const [denylist, setDenylist] = useState('');
  const [sessionLimit, setSessionLimit] = useState(3);
  const [configSaving, setConfigSaving] = useState(null); // 'allowlist' | 'denylist' | 'limit' | null

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listSessions();
      setSessions(result.items.map(mapSession));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load sessions.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const columns = [
    { key: 'user', label: 'User' },
    { key: 'role', label: 'Role', render: (v) => <Badge variant="purple">{v}</Badge> },
    { key: 'ip', label: 'IP' },
    { key: 'device', label: 'Device' },
    { key: 'loginTime', label: 'Login Time' },
    {
      key: 'suspicious',
      label: 'Flag',
      render: (v) => v ? <Badge variant="danger">Suspicious</Badge> : <Badge variant="success">Normal</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Button variant="danger" size="sm" onClick={() => setModal({ type: 'revoke', session: row })}>Force logout</Button>
      ),
    },
  ];

  const closeModal = () => setModal(null);

  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      if (modal?.type === 'revoke') {
        await revokeSession(modal.session.id);
        notify.success(`Session for ${modal.session.user} revoked.`);
      } else if (modal?.type === 'revoke-all') {
        // No single "revoke all suspicious" endpoint exists — only
        // per-session revoke and per-user revoke-all. We loop over the
        // currently-loaded suspicious sessions individually.
        const suspicious = sessions.filter((s) => s.suspicious);
        if (!suspicious.length) { notify.warning('No suspicious sessions found.'); return; }
        await bulkRevokeSessions(suspicious.map((s) => s.id));
        notify.success(`Revoked ${suspicious.length} suspicious session(s).`);
      }
      closeModal();
      fetchSessions();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to revoke session(s).'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAllForUser = async () => {
    if (!modal?.session?.userId) {
      notify.error('Missing user id for this session — cannot revoke all.');
      return;
    }
    try {
      setActionLoading(true);
      await revokeAllUserSessions(modal.session.userId);
      notify.success(`All sessions for ${modal.session.user} revoked.`);
      closeModal();
      fetchSessions();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to revoke sessions.'));
    } finally {
      setActionLoading(false);
    }
  };

  const saveAllowlist = async () => {
    try {
      setConfigSaving('allowlist');
      await updateIpSessionRules({ role: 'merchant_admin', allowlist: allowlist.split('\n').map((s) => s.trim()).filter(Boolean) });
      notify.success('Allowlist saved.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save allowlist.'));
    } finally {
      setConfigSaving(null);
    }
  };

  const saveDenylist = async () => {
    try {
      setConfigSaving('denylist');
      await updateIpSessionRules({ role: 'merchant_admin', denylist: denylist.split('\n').map((s) => s.trim()).filter(Boolean) });
      notify.success('Denylist saved.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save denylist.'));
    } finally {
      setConfigSaving(null);
    }
  };

  const saveLimit = async () => {
    try {
      setConfigSaving('limit');
      await updateIpSessionRules({ role: 'merchant_admin', concurrentSessionLimit: sessionLimit });
      notify.success('Concurrent session limit updated.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to update limit.'));
    } finally {
      setConfigSaving(null);
    }
  };

  return (
    <PageWrapper
      title="Session & Device Management"
      subtitle="Screen 13 — Active sessions, revoke, IP lists, concurrent limits"
      actions={
        <Button variant="danger" onClick={() => setModal({ type: 'revoke-all' })}>Revoke all suspicious</Button>
      }
    >
      <Card title="Active Sessions">
        {loading ? <Loader text="Loading sessions..." /> : (
          <Table columns={columns} data={sessions} emptyMessage="No active sessions" />
        )}
      </Card>

      <div className="session-config">
        <Card title="IP Allowlist (per role)">
          <Input label="CIDR / IP ranges" value={allowlist} onChange={(e) => setAllowlist(e.target.value)} hint="One per line on server" />
          <Button variant="teal" style={{ marginTop: '0.75rem' }} onClick={saveAllowlist} loading={configSaving === 'allowlist'}>Save allowlist</Button>
        </Card>
        <Card title="IP Denylist">
          <Input label="Blocked IPs" value={denylist} onChange={(e) => setDenylist(e.target.value)} placeholder="e.g. 49.36.0.0/16" />
          <Button variant="secondary" style={{ marginTop: '0.75rem' }} onClick={saveDenylist} loading={configSaving === 'denylist'}>Save denylist</Button>
        </Card>
        <Card title="Concurrent Session Limit">
          <div className="session-limit">
            <label>Max sessions per role (Merchant Admin)</label>
            <input type="number" min={1} max={10} value={sessionLimit} onChange={(e) => setSessionLimit(Number(e.target.value))} />
          </div>
          <Button variant="primary" style={{ marginTop: '0.75rem' }} onClick={saveLimit} loading={configSaving === 'limit'}>Update limit</Button>
        </Card>
      </div>

      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title="Confirm Revoke"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={actionLoading}>Cancel</Button>
            <Button variant="danger" onClick={handleConfirm} loading={actionLoading}>Revoke</Button>
          </>
        }
      >
        {modal?.session && <p>Force logout <strong>{modal.session.user}</strong> from {modal.session.device}?</p>}
        {modal?.type === 'revoke-all' && <p>Revoke all sessions flagged as suspicious?</p>}
        {modal?.session && (
          <Button variant="ghost" size="sm" onClick={handleRevokeAllForUser} disabled={actionLoading}>
            Revoke all sessions for this user
          </Button>
        )}
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
