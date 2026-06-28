import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getUser, createUser, updateUser } from '../../services/usersService';
import './CreateEditUser.css';

const ROLES = ['Super Admin','Merchant Admin','Store Manager','Sales Exec','Lender Ops','Risk User'];
const STORES = ['Store A — Mumbai','Store B — Delhi','Store C — Bangalore'];

const EMPTY = { name:'', email:'', mobile:'', role:'Merchant Admin', forceMfa:true, passwordExpiry:'90', activeFrom:'', activeTo:'', sendInvite:true, stores:[] };

export default function CreateEditUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const { notification, notify, closeNotification } = useNotification();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        setLoading(true);
        const u = await getUser(id);
        setForm(f => ({
          ...f,
          name: u.name ?? '',
          email: u.email ?? '',
          mobile: u.mobile ?? u.phone ?? '',
          role: u.role ?? f.role,
          forceMfa: Boolean(u.force_mfa ?? u.forceMfa ?? true),
          passwordExpiry: String(u.password_expiry_policy ?? u.passwordExpiry ?? '90'),
          activeFrom: u.activation_date ?? '',
          activeTo: u.deactivation_date ?? '',
        }));
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load user.'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleStore = store => setForm(f => ({ ...f, stores: f.stores.includes(store) ? f.stores.filter(s => s !== store) : [...f.stores, store] }));

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      setSaving(true);
      if (isEdit) {
        await updateUser(id, {
          name: form.name,
          mobile: form.mobile,
          role: form.role,
          forceMfa: form.forceMfa,
          passwordExpiryPolicy: Number(form.passwordExpiry),
          activationDate: form.activeFrom || undefined,
          deactivationDate: form.activeTo || undefined,
        });
        notify.success('User updated.');
      } else {
        await createUser({ name: form.name, email: form.email, mobile: form.mobile, role: form.role });
        notify.success('Invite sent via email & SMS.');
      }
      navigate('/users');
    } catch (err) {
      notify.error(getErrorMessage(err, isEdit ? 'Failed to update user.' : 'Failed to create user.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <PageWrapper title={isEdit ? 'Edit User' : 'Create User'} subtitle="Screen 10">
      <Loader text="Loading user..." />
    </PageWrapper>
  );

  return (
    <PageWrapper title={isEdit ? 'Edit User' : 'Create User'} subtitle="Screen 10 — Onboarding, role, scope, MFA"
      actions={<Button variant="secondary" onClick={() => navigate('/users')}>Cancel</Button>}
    >
      <form onSubmit={handleSubmit}>
        <Card title="User Details">
          <div className="create-user__grid">
            <Input label="Full Name" value={form.name} onChange={e => update('name', e.target.value)} required />
            <Input label="Email" type="email" value={form.email} onChange={e => update('email', e.target.value)} required disabled={isEdit} />
            <Input label="Mobile" value={form.mobile} onChange={e => update('mobile', e.target.value)} required={!isEdit} />
            <div className="create-user__field">
              <label>Role</label>
              <select value={form.role} onChange={e => update('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Store Assignment">
          <div className="create-user__stores">
            {STORES.map(s => (
              <label key={s} className="create-user__store-chip">
                <input type="checkbox" checked={form.stores.includes(s)} onChange={() => toggleStore(s)} />
                {s}
              </label>
            ))}
          </div>
        </Card>

        <Card title="Security & Access">
          <div className="create-user__grid">
            <label className="create-user__check">
              <input type="checkbox" checked={form.forceMfa} onChange={e => update('forceMfa', e.target.checked)} />
              Force MFA on first login
            </label>
            <div className="create-user__field">
              <label>Password expiry (days)</label>
              <select value={form.passwordExpiry} onChange={e => update('passwordExpiry', e.target.value)}>
                <option value="30">30</option><option value="60">60</option><option value="90">90</option>
              </select>
            </div>
            <Input label="Activation date" type="date" value={form.activeFrom} onChange={e => update('activeFrom', e.target.value)} />
            <Input label="Deactivation date" type="date" value={form.activeTo} onChange={e => update('activeTo', e.target.value)} />
          </div>
        </Card>

        <Notification {...notification} onClose={closeNotification} />
        <div className="create-user__footer">
          <Button type="submit" variant="primary" loading={saving}>{isEdit ? 'Save User' : 'Create & Send Invite'}</Button>
        </div>
      </form>
    </PageWrapper>
  );
}
