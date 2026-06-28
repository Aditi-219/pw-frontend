import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  activateTemplate,
  archiveTemplate,
  testSendTemplate,
} from '../../services/templatesService';
import './NotificationTemplateManager.css';

function mapTemplate(t) {
  return {
    id: t.id,
    name: t.name ?? '—',
    channel: t.channel ?? '—',
    status: t.status ?? 'draft',
    lastModified: t.updated_at ?? t.created_at ?? '—',
  };
}

const NEW_TEMPLATE = { name: '', templateKey: '', channel: 'sms', subject: '', body: '' };

export default function NotificationTemplateManager() {
  const { notification, notify, closeNotification } = useNotification();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null); // { id, name, subject, body } or null for "create" mode
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(NEW_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listTemplates();
      setTemplates(result.items.map(mapTemplate));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load templates.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const selectTemplate = async (t) => {
    setSelectedId(t.id);
    setCreating(false);
    try {
      const full = await getTemplate(t.id);
      setEditing({
        id: full.id,
        name: full.name ?? t.name,
        subject: full.subject ?? '',
        body: full.body ?? '',
        variables: full.variables ?? [],
      });
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load template.'));
    }
  };

  const startCreate = () => {
    setSelectedId(null);
    setCreating(true);
    setDraft(NEW_TEMPLATE);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await updateTemplate(editing.id, {
        name: editing.name,
        subject: editing.subject,
        body: editing.body,
        variables: editing.variables,
      });
      notify.success('Template saved.');
      fetchTemplates();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save template.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!draft.name.trim() || !draft.templateKey.trim() || !draft.body.trim()) {
      notify.warning('Name, template key, and body are required.');
      return;
    }
    try {
      setSaving(true);
      await createTemplate({
        name: draft.name,
        templateKey: draft.templateKey,
        channel: draft.channel,
        subject: draft.subject || undefined,
        body: draft.body,
        variables: [...draft.body.matchAll(/{{(.*?)}}/g)].map((m) => m[1].trim()),
      });
      notify.success('Template created as draft.');
      setCreating(false);
      fetchTemplates();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to create template.'));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await activateTemplate(editing.id);
      notify.success('Template activated.');
      fetchTemplates();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to activate template.'));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await archiveTemplate(editing.id);
      notify.success('Template archived.');
      setEditing(null);
      setSelectedId(null);
      fetchTemplates();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to archive template.'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!editing || !testTo.trim()) { notify.warning('Enter a phone/email/device token to test-send to.'); return; }
    try {
      setTesting(true);
      const sampleVars = Object.fromEntries((editing.variables ?? []).map((v) => [v, `[${v}]`]));
      await testSendTemplate(editing.id, testTo.trim(), sampleVars);
      notify.success('Test message sent.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Test send failed.'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <PageWrapper title="Notification Template Manager" subtitle="Manage communication templates across channels">
      <div className="template-manager">
        <div className="template-header">
          <button className="create-btn" onClick={startCreate}>+ Create Template</button>
        </div>

        <div className="templates-grid">
          <div className="templates-list">
            <Card>
              <h3 className="section-title">Templates ({templates.length})</h3>
              {loading ? <Loader size="sm" text="Loading templates..." /> : (
                <div className="template-items">
                  {templates.map(template => (
                    <div key={template.id} className={`template-item ${selectedId === template.id ? 'selected' : ''}`} onClick={() => selectTemplate(template)}>
                      <div className="template-header-info">
                        <span className="template-id">T{String(template.id).padStart(3, '0')}</span>
                        <span className={`template-status status-${template.status}`}>{template.status}</span>
                      </div>
                      <div className="template-name">{template.name}</div>
                      <div className="template-meta">{template.channel}</div>
                    </div>
                  ))}
                  {!templates.length && <p className="template-empty">No templates yet.</p>}
                </div>
              )}
            </Card>
          </div>

          <div className="template-editor">
            {creating && (
              <Card>
                <h3 className="section-title">Create Template</h3>
                <div className="editor-form">
                  <div className="form-group">
                    <label>Template Name</label>
                    <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Template Key</label>
                    <input type="text" value={draft.templateKey} onChange={(e) => setDraft({ ...draft, templateKey: e.target.value })} placeholder="e.g. loan_approved_sms" />
                  </div>
                  <div className="form-group">
                    <label>Channel</label>
                    <select value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value })}>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="push">Push</option>
                    </select>
                  </div>
                  {draft.channel === 'email' && (
                    <div className="form-group">
                      <label>Subject</label>
                      <input type="text" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Message Body</label>
                    <textarea rows="6" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Template content with variables like {{customer_name}}, {{loan_amount}}" />
                  </div>
                  <div className="editor-actions">
                    <button className="save-template-btn" onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Create Template'}</button>
                  </div>
                </div>
              </Card>
            )}

            {!creating && editing ? (
              <Card>
                <h3 className="section-title">Edit Template: {editing.name}</h3>
                <div className="editor-form">
                  <div className="form-group">
                    <label>Template Name</label>
                    <input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Subject</label>
                    <input type="text" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} placeholder="Email subject line" />
                  </div>
                  <div className="form-group">
                    <label>Message Body</label>
                    <textarea rows="6" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
                  </div>
                  {editing.variables?.length > 0 && (
                    <div className="variables-list">
                      <span>Available Variables:</span>
                      {editing.variables.map((v) => <span key={v} className="variable">{`{{${v}}}`}</span>)}
                    </div>
                  )}
                  <div className="form-group">
                    <label>Test-send to (phone/email/device token)</label>
                    <input type="text" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="9876543210" />
                  </div>
                  <div className="editor-actions">
                    <button className="preview-btn" onClick={handleTestSend} disabled={testing}>{testing ? 'Sending…' : 'Test Send'}</button>
                    <button className="preview-btn" onClick={handleActivate} disabled={saving}>Activate</button>
                    <button className="preview-btn" onClick={handleArchive} disabled={saving}>Archive</button>
                    <button className="save-template-btn" onClick={handleSaveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Template'}</button>
                  </div>
                </div>
              </Card>
            ) : !creating && (
              <Card>
                <div className="no-selection">Select a template to edit</div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
