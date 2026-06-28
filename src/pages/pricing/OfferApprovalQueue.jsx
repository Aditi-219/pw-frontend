import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listOffers, approveOffer, rejectOffer } from '../../services/pricingService';
import './OfferApprovalQueue.css';

// GET /admin/offers response schema isn't documented. Mapped defensively
// from plausible field names.
function mapOffer(o) {
  return {
    id: o.id,
    merchant: o.merchant?.name ?? o.merchant_name ?? (o.is_platform_offer ? 'Platform-wide' : '—'),
    scope: o.scope_type ?? o.scope ?? '—',
    budget: o.budget_cap != null ? `₹${o.budget_cap}` : '—',
    status: o.status ?? 'Pending',
    roi: o.roi ?? '—',
    title: o.title ?? '—',
  };
}

export default function OfferApprovalQueue() {
  const { notification, notify, closeNotification } = useNotification();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listOffers({ status: 'pending' });
      setOffers(result.items.map(mapOffer));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load offers.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const closeModal = () => { setModal(null); setComment(''); };

  const confirm = async () => {
    if (modal.type === 'reject' && !comment.trim()) {
      notify.warning('Reason required.');
      return;
    }
    try {
      setActionLoading(true);
      if (modal.type === 'approve') {
        await approveOffer(modal.row.id);
        notify.success('Offer approved.');
      } else {
        await rejectOffer(modal.row.id, comment);
        notify.success('Offer rejected.');
      }
      closeModal();
      fetchOffers();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Action failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const cols = [
    { key: 'id', label: 'Offer' },
    { key: 'title', label: 'Title' },
    { key: 'merchant', label: 'Merchant' },
    { key: 'scope', label: 'Scope' },
    { key: 'budget', label: 'Budget' },
    { key: 'status', label: 'Status', render: (v) => <Badge variant="warning">{v}</Badge> },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="oa-actions">
          <Button variant="danger" size="sm" onClick={() => setModal({ type: 'reject', row })}>Reject</Button>
          <Button variant="teal" size="sm" onClick={() => setModal({ type: 'approve', row })}>Approve</Button>
        </div>
      ),
    },
  ];

  return (
    <PageWrapper
      title="Offer Approval Queue"
      subtitle="Screen 32 — Review merchant-submitted offers, approve/reject, compliance checks"
    >
      <Card>
        {loading ? <Loader text="Loading offers..." /> : (
          <Table columns={cols} data={offers} emptyMessage="No pending offers" />
        )}
      </Card>

      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title={modal?.type === 'approve' ? 'Approve Offer' : 'Reject Offer'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={actionLoading}>Cancel</Button>
            <Button variant={modal?.type === 'approve' ? 'teal' : 'danger'} onClick={confirm} loading={actionLoading}>
              Confirm
            </Button>
          </>
        }
      >
        <p className="oa-hint">Compliance check: discount within RBI guidelines (server validated).</p>
        {modal?.type === 'reject' && (
          <Input label="Mandatory comment" value={comment} onChange={(e) => setComment(e.target.value)} />
        )}
        {modal?.type === 'approve' && (
          <p className="oa-hint">Approval doesn't require a comment on this endpoint.</p>
        )}
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
