import { useState, useEffect, useCallback, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listEmiTypes,
  listTenureSlabs,
  createTenureSlab,
  exportTenureSlabsCsv,
  importTenureSlabsCsv,
} from '../../services/pricingService';
import './TenureInterestSlabs.css';

function mapSlab(s) {
  return {
    id: s.id,
    tenure: s.tenure_months ?? '—',
    interest: s.base_interest_rate ?? '',
    fee: s.processing_fee_value ?? '',
    cap: s.processing_fee_cap ?? '',
    tier: s.tier_overrides ? JSON.stringify(s.tier_overrides) : '',
  };
}

export default function TenureInterestSlabs() {
  const { notification, notify, closeNotification } = useNotification();
  const fileInputRef = useRef(null);

  const [emiTypes, setEmiTypes] = useState([]);
  const [emiTypeId, setEmiTypeId] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [rows, setRows] = useState([]);
  const [loadingSlabs, setLoadingSlabs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // New-row draft for adding a tenure not yet covered
  const [draft, setDraft] = useState({ tenure: '', interest: '', fee: '', cap: '' });

  useEffect(() => {
    (async () => {
      try {
        setLoadingTypes(true);
        const result = await listEmiTypes();
        setEmiTypes(result.items);
        if (result.items.length) setEmiTypeId(result.items[0].id);
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load EMI types.'));
      } finally {
        setLoadingTypes(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const fetchSlabs = useCallback(async () => {
    if (!emiTypeId) { setRows([]); return; }
    try {
      setLoadingSlabs(true);
      const result = await listTenureSlabs(emiTypeId);
      setRows(result.items.map(mapSlab));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load tenure slabs.'));
    } finally {
      setLoadingSlabs(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emiTypeId]);

  useEffect(() => { fetchSlabs(); }, [fetchSlabs]);

  const handleAddSlab = async () => {
    if (!draft.tenure || !draft.interest) {
      notify.warning('Tenure and interest rate are required.');
      return;
    }
    try {
      setSaving(true);
      await createTenureSlab({
        emiTypeId,
        tenureMonths: Number(draft.tenure),
        baseInterestRate: Number(draft.interest),
        processingFeeType: 'percentage',
        processingFeeValue: draft.fee ? Number(draft.fee) : undefined,
        processingFeeCap: draft.cap ? Number(draft.cap) : undefined,
      });
      notify.success('Tenure slab added.');
      setDraft({ tenure: '', interest: '', fee: '', cap: '' });
      fetchSlabs();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to add slab.'));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportTenureSlabsCsv();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tenure-slabs.csv';
      a.click();
      notify.success('Export started — check your downloads.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setImporting(true);
      await importTenureSlabsCsv(file);
      notify.success('Import complete.');
      fetchSlabs();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Import failed.'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageWrapper
      title="Tenure & Interest Slabs"
      subtitle="Screen 30 — Slab matrix, processing fees, tier overrides, import/export"
      actions={
        <>
          <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={handleImportFile} />
          <Button variant="secondary" onClick={handleImportClick} loading={importing}>Import CSV</Button>
          <Button variant="secondary" onClick={handleExport} loading={exporting}>Export CSV</Button>
        </>
      }
    >
      <Card title="EMI Type">
        {loadingTypes ? <Loader size="sm" text="Loading EMI types..." /> : (
          <select value={emiTypeId} onChange={(e) => setEmiTypeId(e.target.value)} className="slab-emi-select">
            {emiTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </Card>

      <Card title="Slab Matrix">
        {loadingSlabs ? <Loader text="Loading slabs..." /> : (
          <div className="slab-wrap">
            <table className="slab">
              <thead>
                <tr>
                  <th>Tenure (months)</th>
                  <th>Interest (% p.a.)</th>
                  <th>Processing fee (%)</th>
                  <th>Fee cap</th>
                  <th>Tier override</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.tenure}</td>
                    <td>{r.interest}</td>
                    <td>{r.fee}</td>
                    <td>{r.cap}</td>
                    <td>{r.tier || '—'}</td>
                  </tr>
                ))}
                <tr className="slab-draft-row">
                  <td><input value={draft.tenure} onChange={(e) => setDraft({ ...draft, tenure: e.target.value })} placeholder="e.g. 12" /></td>
                  <td><input value={draft.interest} onChange={(e) => setDraft({ ...draft, interest: e.target.value })} placeholder="e.g. 12.5" /></td>
                  <td><input value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} placeholder="e.g. 1.5" /></td>
                  <td><input value={draft.cap} onChange={(e) => setDraft({ ...draft, cap: e.target.value })} placeholder="e.g. 1500" /></td>
                  <td><Button variant="teal" size="sm" onClick={handleAddSlab} loading={saving}>Add row</Button></td>
                </tr>
              </tbody>
            </table>
            {!rows.length && <p className="slab-empty">No slabs configured for this EMI type yet — add one below.</p>}
          </div>
        )}
      </Card>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
