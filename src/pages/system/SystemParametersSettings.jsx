import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listSystemParameters, updateSystemParameters, toggleDebugLogging, getDebugLoggingStatus, resetSystemParameters } from '../../services/systemService';
import { triggerMaintenance } from '../../services/profileService';
import './SystemParametersSettings.css';

// GET /admin/system/parameters response schema isn't documented. Mapped
// defensively — the backend returns a flat key/value list (no
// section/category grouping field is documented), so we group by a
// `category` field if present, otherwise put everything under "general".
function groupParameters(items) {
  const groups = { general: [], loan: [], security: [] };
  items.forEach((p) => {
    const cat = p.category && groups[p.category] ? p.category : 'general';
    groups[cat].push({ key: p.key, value: p.value, description: p.description ?? '' });
  });
  return groups;
}

export default function SystemParametersSettings() {
  const { notification, notify, closeNotification } = useNotification();

  const [activeSection, setActiveSection] = useState('general');
  const [parameters, setParameters] = useState({ general: [], loan: [], security: [] });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [drafts, setDrafts] = useState({});

  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [debugLogging, setDebugLogging] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  const sections = ['general', 'loan', 'security'];

  const fetchParams = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listSystemParameters();
      const grouped = groupParameters(result.items);
      setParameters(grouped);
      const initialDrafts = {};
      Object.values(grouped).flat().forEach((p) => { initialDrafts[p.key] = p.value; });
      setDrafts(initialDrafts);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load system parameters.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchParams(); }, [fetchParams]);

  useEffect(() => {
    getDebugLoggingStatus().then(r => setDebugLogging(Boolean(r?.enabled ?? r?.debug_logging))).catch(() => {});
  }, []);

  const handleSaveParam = async (key) => {
    try {
      setSavingKey(key);
      await updateSystemParameters([{ key, value: drafts[key] }]);
      notify.success(`${key} updated.`);
      fetchParams();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to update parameter.'));
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleDebugLogging = async () => {
    const next = !debugLogging;
    try {
      setDebugLoading(true);
      await toggleDebugLogging(next);
      setDebugLogging(next);
      notify.success(next ? 'Debug logging enabled.' : 'Debug logging disabled.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to toggle debug logging.'));
    } finally {
      setDebugLoading(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all system parameters to defaults? This cannot be undone.')) return;
    try {
      setResetting(true);
      await resetSystemParameters();
      notify.success('System parameters reset to defaults.');
      fetchParams();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Reset failed.'));
    } finally {
      setResetting(false);
    }
  };

  const handleToggleMaintenance = async () => {
    const next = !maintenanceOn;
    try {
      setMaintenanceSaving(true);
      await triggerMaintenance({ enabled: next });
      setMaintenanceOn(next);
      notify.success(next ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to toggle maintenance mode.'));
    } finally {
      setMaintenanceSaving(false);
    }
  };

  return (
    <PageWrapper title="System Parameters & Settings" subtitle="Configure system-wide parameters">
      <div className="system-settings">
        <div className="settings-sidebar">
          {sections.map(section => (
            <button key={section} className={`section-btn ${activeSection === section ? 'active' : ''}`} onClick={() => setActiveSection(section)}>
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        <div className="settings-content">
          <Card>
            <h3 className="section-title">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Settings</h3>
            {loading ? <Loader text="Loading parameters..." /> : (
              <div className="parameters-list">
                {parameters[activeSection].map(param => (
                  <div key={param.key} className="param-item">
                    <div className="param-info">
                      <div className="param-key">{param.key}</div>
                      <div className="param-desc">{param.description}</div>
                    </div>
                    <div className="param-value">
                      <input
                        type="text"
                        className="param-input"
                        value={drafts[param.key] ?? ''}
                        onChange={(e) => setDrafts((d) => ({ ...d, [param.key]: e.target.value }))}
                      />
                      <button className="save-param" onClick={() => handleSaveParam(param.key)} disabled={savingKey === param.key}>
                        {savingKey === param.key ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ))}
                {!parameters[activeSection].length && <p className="param-empty">No parameters in this category yet.</p>}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="section-title">Advanced Configuration</h3>
            <div className="advanced-config">
              <div className="config-item">
                <div className="config-info">
                  <div className="config-name">Maintenance Mode</div>
                  <div className="config-desc">Put the system in maintenance mode</div>
                </div>
                <label className="toggle-switch-large">
                  <input type="checkbox" checked={maintenanceOn} onChange={handleToggleMaintenance} disabled={maintenanceSaving} />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="config-item">
                <div className="config-info">
                  <div className="config-name">Debug Logging</div>
                  <div className="config-desc">Log verbose debug output server-side</div>
                </div>
                <label className="toggle-switch-large">
                  <input type="checkbox" checked={debugLogging} onChange={handleToggleDebugLogging} disabled={debugLoading} />
                  <span className="slider"></span>
                </label>
              </div>
              <button className="reset-defaults" onClick={handleResetDefaults} disabled={resetting}>{resetting ? 'Resetting…' : 'Reset to Defaults'}</button>
            </div>
          </Card>
        </div>
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
