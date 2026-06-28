import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/searchbar';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listStores, exportStoresCsv } from '../../services/storesService';
import './StoreNetworkMap.css';

// GET /admin/stores response schema isn't documented. Mapped defensively
// from plausible field names.
function mapStore(s) {
  return {
    id: s.id,
    store: s.name ?? s.store ?? '—',
    merchant: s.merchant?.name ?? s.merchant_name ?? '—',
    city: s.city ?? s.region ?? '—',
    status: s.status ?? (s.is_active ? 'Active' : 'Inactive'),
    range: s.loan_range ?? s.range ?? '—',
    last: s.last_active ?? s.last ?? '—',
  };
}

export default function StoreNetworkMap() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [q, setQ] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listStores({});
      setStores(result.items.map(mapStore));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load stores.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const data = stores.filter((s) => !q || s.store.toLowerCase().includes(q.toLowerCase()) || s.city.toLowerCase().includes(q.toLowerCase()));

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportStoresCsv();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'stores.csv';
      a.click();
      notify.success('Export started — check your downloads.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageWrapper
      title="Store Network Map"
      subtitle="Screen 20 — Cluster map + filters + drill-down (placeholder map panel)"
      actions={<Button variant="secondary" onClick={handleExport} loading={exporting}>Export CSV</Button>}
    >
      <div className="storemap-grid">
        <Card title="Map">
          <div className="storemap-map">Map container (integrate Mapbox/Google later)</div>
        </Card>
        <Card title="Filters & Stores">
          <SearchBar placeholder="Search stores / city..." value={q} onChange={(e) => setQ(e.target.value)} />
          {loading ? <Loader text="Loading stores..." /> : (
            <div className="storemap-list">
              {data.map((s) => (
                <div key={s.id} className="storemap-item" onClick={() => navigate(`/stores/${s.id}`)} role="button" tabIndex={0}>
                  <div className="storemap-item__left">
                    <strong>{s.store}</strong>
                    <span>{s.merchant} • {s.city} • last {s.last}</span>
                  </div>
                  <Badge variant={s.status === 'Active' ? 'success' : 'warning'}>{s.status}</Badge>
                </div>
              ))}
              {!data.length && <p className="storemap-empty">No stores found.</p>}
            </div>
          )}
        </Card>
      </div>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
