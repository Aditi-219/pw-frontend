import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/searchbar';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import Pagination from '../../components/common/Pagination';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listMerchants,
  bulkApproveMerchants,
  bulkRejectMerchants,
  exportMerchantsCsv,
} from '../../services/merchantsService';
import './MerchantDirectory.css';

const statusVariant = {
  Draft: 'default',
  Submitted: 'info',
  'Under Review': 'warning',
  Approved: 'success',
  Rejected: 'danger',
  'Re-KYC': 'warning',
  Suspended: 'danger',
};

const statusTabs = ['All', 'Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Re-KYC', 'Suspended'];

// GET /admin/merchants response schema isn't documented. Mapped
// defensively from plausible field names; the UI was built around these
// short display fields (id/name/region/category/status/stores/volume/npa).
function mapMerchant(m) {
  return {
    id: m.id,
    name: m.name ?? m.business_name ?? '—',
    region: m.region ?? m.city ?? '—',
    category: m.category ?? m.category_name ?? '—',
    status: m.status ?? '—',
    stores: m.stores_count ?? m.stores ?? 0,
    volume: m.disbursal_30d ?? m.volume ?? '—',
    npa: m.npa ?? '—',
  };
}

export default function MerchantDirectory() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState([]);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');

  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchMerchants = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listMerchants({ status, search: q, page });
      setMerchants(result.items.map(mapMerchant));
      setTotalPages(result.totalPages);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load merchants.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchMerchants(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => { fetchMerchants(); }, [fetchMerchants]);

  const columns = [
    {
      key: 'sel',
      label: '',
      width: '48px',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selected.includes(row.id)}
          onChange={() =>
            setSelected((s) => (s.includes(row.id) ? s.filter((x) => x !== row.id) : [...s, row.id]))
          }
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: 'id', label: 'Merchant ID' },
    { key: 'name', label: 'Merchant' },
    { key: 'region', label: 'Region' },
    { key: 'category', label: 'Category' },
    { key: 'stores', label: 'Stores' },
    { key: 'volume', label: 'Disbursal (30d)' },
    { key: 'npa', label: 'NPA' },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <Badge variant={statusVariant[v] || 'default'}>{v}</Badge>,
    },
  ];

  const openBulk = (type) => {
    if (!selected.length) return;
    setReason('');
    setModal({ type });
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      const blob = await exportMerchantsCsv();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'merchants.csv';
      a.click();
      notify.success('Export started — check your downloads.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  const confirmBulk = async () => {
    if (!reason.trim()) {
      notify.warning('Comment is required for audit.');
      return;
    }
    try {
      setActionLoading(true);
      if (modal.type === 'approve') {
        await bulkApproveMerchants(selected, reason);
        notify.success(`Approved ${selected.length} merchant(s). Audit logged.`);
      } else {
        await bulkRejectMerchants(selected, reason);
        notify.success(`Rejected ${selected.length} merchant(s). Audit logged.`);
      }
      setModal(null);
      setSelected([]);
      fetchMerchants();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Bulk action failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Merchant Directory"
      subtitle="Screen 14 — Workflow list, filters, bulk approve/reject, export"
      actions={
        <>
          <Button variant="secondary" onClick={exportCsv} loading={exporting}>Export</Button>
          <Button variant="secondary" onClick={() => openBulk('reject')} disabled={!selected.length}>Bulk Reject</Button>
          <Button variant="teal" onClick={() => openBulk('approve')} disabled={!selected.length}>Bulk Approve</Button>
        </>
      }
    >
      <Card>
        <div className="merchant-dir__toolbar">
          <SearchBar placeholder="Search merchant, ID, region..." value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="merchant-dir__tabs">
            {statusTabs.map((s) => (
              <button
                key={s}
                type="button"
                className={`merchant-dir__tab ${status === s ? 'merchant-dir__tab--active' : ''}`}
                onClick={() => { setStatus(s); setPage(1); }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <Loader text="Loading merchants..." />
        ) : (
          <>
            <Table
              columns={columns}
              data={merchants}
              onRowClick={(row) => navigate(`/merchants/profile/${row.id}`)}
              emptyMessage="No merchants found"
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
          </>
        )}
      </Card>

      <Modal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'approve' ? 'Bulk Approve Merchants' : 'Bulk Reject Merchants'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={actionLoading}>Cancel</Button>
            <Button
              variant={modal?.type === 'approve' ? 'teal' : 'danger'}
              onClick={confirmBulk}
              loading={actionLoading}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p className="merchant-dir__modal-text">
          Selected: <strong>{selected.length}</strong>
        </p>
        <Input label="Mandatory comment (audit)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." />
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
