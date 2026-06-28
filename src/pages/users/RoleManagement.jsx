import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listRoles, createRole, cloneRole as cloneRoleApi, archiveRole as archiveRoleApi } from '../../services/usersService';
import './RoleManagement.css';

// Backend role schema is { id, name, permissions }. There's no description
// or builtin/modified/user-count field in the request/response docs — we
// display whatever the API gives us and fall back gracefully otherwise.
function mapRole(r) {
  return {
    id: r.id,
    name: r.name ?? '—',
    description: r.description ?? '',
    users: r.users_count ?? r.user_count ?? r.users ?? 0,
    builtin: r.is_builtin ?? r.builtin ?? false,
    modified: r.updated_at ?? r.modified ?? '—',
  };
}

export default function RoleManagement() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listRoles();
      setRoles(result.items.map(mapRole));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load roles.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openClone = (role) => {
    setNewRole({ name: `${role.name} (Copy)`, description: role.description });
    setModal({ type: 'clone', source: role });
  };

  const openCreate = () => {
    setNewRole({ name: '', description: '' });
    setModal({ type: 'create' });
  };

  const openArchive = (role) => setModal({ type: 'archive', role });

  const closeModal = () => setModal(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (modal.type === 'clone') {
        await cloneRoleApi(modal.source.id, newRole.name);
        notify.success(`Role cloned as "${newRole.name}".`);
      } else if (modal.type === 'create') {
        // Backend requires a `permissions` array on create. The grid here
        // doesn't collect permissions yet — new roles start empty and
        // should be configured from Permission Matrix right after.
        await createRole({ name: newRole.name, permissions: [] });
        notify.success(`Role "${newRole.name}" created — set permissions next.`);
      } else if (modal.type === 'archive') {
        await archiveRoleApi(modal.role.id);
        notify.success(`${modal.role.name} archived.`);
      }
      closeModal();
      fetchRoles();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Action failed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper
      title="Role Management"
      subtitle="Screen 11 — Built-in roles, clone, archive, user counts"
      actions={<Button variant="primary" onClick={openCreate}>+ Create Role</Button>}
    >
      {loading ? (
        <Loader text="Loading roles..." />
      ) : (
        <div className="roles-grid">
          {roles.map((role) => (
            <Card key={role.id} className="role-card">
              <div className="role-card__head">
                <h3>{role.name}</h3>
                {role.builtin && <Badge variant="info">Built-in</Badge>}
              </div>
              {role.description && <p className="role-card__desc">{role.description}</p>}
              <div className="role-card__meta">
                <span>{role.users} users</span>
                <span>Modified: {role.modified}</span>
              </div>
              <div className="role-card__actions">
                <Button variant="secondary" size="sm" onClick={() => navigate('/users/permissions')}>Edit permissions</Button>
                <Button variant="ghost" size="sm" onClick={() => openClone(role)}>Clone</Button>
                {!role.builtin && (
                  <Button variant="danger" size="sm" onClick={() => openArchive(role)}>Archive</Button>
                )}
              </div>
            </Card>
          ))}
          {!roles.length && <p className="roles-empty">No roles found.</p>}
        </div>
      )}

      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title={modal?.type === 'archive' ? 'Archive Role' : modal?.type === 'clone' ? 'Clone Role' : 'Create Role'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Save</Button>
          </>
        }
      >
        {modal?.type === 'archive' && (
          <p>Archive <strong>{modal.role.name}</strong>? Users must be reassigned first.</p>
        )}
        {(modal?.type === 'clone' || modal?.type === 'create') && (
          <>
            <Input label="Role name" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} />
            {modal?.type === 'create' && (
              <Input label="Description (not saved — backend has no description field)" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} disabled />
            )}
            {modal?.type === 'clone' && <p className="role-modal__inherit">Inherits permissions from {modal.source.name}</p>}
          </>
        )}
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
