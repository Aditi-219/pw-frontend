import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import NoBackendBanner from '../../components/common/NoBackendBanner';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getStore, deactivateStore, getStoreLinkedProducts, getStoreLoanApplications } from '../../services/storesService';
import './StoreDetailView.css';

const cols = [
  { key: 'app', label: 'Application' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status', render: (v) => <Badge variant={v === 'Stuck' ? 'danger' : 'info'}>{v}</Badge> },
  { key: 'age', label: 'Age' },
];

// GET /admin/stores/{id} response schema isn't documented. Mapped
// defensively from plausible field names.
function mapStore(s) {
  return {
    name: s.name ?? s.store ?? '—',
    address: s.address ?? ([s.city, s.region].filter(Boolean).join(', ') || '—'),
    status: s.status ?? (s.is_active ? 'Active' : 'Inactive'),
    manager: s.manager_name ?? s.manager ?? '—',
  };
}

export default function StoreDetailView() {
  const { id } = useParams();
  const { notification, notify, closeNotification } = useNotification();

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [reason, setReason] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  
  const [linkedProducts, setLinkedProducts] = useState([]);
  const [loanApplications, setLoanApplications] = useState([]);

  const fetchStore = useCallback(async () => {
    try {
      setLoading(true);
      const [data, products, loans] = await Promise.all([
        getStore(id),
        getStoreLinkedProducts(id).catch(() => ({ items: [] })),
        getStoreLoanApplications(id).catch(() => ({ items: [] }))
      ]);
      setStore(mapStore(data));
      setLinkedProducts(products.items || []);
      setLoanApplications(loans.items || []);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load store.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  const handleDeactivate = async () => {
    if (!reason.trim()) { notify.warning('Reason required.'); return; }
    try {
      setDeactivating(true);
      await deactivateStore(id, reason);
      notify.success('Store deactivated. Merchant notified. Audit logged.');
      setModal(false);
      setReason('');
      fetchStore();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to deactivate store.'));
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <PageWrapper title="Store Detail View" subtitle={`Screen 21 — Store deep dive (ID: ${id})`}>
        <Loader text="Loading store..." />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Store Detail View"
      subtitle={`Screen 21 — Store deep dive (ID: ${id})`}
      actions={<Button variant="danger" onClick={() => setModal(true)}>Force Deactivate</Button>}
    >
      <div className="storedet-grid">
        <Card title="Store Identity">
          <div className="storedet-kv"><span>Store</span><strong>{store?.name}</strong></div>
          <div className="storedet-kv"><span>Address</span><strong>{store?.address}</strong></div>
          <div className="storedet-kv"><span>Status</span><Badge variant={store?.status === 'Active' ? 'success' : 'warning'}>{store?.status}</Badge></div>
          <div className="storedet-kv"><span>Manager</span><strong>{store?.manager}</strong></div>
        </Card>
        <Card title="Linked Products (snapshot)">
          {linkedProducts.length === 0 ? (
            <div className="storedet-empty">No linked products found</div>
          ) : (
            <Table 
              columns={[
                { key: 'name', label: 'Product Name' },
                { key: 'sku', label: 'SKU' },
                { key: 'stock', label: 'Stock' }
              ]} 
              data={linkedProducts.map(p => ({
                id: p.id,
                name: p.name || 'Unknown',
                sku: p.sku || 'N/A',
                stock: p.stock ?? '0'
              }))} 
            />
          )}
        </Card>
      </div>

      <Card title="Loan Applications (last 30/90 days)">
        {loanApplications.length === 0 ? (
          <div className="storedet-empty">No loan applications found</div>
        ) : (
          <Table columns={cols} data={loanApplications.map(app => ({
            id: app.id,
            app: app.application_id || app.id || 'N/A',
            amount: app.amount ? `$${app.amount}` : '—',
            status: app.status || 'Pending',
            age: app.age || '—'
          }))} />
        )}
      </Card>

      <Modal
        isOpen={modal}
        onClose={() => setModal(false)}
        title="Force Deactivate Store"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)} disabled={deactivating}>Cancel</Button>
            <Button variant="danger" onClick={handleDeactivate} loading={deactivating}>Deactivate</Button>
          </>
        }
      >
        <Input label="Mandatory reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
