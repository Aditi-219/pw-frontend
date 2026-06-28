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
import { getProfile, updateProfile, changeOwnPassword, uploadProfilePhoto, getMfaStatus, setupMfa, confirmMfa, useEmailMfa, regenerateRecoveryCodes } from '../../services/profileService';
import './ProfileSettings.css';
import { useRef } from 'react';

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

  const [form, setForm] = useState({ name: '', email: '', mobile: '', timezone: 'UTC' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', newPasswordConfirmation: '' });
  const [changingPw, setChangingPw] = useState(false);
  
  const [mfaStatus, setMfaStatus] = useState(null);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });
  
  const photoInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [profile, mfa] = await Promise.all([
          getProfile(),
          getMfaStatus().catch(() => null)
        ]);
        setForm({ 
          name: profile.name ?? '', 
          email: profile.email ?? '', 
          mobile: profile.mobile ?? profile.phone ?? '',
          timezone: profile.timezone ?? 'UTC'
        });
        if (profile.notifications) {
          setNotifications(profile.notifications);
        }
        setMfaStatus(mfa);
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
      await updateProfile({ ...form, notifications });
      const fresh = await getProfile();
      localStorage.setItem('user', JSON.stringify(fresh));
      notify.success('Profile updated.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('photo', file);
      await uploadProfilePhoto(formData);
      notify.success('Profile photo updated.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to upload photo.'));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSetup = async () => {
    try {
      const data = await setupMfa();
      setMfaSetup(data);
      notify.success('MFA setup initialized.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to setup MFA.'));
    }
  };

  const handleMfaConfirm = async () => {
    if (!mfaCode) return notify.warning('Please enter the code.');
    try {
      await confirmMfa(mfaCode);
      setMfaSetup(null);
      setMfaCode('');
      setMfaStatus({ ...mfaStatus, is_enabled: true });
      notify.success('MFA successfully enabled.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to confirm MFA.'));
    }
  };

  const handleUseEmailMfa = async () => {
    try {
      await useEmailMfa();
      notify.success('Switched to Email MFA.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to switch to Email MFA.'));
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      const codes = await regenerateRecoveryCodes();
      setRecoveryCodes(codes);
      notify.success('Recovery codes regenerated.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to regenerate codes.'));
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
            <div className="profile-photo" style={{ marginBottom: '1rem' }}>
              <input type="file" ref={photoInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} accept="image/*" />
              <Button onClick={() => photoInputRef.current?.click()} variant="outline">Upload Photo</Button>
            </div>
            <div className="profile-grid">
              <Input label="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <Input label="Mobile" value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} />
              <Input label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <div className="input-group">
                <label className="input-label">Timezone</label>
                <select className="input-field" value={form.timezone} onChange={e => setForm({ ...form, timezone: e.target.value })}>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
            </div>
            <Button variant="teal" onClick={handleSave} loading={saving} style={{ marginTop: '1rem' }}>Save Changes</Button>
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
          <Card title="Multi-Factor Authentication" style={{ marginTop: '1rem' }}>
            <div className="profile-mfa">
              <p>Status: <Badge variant={mfaStatus?.is_enabled ? "success" : "warning"}>{mfaStatus?.is_enabled ? "Enabled" : "Disabled"}</Badge></p>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem', flexWrap: 'wrap' }}>
                <Button onClick={handleMfaSetup} variant="outline">Setup TOTP</Button>
                <Button onClick={handleUseEmailMfa} variant="outline">Use Email MFA</Button>
                <Button onClick={handleRegenerateCodes} variant="outline">Regenerate Recovery Codes</Button>
              </div>

              {mfaSetup && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '4px' }}>
                  <p>Scan this code in your Authenticator app, or use the secret key.</p>
                  <div style={{ margin: '1rem 0' }}>
                     {mfaSetup.qr_code && <img src={mfaSetup.qr_code} alt="QR Code" />}
                     <p>Secret: <strong>{mfaSetup.secret}</strong></p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Input value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="Enter 6-digit code" />
                    <Button onClick={handleMfaConfirm}>Confirm</Button>
                  </div>
                </div>
              )}

              {recoveryCodes && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff3e0', borderRadius: '4px' }}>
                  <p><strong>Save these recovery codes securely. They will not be shown again.</strong></p>
                  <pre>{Array.isArray(recoveryCodes) ? recoveryCodes.join('\n') : JSON.stringify(recoveryCodes, null, 2)}</pre>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {activeTab === 'notifications' && (
        <Card title="Notification Preferences">
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <input type="checkbox" checked={notifications.email} onChange={e => setNotifications({...notifications, email: e.target.checked})} />
               Email Notifications
             </label>
             <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <input type="checkbox" checked={notifications.sms} onChange={e => setNotifications({...notifications, sms: e.target.checked})} />
               SMS Notifications
             </label>
             <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
               <input type="checkbox" checked={notifications.push} onChange={e => setNotifications({...notifications, push: e.target.checked})} />
               Push Notifications
             </label>
             <Button variant="teal" onClick={handleSave} loading={saving} style={{ width: 'fit-content' }}>Save Preferences</Button>
           </div>
        </Card>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
