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
  listIntegrations,
  healthCheckIntegration,
  toggleIntegration,
  updateIntegration,
} from '../../services/systemService';
import './ThirdPartyIntegrations.css';

// GET /admin/integrations response schema isn't documented. Mapped
// defensively from plausible field names.
function mapIntegration(i) {
  return {
    id: i.id,
    name: i.name ?? i.provider ?? '—',
    type: i.category ?? i.type ?? '—',
    status: i.status ?? (i.is_active ? 'active' : 'inactive'),
    lastSync: i.last_health_check ?? i.last_sync ?? i.lastSync ?? '—',
    apiCalls: i.api_calls ?? i.apiCalls ?? '—',
    baseUrl: i.base_url ?? '',
  };
}

export default function ThirdPartyIntegrations() {
  const { notification, notify, closeNotification } = useNotification();

  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [configModal, setConfigModal] = useState(null);
  const [configForm, setConfigForm] = useState({ baseUrl: '', notes: '' });
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listIntegrations();
      setIntegrations(result.items.map(mapIntegration));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load integrations.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const handleTestConnection = async (integration) => {
    try {
      setBusyId(integration.id);
      await healthCheckIntegration(integration.id);
      notify.success(`${integration.name}: health check passed.`);
      fetchIntegrations();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Health check failed.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (integration) => {
    try {
      setBusyId(integration.id);
      await toggleIntegration(integration.id);
      notify.success(`${integration.name} toggled.`);
      fetchIntegrations();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to toggle integration.'));
    } finally {
      setBusyId(null);
    }
  };

  const openConfig = (integration) => {
    setConfigForm({ baseUrl: integration.baseUrl ?? '', notes: '' });
    setConfigModal(integration);
  };

  const handleSaveConfig = async () => {
    if (!configModal) return;
    try {
      setSavingConfig(true);
      await updateIntegration(configModal.id, { base_url: configForm.baseUrl, notes: configForm.notes });
      notify.success('Integration config saved.');
      setConfigModal(null);
      fetchIntegrations();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save config.'));
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <PageWrapper title="Third-Party Integration Switchboard" subtitle="Manage all external service integrations">
      <div className="integrations">
        {loading ? <Loader text="Loading integrations..." /> : (
          <div className="integrations-grid">
            {integrations.map(integration => (
              <Card key={integration.id}>
                <div className="integration-card">
                  <div className="integration-header">
                    <div className="integration-name">{integration.name}</div>
                    <div className={`integration-status status-${integration.status}`}>{integration.status}</div>
                  </div>
                  <div className="integration-type">{integration.type}</div>
                  <div className="integration-stats">
                    <div className="stat">
                      <span className="label">API Calls</span>
                      <span className="value">{integration.apiCalls}</span>
                    </div>
                    <div className="stat">
                      <span className="label">Last Health Check</span>
                      <span className="value">{integration.lastSync}</span>
                    </div>
                  </div>
                  <div className="integration-actions">
                    <button className="test-conn-btn" onClick={() => handleTestConnection(integration)} disabled={busyId === integration.id}>
                      {busyId === integration.id ? '…' : 'Test Connection'}
                    </button>
                    <button className="config-btn" onClick={() => openConfig(integration)}>Configure</button>
                    <button className="sync-btn" onClick={() => handleToggle(integration)} disabled={busyId === integration.id}>
                      {integration.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            {!integrations.length && <p className="integ-empty">No integrations found.</p>}
          </div>
        )}

        <div className="api-keys-section">
          <Card>
            <h3 className="section-title">API Key Management</h3>
            <p className="integ-note">
              API key / webhook secret rotation isn't exposed by a dedicated endpoint — keys are set
              via the Configure dialog above (PUT /admin/integrations/&#123;id&#125;), which includes
              api_key/api_secret fields but no separate "rotate" action.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={!!configModal}
        onClose={() => setConfigModal(null)}
        title={`Configure ${configModal?.name ?? ''}`}
        footer={
          <>
            <button className="config-btn" onClick={() => setConfigModal(null)} disabled={savingConfig}>Cancel</button>
            <button className="test-conn-btn" onClick={handleSaveConfig} disabled={savingConfig}>{savingConfig ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <Input label="Base URL" value={configForm.baseUrl} onChange={(e) => setConfigForm({ ...configForm, baseUrl: e.target.value })} />
        <Input label="Notes" value={configForm.notes} onChange={(e) => setConfigForm({ ...configForm, notes: e.target.value })} />
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
