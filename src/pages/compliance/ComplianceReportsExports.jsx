import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listCustomReports,
  runCustomReport,
  saveCustomReport,
  exportCustomReport,
  scheduleCustomReport,
} from '../../services/complianceService';
import './ComplianceReportsExports.css';

const MODULES = ['loans', 'merchants', 'payments', 'stores', 'lenders'];

// GET /admin/reports/custom response schema isn't documented. Mapped
// defensively from plausible field names.
function mapReport(r) {
  return {
    id: r.id,
    name: r.name ?? '—',
    type: r.definition?.module ?? r.module ?? 'custom',
    generated: r.updated_at ?? r.created_at ?? '—',
    format: (r.chart_type ?? 'table').toUpperCase(),
    status: r.status ?? 'ready',
  };
}

export default function ComplianceReportsExports() {
  const { notification, notify, closeNotification } = useNotification();

  const [reportType, setReportType] = useState('all');
  const [module, setModule] = useState('loans');
  const [format, setFormat] = useState('csv');

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionId, setActionId] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listCustomReports();
      setReports(result.items.map(mapReport));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load reports.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const filteredReports = reports.filter((r) => reportType === 'all' || r.type === reportType);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const result = await runCustomReport({
        name: `${module} report — ${new Date().toLocaleDateString()}`,
        module,
        fields: [],
        filters: [],
        chart_type: 'table',
        limit: 100,
      });
      await saveCustomReport({
        name: `${module} report — ${new Date().toLocaleDateString()}`,
        definition: { module, fields: [] },
        chartType: 'table',
      });
      notify.success('Report generated and saved.');
      fetchReports();
      void result;
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to generate report.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      setActionId(report.id);
      const blob = await exportCustomReport(report.id, format);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${report.name}.${format}`;
      a.click();
      notify.success('Download started.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Download failed.'));
    } finally {
      setActionId(null);
    }
  };

  const handleSchedule = async (report) => {
    try {
      setActionId(report.id);
      await scheduleCustomReport(report.id, {
        frequency: 'monthly',
        recipients: ['admin@finz.com'],
        format: 'csv',
        time: '09:00',
      });
      notify.success('Report scheduled monthly.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to schedule report.'));
    } finally {
      setActionId(null);
    }
  };

  return (
    <PageWrapper title="Compliance Reports & Exports" subtitle="Generate and download compliance reports">
      <div className="compliance-reports">
        <Card>
          <div className="report-generator">
            <h3 className="section-title">Generate New Report</h3>
            <div className="generator-form">
              <select className="report-select" value={module} onChange={(e) => setModule(e.target.value)}>
                {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className="format-select" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
                <option value="pdf">PDF</option>
                <option value="json">JSON</option>
              </select>
              <button className="generate-btn" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generating…' : 'Generate Report'}
              </button>
            </div>
            <p className="compliance-note">
              Custom date-range filtering and field selection are supported by the backend
              (POST /admin/reports/custom) but simplified here to a one-click run per module.
            </p>
          </div>

          <div className="reports-list">
            <div className="list-header">
              <h3 className="section-title">Generated Reports</h3>
              <div className="report-filters">
                <button className={`filter-btn ${reportType === 'all' ? 'active' : ''}`} onClick={() => setReportType('all')}>All</button>
                {MODULES.map((m) => (
                  <button key={m} className={`filter-btn ${reportType === m ? 'active' : ''}`} onClick={() => setReportType(m)}>{m}</button>
                ))}
              </div>
            </div>

            {loading ? <Loader text="Loading reports..." /> : (
              <div className="reports-table">
                {filteredReports.map(report => (
                  <div key={report.id} className="report-row">
                    <div className="report-info">
                      <div className="report-name">{report.name}</div>
                      <div className="report-meta">{report.generated} • {report.format}</div>
                    </div>
                    <div className="report-status">
                      <span className={`status-badge status-${report.status}`}>{report.status}</span>
                    </div>
                    <div className="report-actions">
                      <button className="download-btn" onClick={() => handleDownload(report)} disabled={actionId === report.id}>
                        {actionId === report.id ? '…' : 'Download'}
                      </button>
                      <button className="share-btn" onClick={() => handleSchedule(report)} disabled={actionId === report.id}>
                        Schedule
                      </button>
                    </div>
                  </div>
                ))}
                {!filteredReports.length && <p className="compliance-empty">No reports generated yet.</p>}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
