import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getAuditTrail, getAuditAnomalies, exportAuditTrail, verifyAuditHashChain } from '../../services/complianceService';
import './AuditTrailExplorer.css';

function mapEntry(a, i) {
  return {
    id: a.id ?? `AUD-${i}`,
    user: String(a.user_name ?? a.user ?? a.admin_name ?? '—'),
    role: String(a.role ?? '—'),
    module: String(a.module ?? '—'),
    action: String(a.action ?? '—'),
    entity: String(a.entity ?? a.resource ?? '—'),
    ip: String(a.ip_address ?? a.ip ?? '—'),
    device: String(a.device ?? '—'),
    timestamp: a.created_at ?? a.timestamp ?? '—',
    status: String(a.status ?? 'success'),
  };
}

export default function AuditTrailExplorer() {
  const { notification, notify, closeNotification } = useNotification();

  const [logs, setLogs] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [filters, setFilters] = useState({ search:'', role:'', module:'', action:'', dateFrom:'', dateTo:'' });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const [auditResult, anomalyResult] = await Promise.allSettled([
        getAuditTrail({ ...filters }),
        getAuditAnomalies(),
      ]);
      if (auditResult.status === 'fulfilled') setLogs(auditResult.value.items.map(mapEntry));
      else notify.error(getErrorMessage(auditResult.reason, 'Failed to load audit logs.'));
      if (anomalyResult.status === 'fulfilled') setAnomalies(anomalyResult.value.items ?? []);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportAuditTrail();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'audit-trail.csv';
      a.click();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const result = await verifyAuditHashChain();
      notify.success(`Hash chain verified: ${result?.verified ? 'VALID' : 'INVALID'}`);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Hash verification failed.'));
    } finally {
      setVerifying(false);
    }
  };

  const statusVariant = { success:'success', warning:'warning', error:'danger' };
  const u = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <PageWrapper title="Audit Trail Explorer" subtitle="Screen 42 — Immutable log of every admin action"
      actions={
        <>
          <Button variant="secondary" onClick={handleVerify} loading={verifying}>Verify Hash Chain</Button>
          <Button variant="secondary" onClick={handleExport} loading={exporting}>Export</Button>
        </>
      }
    >
      {anomalies.length > 0 && (
        <Card title="Anomalies Detected">
          {anomalies.map((a, i) => (
            <div key={i} className="audit-anomaly"><Badge variant="danger">⚠</Badge> {String(a.description ?? a.message ?? JSON.stringify(a))}</div>
          ))}
        </Card>
      )}

      <Card>
        <div className="audit-filters">
          <input placeholder="Search user, action, entity..." value={filters.search} onChange={e => u('search', e.target.value)} />
          <input placeholder="Role..." value={filters.role} onChange={e => u('role', e.target.value)} />
          <input placeholder="Module..." value={filters.module} onChange={e => u('module', e.target.value)} />
          <input placeholder="Action..." value={filters.action} onChange={e => u('action', e.target.value)} />
          <input type="date" value={filters.dateFrom} onChange={e => u('dateFrom', e.target.value)} />
          <input type="date" value={filters.dateTo} onChange={e => u('dateTo', e.target.value)} />
        </div>

        {loading ? <Loader text="Loading audit logs..." /> : (
          <div className="audit-table">
            <div className="table-header">
              <div>Timestamp</div><div>User</div><div>Role</div><div>Module</div>
              <div>Action</div><div>Entity</div><div>IP</div><div>Status</div>
            </div>
            {logs.map(log => (
              <div key={log.id} className="table-row">
                <div className="timestamp">{log.timestamp}</div>
                <div>{log.user}</div>
                <div>{log.role}</div>
                <div>{log.module}</div>
                <div>{log.action}</div>
                <div>{log.entity}</div>
                <div className="ip">{log.ip}</div>
                <div><span className={`status-badge status-${log.status}`}>{log.status}</span></div>
              </div>
            ))}
            {!logs.length && <p className="audit-empty">No audit entries found.</p>}
          </div>
        )}
      </Card>
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
