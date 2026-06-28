import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  killFeatureFlag,
  createAbTest,
  getAbTestResults,
} from '../../services/systemService';
import './FeatureFlagsABTests.css';

// GET /admin/feature-flags response schema isn't documented. Mapped
// defensively from plausible field names.
function mapFlag(f) {
  return {
    id: f.key ?? f.id,
    name: f.name ?? f.key ?? '—',
    enabled: (f.rollout_status ?? (f.default_value ? 'on' : 'off')) === 'on',
    rollout: f.rollout_percent != null ? `${f.rollout_percent}%` : (f.rollout_status === 'on' ? '100%' : '0%'),
    type: f.type ?? 'boolean',
    description: f.description ?? '',
  };
}

export default function FeatureFlagsABTests() {
  const { notification, notify, closeNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('flags');

  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  const [createModal, setCreateModal] = useState(false);
  const [newFlag, setNewFlag] = useState({ name: '', key: '', type: 'boolean' });
  const [creating, setCreating] = useState(false);

  const [abModal, setAbModal] = useState(null); // flag for which we're creating a test
  const [abForm, setAbForm] = useState({ name: '', trafficSplit: 50, metric: 'approval_rate' });
  const [abSaving, setAbSaving] = useState(false);
  const [abResults, setAbResults] = useState({}); // key -> results

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listFeatureFlags();
      setFlags(result.items.map(mapFlag));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load feature flags.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchFlags(); }, [fetchFlags]);

  const handleToggle = async (flag) => {
    try {
      setSavingKey(flag.id);
      await updateFeatureFlag(flag.id, { rolloutStatus: flag.enabled ? 'off' : 'on' });
      notify.success(`${flag.name} ${flag.enabled ? 'disabled' : 'enabled'}.`);
      fetchFlags();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to toggle flag.'));
    } finally {
      setSavingKey(null);
    }
  };

  const handleKill = async (flag) => {
    try {
      setSavingKey(flag.id);
      await killFeatureFlag(flag.id, 'Killed from Feature Flags admin page');
      notify.success(`${flag.name} killed (forced off).`);
      fetchFlags();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to kill flag.'));
    } finally {
      setSavingKey(null);
    }
  };

  const handleCreate = async () => {
    if (!newFlag.name.trim() || !newFlag.key.trim()) {
      notify.warning('Name and key are required.');
      return;
    }
    try {
      setCreating(true);
      await createFeatureFlag({ name: newFlag.name, key: newFlag.key, type: newFlag.type, defaultValue: false });
      notify.success('Feature flag created.');
      setCreateModal(false);
      setNewFlag({ name: '', key: '', type: 'boolean' });
      fetchFlags();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to create flag.'));
    } finally {
      setCreating(false);
    }
  };

  const openAbTest = (flag) => {
    setAbForm({ name: `${flag.name} A/B Test`, trafficSplit: 50, metric: 'approval_rate' });
    setAbModal(flag);
  };

  const handleCreateAbTest = async () => {
    if (!abModal) return;
    try {
      setAbSaving(true);
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await createAbTest(abModal.id, {
        name: abForm.name,
        variant_a_value: false,
        variant_b_value: true,
        traffic_split: Number(abForm.trafficSplit),
        metric: abForm.metric,
        start_at: now.toISOString(),
        end_at: end.toISOString(),
      });
      notify.success('A/B test created.');
      setAbModal(null);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to create A/B test.'));
    } finally {
      setAbSaving(false);
    }
  };

  const handleViewResults = async (flag) => {
    try {
      const result = await getAbTestResults(flag.id);
      setAbResults((r) => ({ ...r, [flag.id]: result }));
      notify.success(`Results loaded for ${flag.name}.`);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load results.'));
    }
  };

  return (
    <PageWrapper title="Feature Flags & A/B Tests" subtitle="Control feature rollouts and experiment management">
      <div className="feature-flags">
        <div className="tabs">
          <button className={`tab ${activeTab === 'flags' ? 'active' : ''}`} onClick={() => setActiveTab('flags')}>Feature Flags</button>
          <button className={`tab ${activeTab === 'tests' ? 'active' : ''}`} onClick={() => setActiveTab('tests')}>A/B Tests</button>
        </div>

        {activeTab === 'flags' && (
          <Card>
            <div className="flags-header">
              <button className="create-flag-btn" onClick={() => setCreateModal(true)}>+ Create Feature Flag</button>
            </div>
            {loading ? <Loader text="Loading flags..." /> : (
              <div className="flags-table">
                <div className="table-header">
                  <div>Name</div>
                  <div>Status</div>
                  <div>Rollout</div>
                  <div>Type</div>
                  <div>Actions</div>
                </div>
                {flags.map(flag => (
                  <div key={flag.id} className="table-row">
                    <div className="flag-name">{flag.name}</div>
                    <div><span className={`status-badge ${flag.enabled ? 'enabled' : 'disabled'}`}>{flag.enabled ? 'Enabled' : 'Disabled'}</span></div>
                    <div>{flag.rollout}</div>
                    <div>{flag.type}</div>
                    <div className="actions">
                      <label className="toggle-switch-small">
                        <input type="checkbox" checked={flag.enabled} onChange={() => handleToggle(flag)} disabled={savingKey === flag.id} />
                        <span className="slider"></span>
                      </label>
                      <button className="edit-flag" onClick={() => handleKill(flag)} disabled={savingKey === flag.id}>Kill switch</button>
                    </div>
                  </div>
                ))}
                {!flags.length && <p className="ff-empty">No feature flags yet.</p>}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'tests' && (
          <Card>
            <p className="ff-note">A/B tests run per feature flag. Pick a flag to start or view a test.</p>
            {loading ? <Loader text="Loading flags..." /> : (
              <div className="tests-list">
                {flags.map(flag => (
                  <div key={flag.id} className="test-card">
                    <div className="test-header">
                      <div className="test-name">{flag.name}</div>
                    </div>
                    {abResults[flag.id] && (
                      <pre className="ab-results">{JSON.stringify(abResults[flag.id], null, 2)}</pre>
                    )}
                    <div className="test-actions">
                      <button className="stop-test" onClick={() => openAbTest(flag)}>Start A/B Test</button>
                      <button className="view-results" onClick={() => handleViewResults(flag)}>View Results</button>
                    </div>
                  </div>
                ))}
                {!flags.length && <p className="ff-empty">No flags available to test.</p>}
              </div>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Feature Flag"
        footer={
          <>
            <button className="edit-flag" onClick={() => setCreateModal(false)} disabled={creating}>Cancel</button>
            <button className="create-flag-btn" onClick={handleCreate} disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
          </>
        }
      >
        <Input label="Name" value={newFlag.name} onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })} placeholder="e.g. New Checkout Flow" />
        <Input label="Key" value={newFlag.key} onChange={(e) => setNewFlag({ ...newFlag, key: e.target.value })} placeholder="e.g. new_checkout_flow" />
      </Modal>

      <Modal
        isOpen={!!abModal}
        onClose={() => setAbModal(null)}
        title={`Start A/B Test — ${abModal?.name ?? ''}`}
        footer={
          <>
            <button className="edit-flag" onClick={() => setAbModal(null)} disabled={abSaving}>Cancel</button>
            <button className="create-flag-btn" onClick={handleCreateAbTest} disabled={abSaving}>{abSaving ? 'Starting…' : 'Start Test'}</button>
          </>
        }
      >
        <Input label="Test name" value={abForm.name} onChange={(e) => setAbForm({ ...abForm, name: e.target.value })} />
        <Input label="Traffic split to variant B (%)" type="number" value={abForm.trafficSplit} onChange={(e) => setAbForm({ ...abForm, trafficSplit: e.target.value })} />
        <Input label="Success metric" value={abForm.metric} onChange={(e) => setAbForm({ ...abForm, metric: e.target.value })} placeholder="e.g. approval_rate" />
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
