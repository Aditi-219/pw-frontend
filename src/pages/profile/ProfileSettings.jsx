import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Tabs from '../../components/common/Tabs';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getProfile, updateProfile, changeOwnPassword } from '../../services/profileService';
import './ProfileSettings.css';

const tabs = [
  { id: 'personal', label: 'Personal' },
  { id: 'security', label: 'Security & MFA' },
  { id: 'notifications', label: 'Preferences' },
];

export default function ProfileSettings() {
  const { notification, notify, closeNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', mobile: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', newPasswordConfirmation: '' });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const profile = await getProfile();
        setForm({ name: profile.name ?? '', email: profile.email ?? '', mobile: profile.mobile ?? profile.phone ?? '' });
        localStorage.setItem('user', JSON.stringify(profile));
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load profile.'));
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateProfile({ name: form.name, mobile: form.mobile });
      const fresh = await getProfile();
      localStorage.setItem('user', JSON.stringify(fresh));
      notify.success('Profile updated.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword || !pwForm.newPasswordConfirmation) {
      notify.warning('All password fields are required.');
      return;
    }
    if (pwForm.newPassword !== pwForm.newPasswordConfirmation) {
      notify.warning('New passwords do not match.');
      return;
    }
    try {
      setChangingPw(true);
      await changeOwnPassword(pwForm);
      notify.success('Password changed. Please log in again.');
      setPwForm({ currentPassword: '', newPassword: '', newPasswordConfirmation: '' });
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to change password.'));
    } finally {
      setChangingPw(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Profile & Personal Settings" subtitle="Screen 04">
        <Loader text="Loading profile..." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Profile & Personal Settings" subtitle="Screen 04 — Personal details, password, MFA, preferences">
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'personal' && (
        <Card title="Personal Details">
          <div className="profile-form">
            <div className="profile-grid">
              <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input label="Mobile" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
              <Input label="Email" value={form.email} disabled />
            </div>
            <p className="profile-note">Email is not editable. Timezone, theme, and photo upload are not yet supported by the backend.</p>
            <Button variant="teal" onClick={handleSave} loading={saving}>Save Changes</Button>
          </div>
        </Card>
      )}

      {activeTab === 'security' && (
        <>
          <Card title="Change Password">
            <div className="profile-grid">
              <Input label="Current Password" type="password" value={pwForm.currentPassword}
                onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} />
              <Input label="New Password" type="password" hint="Min 12 chars"
                value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} />
              <Input label="Confirm New Password" type="password"
                value={pwForm.newPasswordConfirmation} onChange={e => setPwForm({ ...pwForm, newPasswordConfirmation: e.target.value })} />
            </div>
            <Button variant="primary" style={{ marginTop:'1rem' }} onClick={handleChangePassword} loading={changingPw}>Update Password</Button>
          </Card>
          <Card title="Multi-Factor Authentication">
            <div className="profile-mfa">
              <p>Status: <Badge variant="success">Enabled</Badge></p>
              <p className="profile-note">MFA reconfigure/recovery-codes endpoint not yet available — use the login flow to re-setup TOTP.</p>
            </div>
          </Card>
        </>
      )}

      {activeTab === 'notifications' && (
        <Card title="Notification Preferences">
          <p className="profile-note">No backend endpoint yet for per-channel notification preferences.</p>
        </Card>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
