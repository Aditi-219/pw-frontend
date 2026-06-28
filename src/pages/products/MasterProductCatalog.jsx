import { useState, useEffect, useCallback, useRef } from 'react';
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
  listProducts,
  flagProduct,
  delistProduct,
  bulkToggleFinancingEligibility,
  listCategories,
  detectDuplicateSkus,
  importProductsCsv,
} from '../../services/productsService';
import './MasterProductCatalog.css';

// GET /admin/products response schema isn't documented. Mapped
// defensively from plausible field names.
function mapProduct(p) {
  return {
    id: p.id ?? p.sku,
    product: p.name ?? p.product ?? '—',
    merchant: p.merchant?.name ?? p.merchant_name ?? '—',
    category: p.category?.name ?? p.category_name ?? '—',
    categoryId: p.category_id ?? p.category?.id,
    price: p.price ?? '—',
    eligible: (p.financing_eligibility ?? p.eligible) ? 'Yes' : 'No',
    status: p.status ?? (p.is_flagged ? 'Flagged' : 'Live'),
  };
}

export default function MasterProductCatalog() {
  const { notification, notify, closeNotification } = useNotification();

  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [bulkModal, setBulkModal] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkEligible, setBulkEligible] = useState(true);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [detectingSkus, setDetectingSkus] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef(null);

  const handleDuplicateSkus = async () => {
    try {
      setDetectingSkus(true);
      const result = await detectDuplicateSkus();
      if (result.items.length === 0) notify.success('No duplicate SKUs found.');
      else notify.warning(`Found ${result.items.length} duplicate SKU(s) — check the list.`);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Duplicate SKU detection failed.'));
    } finally {
      setDetectingSkus(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const result = await listCategories();
        setCategories(result.items);
      } catch {
        // non-critical for the filter dropdown
      }
    })();
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listProducts({ categoryId: categoryFilter || undefined, search: q, page });
      setProducts(result.items.map(mapProduct));
      setTotalPages(result.totalPages);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load products.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, page]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchProducts(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const cols = [
    { key: 'id', label: 'SKU' },
    { key: 'product', label: 'Product' },
    { key: 'merchant', label: 'Merchant' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price' },
    { key: 'eligible', label: 'Financing', render: (v) => <Badge variant={v === 'Yes' ? 'success' : 'danger'}>{v}</Badge> },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={v === 'Live' ? 'info' : 'warning'}>{v}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="prod-actions">
          <Button variant="secondary" size="sm" onClick={() => { setReason(''); setModal({ type: 'flag', row }); }}>Flag</Button>
          <Button variant="danger" size="sm" onClick={() => { setReason(''); setModal({ type: 'delist', row }); }}>Force Delist</Button>
        </div>
      ),
    },
  ];

  const closeModal = () => setModal(null);

  const confirmModal = async () => {
    if (modal?.type === 'delist' && !reason.trim()) {
      notify.warning('Reason required.');
      return;
    }
    try {
      setActionLoading(true);
      if (modal.type === 'flag') {
        await flagProduct(modal.row.id);
        notify.success('Product flagged for review.');
      } else {
        await delistProduct(modal.row.id, reason);
        notify.success('Product delisted. Audit logged.');
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Action failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkToggle = async () => {
    if (!bulkCategoryId) { notify.warning('Select a category.'); return; }
    try {
      setBulkSaving(true);
      await bulkToggleFinancingEligibility(bulkCategoryId, bulkEligible);
      notify.success('Financing eligibility updated for the category.');
      setBulkModal(false);
      fetchProducts();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Bulk toggle failed.'));
    } finally {
      setBulkSaving(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      await importProductsCsv(file);
      notify.success('Products imported successfully.');
      fetchProducts();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to import products.'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <PageWrapper
      title="Master Product Catalog"
      subtitle="Screen 22 — Cross-merchant product oversight, flag, force-delist, eligibility toggles"
      actions={
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImport} accept=".csv" />
          <Button variant="teal" onClick={() => fileInputRef.current?.click()} loading={importing}>Bulk Import</Button>
          <Button variant="secondary" onClick={() => setBulkModal(true)}>Bulk eligibility toggle</Button>
        </div>
      }
    >
      <Card>
        <div className="prod-toolbar">
          <SearchBar placeholder="Search SKU / product..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Button variant="secondary" onClick={handleDuplicateSkus} loading={detectingSkus}>Duplicate SKU detection</Button>
        </div>
        {loading ? <Loader text="Loading products..." /> : (
          <>
            <Table columns={cols} data={products} emptyMessage="No products" />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
          </>
        )}
      </Card>

      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title={modal?.type === 'delist' ? 'Force Delist Product' : 'Flag Product'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={actionLoading}>Cancel</Button>
            <Button variant={modal?.type === 'delist' ? 'danger' : 'teal'} onClick={confirmModal} loading={actionLoading}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="prod-hint">{modal?.row ? `${modal.row.id} — ${modal.row.product}` : ''}</p>
        {modal?.type === 'delist' && <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />}
        {modal?.type === 'flag' && <p className="prod-hint">Flagging doesn't require a reason on this endpoint.</p>}
      </Modal>

      <Modal
        isOpen={bulkModal}
        onClose={() => setBulkModal(false)}
        title="Bulk Financing Eligibility Toggle"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkModal(false)} disabled={bulkSaving}>Cancel</Button>
            <Button variant="teal" onClick={handleBulkToggle} loading={bulkSaving}>Apply</Button>
          </>
        }
      >
        <p className="prod-hint">This applies to every product in the selected category (backend scopes this action by category, not individual SKU selection).</p>
        <div className="prod-bulk-field">
          <label>Category</label>
          <select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value)}>
            <option value="">Select category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <label className="prod-bulk-check">
          <input type="checkbox" checked={bulkEligible} onChange={(e) => setBulkEligible(e.target.checked)} />
          Eligible for financing
        </label>
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
