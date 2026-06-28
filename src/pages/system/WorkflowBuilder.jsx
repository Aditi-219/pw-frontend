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
  listWorkflows,
  getWorkflowTemplates,
  createWorkflow,
  publishWorkflow,
  archiveWorkflow,
} from '../../services/systemService';
import './WorkflowBuilder.css';

// GET /admin/workflows response schema isn't documented. Mapped
// defensively from plausible field names. The `canvas` field (nodes +
// edges) is real per the spec but a full drag-drop builder is out of
// scope here — we read/write canvas as JSON and show step count instead.
function mapWorkflow(w) {
  const nodeCount = w.canvas?.nodes?.length ?? w.steps ?? 0;
  return {
    id: w.id,
    name: w.name ?? '—',
    status: w.status ?? (w.published_at ? 'active' : 'draft'),
    steps: nodeCount,
    type: w.workflow_type ?? '—',
    lastRun: w.updated_at ?? w.lastRun ?? '—',
  };
}

export default function WorkflowBuilder() {
  const { notification, notify, closeNotification } = useNotification();

  const [workflows, setWorkflows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [createModal, setCreateModal] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({ name: '', workflowType: 'merchant_onboarding', templateId: '' });
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [workflowsResult, templatesResult] = await Promise.allSettled([
        listWorkflows(),
        getWorkflowTemplates(),
      ]);
      if (workflowsResult.status === 'fulfilled') setWorkflows(workflowsResult.value.items.map(mapWorkflow));
      else notify.error(getErrorMessage(workflowsResult.reason, 'Failed to load workflows.'));
      if (templatesResult.status === 'fulfilled') setTemplates(templatesResult.value.items);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleCreate = async () => {
    if (!newWorkflow.name.trim()) { notify.warning('Name is required.'); return; }
    try {
      setCreating(true);
      const template = templates.find((t) => String(t.id) === newWorkflow.templateId);
      await createWorkflow({
        name: newWorkflow.name,
        workflowType: newWorkflow.workflowType,
        canvas: template?.canvas ?? { nodes: [{ id: 'start', type: 'start' }], edges: [] },
      });
      notify.success('Workflow created as draft.');
      setCreateModal(false);
      setNewWorkflow({ name: '', workflowType: 'merchant_onboarding', templateId: '' });
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to create workflow.'));
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (workflow) => {
    try {
      setBusyId(workflow.id);
      await publishWorkflow(workflow.id);
      notify.success(`${workflow.name} published.`);
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to publish workflow.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (workflow) => {
    try {
      setBusyId(workflow.id);
      await archiveWorkflow(workflow.id);
      notify.success(`${workflow.name} archived.`);
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to archive workflow.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageWrapper title="Workflow Builder" subtitle="Design and manage automated workflows">
      <div className="workflow-builder">
        <div className="builder-header">
          <button className="create-workflow-btn" onClick={() => setCreateModal(true)}>+ Create Workflow</button>
        </div>

        {loading ? <Loader text="Loading workflows..." /> : (
          <div className="workflows-list">
            {workflows.map(workflow => (
              <Card key={workflow.id}>
                <div className="workflow-card">
                  <div className="workflow-header">
                    <div className="workflow-title">
                      <span className="workflow-id">WF-{String(workflow.id).padStart(3, '0')}</span>
                      <span className="workflow-name">{workflow.name}</span>
                      <span className={`workflow-status status-${workflow.status}`}>{workflow.status}</span>
                    </div>
                    <div className="workflow-actions">
                      {workflow.status !== 'active' && (
                        <button className="run-workflow" onClick={() => handlePublish(workflow)} disabled={busyId === workflow.id}>Publish</button>
                      )}
                      <button className="edit-workflow" onClick={() => handleArchive(workflow)} disabled={busyId === workflow.id}>Archive</button>
                    </div>
                  </div>
                  <div className="workflow-details">
                    <div className="detail"><span className="label">Steps:</span><span className="value">{workflow.steps}</span></div>
                    <div className="detail"><span className="label">Type:</span><span className="value">{workflow.type}</span></div>
                    <div className="detail"><span className="label">Last Updated:</span><span className="value">{workflow.lastRun}</span></div>
                  </div>
                </div>
              </Card>
            ))}
            {!workflows.length && <p className="wfb-empty">No workflows yet.</p>}
          </div>
        )}
      </div>

      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Workflow"
        footer={
          <>
            <button className="edit-workflow" onClick={() => setCreateModal(false)} disabled={creating}>Cancel</button>
            <button className="create-workflow-btn" onClick={handleCreate} disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
          </>
        }
      >
        <Input label="Workflow name" value={newWorkflow.name} onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })} placeholder="e.g. Loan Approval Flow" />
        <div className="wfb-field">
          <label>Workflow type</label>
          <select value={newWorkflow.workflowType} onChange={(e) => setNewWorkflow({ ...newWorkflow, workflowType: e.target.value })}>
            <option value="merchant_onboarding">Merchant onboarding</option>
            <option value="offer_approval">Offer approval</option>
            <option value="override_approval">Override approval</option>
          </select>
        </div>
        {templates.length > 0 && (
          <div className="wfb-field">
            <label>Start from template (optional)</label>
            <select value={newWorkflow.templateId} onChange={(e) => setNewWorkflow({ ...newWorkflow, templateId: e.target.value })}>
              <option value="">Blank workflow</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <p className="wfb-note">
          A full drag-and-drop canvas isn't built here — workflows are created with a minimal
          start-node canvas and can be edited via the API's canvas JSON directly.
        </p>
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
