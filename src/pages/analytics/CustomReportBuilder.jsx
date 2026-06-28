import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  getCustomReportSchema,
  runCustomReport,
  saveCustomReport,
  listCustomReports,
  exportCustomReport,
} from '../../services/complianceService';
import './CustomReportBuilder.css';

const MODULES = ['loans', 'merchants', 'payments', 'stores', 'lenders'];

// GET /admin/reports/custom/schema response schema isn't documented.
// Mapped defensively — expects { [module]: [field, field, ...] } or a
// flat array; falls back to a small built-in field list per module if
// the schema endpoint doesn't return what we expect, so the picker is
// never empty.
const FALLBACK_FIELDS = {
  loans: ['loan_amount', 'status', 'disbursed_at', 'tenure_months'],
  merchants: ['name', 'region', 'category', 'status'],
  payments: ['amount', 'status', 'paid_at'],
  stores: ['name', 'city', 'status'],
  lenders: ['name', 'status', 'approval_rate'],
};

export default function CustomReportBuilder() {
  const { notification, notify, closeNotification } = useNotification();

  const [module, setModule] = useState('loans');
  const [fieldsByModule, setFieldsByModule] = useState(FALLBACK_FIELDS);
  const [reportName, setReportName] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [chartType, setChartType] = useState('table');
  const [schedule, setSchedule] = useState('none');

  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewRows, setPreviewRows] = useState(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [schemaResult, reportsResult] = await Promise.allSettled([
        getCustomReportSchema(),
        listCustomReports(),
      ]);
      if (schemaResult.status === 'fulfilled' && schemaResult.value && typeof schemaResult.value === 'object' && !Array.isArray(schemaResult.value)) {
        const schema = schemaResult.value;
        const normalized = {};
        MODULES.forEach((m) => {
          normalized[m] = Array.isArray(schema[m]) ? schema[m] : FALLBACK_FIELDS[m];
        });
        setFieldsByModule(normalized);
      }
      if (reportsResult.status === 'fulfilled') {
        setSavedReports(reportsResult.value.items.map((r) => ({
          id: r.id,
          name: r.name ?? '—',
        })));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const availableFields = fieldsByModule[module] ?? [];

  const toggleField = (field) => {
    setSelectedFields((s) => (s.includes(field) ? s.filter((f) => f !== field) : [...s, field]));
  };

  const handleRun = async () => {
    if (!selectedFields.length) return;
    try {
      setRunning(true);
      const result = await runCustomReport({
        name: reportName || `${module} report`,
        module,
        fields: selectedFields,
        filters: [],
        chart_type: chartType,
        limit: 50,
      });
      const rows = result?.data ?? result?.rows ?? result;
      // Guard against values JSON.stringify can't safely render later
      // (circular refs, BigInt, etc.) so a render-time throw can't blank
      // the page — store a safe placeholder instead.
      try {
        JSON.stringify(rows);
        setPreviewRows(rows);
      } catch {
        setPreviewRows({ note: 'Report ran, but the response could not be displayed as JSON.' });
      }
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to run report.'));
    } finally {
      setRunning(false);
    }
  };

  const handleSave = async () => {
    if (!reportName.trim() || !selectedFields.length) return;
    try {
      setSaving(true);
      await saveCustomReport({
        name: reportName,
        definition: { module, fields: selectedFields },
        chartType,
        isShared: false,
      });
      notify.success(`Report "${reportName}" saved with ${selectedFields.length} fields.`);
      fetchAll();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save report.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRunSaved = async (report) => {
    try {
      setBusyId(report.id);
      const blob = await exportCustomReport(report.id, 'csv');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${report.name}.csv`;
      a.click();
      notify.success('Export started.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageWrapper title="Custom Report Builder" subtitle="Create and schedule custom reports">
      <div className="report-builder">
        <div className="builder-grid">
          <div className="builder-form">
            <Card>
              <h3 className="section-title">Report Configuration</h3>
              <div className="form-group">
                <label>Report Name</label>
                <input type="text" value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Enter report name" />
              </div>
              <div className="form-group">
                <label>Module</label>
                <select value={module} onChange={(e) => { setModule(e.target.value); setSelectedFields([]); }}>
                  {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Chart Type</label>
                <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                  <option value="table">Table</option>
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="pie">Pie</option>
                </select>
              </div>
              <div className="form-group">
                <label>Schedule</label>
                <select value={schedule} onChange={(e) => setSchedule(e.target.value)}>
                  <option value="none">No schedule</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </Card>
          </div>

          <div className="metrics-selector">
            <Card>
              <h3 className="section-title">Select Fields ({module})</h3>
              {loading ? <Loader size="sm" text="Loading schema..." /> : (
                <div className="metrics-grid">
                  {availableFields.map(field => (
                    <div key={field} className={`metric-chip ${selectedFields.includes(field) ? 'selected' : ''}`} onClick={() => toggleField(field)}>
                      {field}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="preview-section">
          <Card>
            <div className="preview-header">
              <h3 className="section-title">Report Preview</h3>
              <div className="preview-actions">
                <button className="save-btn" onClick={handleRun} disabled={!selectedFields.length || running}>
                  {running ? 'Running…' : 'Run Preview'}
                </button>
                <button className="save-btn" onClick={handleSave} disabled={!reportName || !selectedFields.length || saving}>
                  {saving ? 'Saving…' : 'Save Report'}
                </button>
              </div>
            </div>
            {selectedFields.length > 0 ? (
              <div className="preview-content">
                <div className="preview-metrics">
                  {selectedFields.map(field => (
                    <div key={field} className="preview-metric">{field}</div>
                  ))}
                </div>
                {previewRows && (
                  <pre className="report-preview-json">{JSON.stringify(previewRows, null, 2)}</pre>
                )}
                <div className="saved-reports">
                  <h4>Saved Reports</h4>
                  <div className="saved-list">
                    {savedReports.map((r) => (
                      <div key={r.id} className="saved-item">
                        <div className="saved-name">{r.name}</div>
                        <div className="saved-actions">
                          <button onClick={() => handleRunSaved(r)} disabled={busyId === r.id}>
                            {busyId === r.id ? '…' : 'Export'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {!savedReports.length && <p className="crb-empty">No saved reports yet.</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-preview">Select fields to build your report</div>
            )}
          </Card>
        </div>
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
