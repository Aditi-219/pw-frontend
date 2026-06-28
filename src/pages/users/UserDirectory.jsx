import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/searchbar';
import Modal from '../../components/common/Modal';
import Dropdown from '../../components/common/Dropdown';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import Pagination from '../../components/common/Pagination';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listUsers,
  disableUser,
  enableUser,
  bulkDisableUsers,
  forceMfa,
  requestPasswordResetCode,
  impersonateUser,
  exportUsersCsv,
} from '../../services/usersService';
import './UserDirectory.css';

// Maps an API user record onto the field names this page's UI was built
// around. Field names below (status/last_login/etc.) are best-guess from
// the request-body conventions used elsewhere in the spec (snake_case) —
// the GET /admin/users response schema itself isn't documented, so some
// of these may need correcting once we see a real payload. Unknown/missing
// fields fall back gracefully instead of crashing the table.
function mapUser(u) {
  return {
    id: u.id,
    name: u.name ?? '—',
    email: u.email ?? '—',
    role: u.role ?? u.role_name ?? '—',
    merchant: u.merchant?.name ?? u.merchant_name ?? '—',
    status: (u.status ?? (u.is_active === false ? 'disabled' : 'active'))?.toLowerCase(),
    lastLogin: u.last_login_at ?? u.last_login ?? u.lastLogin ?? '—',
    raw: u,
  };
}

export default function UserDirectory() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listUsers({
        role: roleFilter,
        status: statusFilter,
        search,
        page,
      });
      setUsers(result.items.map(mapUser));
      setTotalPages(result.totalPages);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load users.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter, page]);

  // Debounce search so we don't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter, statusFilter, page]);

  const columns = [
    {
      key: 'select',
      label: '',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selected.includes(row.id)}
          onChange={() => setSelected((s) => s.includes(row.id) ? s.filter((id) => id !== row.id) : [...s, row.id])}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (v) => <Badge variant="purple">{v}</Badge> },
    { key: 'merchant', label: 'Merchant' },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={v === 'active' ? 'success' : 'danger'}>{v}</Badge> },
    { key: 'lastLogin', label: 'Last Active' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <Dropdown
          trigger={<Button variant="secondary" size="sm">⋯</Button>}
          items={[
            { label: 'Edit', onClick: () => navigate(`/users/edit/${row.id}`) },
            { label: 'View activity', onClick: () => {} },
            { label: 'Impersonate (audit)', onClick: () => { setReason(''); setModal({ type: 'impersonate', user: row }); } },
            { divider: true },
            row.status === 'active'
              ? { label: 'Disable', danger: true, onClick: () => { setReason(''); setModal({ type: 'disable', user: row }); } }
              : { label: 'Enable', onClick: () => { setReason(''); setModal({ type: 'enable', user: row }); } },
            { label: 'Reset password', onClick: () => { setReason(''); setModal({ type: 'reset', user: row }); } },
            { label: 'Force MFA', onClick: () => { setReason(''); setModal({ type: 'mfa', user: row }); } },
          ]}
        />
      ),
    },
  ];

  const bulkDisable = () => { setReason(''); setModal({ type: 'bulk-disable', count: selected.length }); };

  const exportCsv = async () => {
    try {
      setActionLoading(true);
      const blob = await exportUsersCsv();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'users-export.csv';
      a.click();
      notify.success('Export started — check your downloads.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => setModal(null);

  const confirmModal = async () => {
    if (!modal) return;
    try {
      setActionLoading(true);

      if (modal.type === 'disable') {
        await disableUser(modal.user.id, reason);
        notify.success(`${modal.user.name} disabled.`);
      } else if (modal.type === 'enable') {
        await enableUser(modal.user.id);
        notify.success(`${modal.user.name} enabled.`);
      } else if (modal.type === 'bulk-disable') {
        await bulkDisableUsers(selected, reason);
        notify.success(`${modal.count} users disabled.`);
        setSelected([]);
      } else if (modal.type === 'reset') {
        await requestPasswordResetCode(modal.user.id, modal.user.email);
        notify.success('Password reset code sent.');
      } else if (modal.type === 'mfa') {
        await forceMfa(modal.user.id);
        notify.success(`MFA will be required for ${modal.user.name} on next login.`);
      } else if (modal.type === 'impersonate') {
        await impersonateUser(modal.user.id, reason);
        notify.success(`Impersonation session started for ${modal.user.name}.`);
      }

      closeModal();
      fetchUsers();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Action failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const reasonRequired = modal && ['disable', 'bulk-disable', 'impersonate'].includes(modal.type);

  return (
    <PageWrapper
      title="User Directory"
      subtitle="Screen 09 — All roles, filters, bulk actions, export"
      actions={
        <>
          <Button variant="secondary" onClick={exportCsv} disabled={actionLoading}>Export CSV</Button>
          <Button variant="secondary" onClick={bulkDisable} disabled={!selected.length}>Bulk disable</Button>
          <Button variant="primary" onClick={() => navigate('/users/create')}>+ Create User</Button>
        </>
      }
    >
      <Card>
        <div className="user-dir__filters">
          <SearchBar placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="all">All Roles</option>
            <option value="Merchant Admin">Merchant Admin</option>
            <option value="Store Manager">Store Manager</option>
            <option value="Lender Ops">Lender Ops</option>
            <option value="Risk User">Risk User</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {loading ? (
          <Loader text="Loading users..." />
        ) : (
          <>
            <Table columns={columns} data={users} onRowClick={(row) => navigate(`/users/edit/${row.id}`)} emptyMessage="No users found" />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
          </>
        )}
      </Card>

      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title={modal?.type === 'impersonate' ? 'Impersonate User' : 'Confirm Action'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={actionLoading}>Cancel</Button>
            <Button
              variant="danger"
              onClick={confirmModal}
              loading={actionLoading}
              disabled={reasonRequired && !reason.trim()}
            >
              Confirm (audit logged)
            </Button>
          </>
        }
      >
        {modal?.user && <p>Action on <strong>{modal.user.name}</strong> — reason required for audit.</p>}
        {modal?.type === 'bulk-disable' && <p>Disable {modal.count} selected users?</p>}
        {modal?.type === 'enable' && <p>Enable <strong>{modal?.user?.name}</strong>?</p>}
        {modal?.type === 'reset' && <p>Send a password reset verification code to <strong>{modal?.user?.email}</strong>?</p>}
        {modal?.type === 'mfa' && <p>Force MFA setup for <strong>{modal?.user?.name}</strong> on next login?</p>}
        {reasonRequired && (
          <textarea
            className="user-dir__reason"
            placeholder="Mandatory comment..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
