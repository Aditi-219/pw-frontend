import { useState, useEffect, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listMerchants,
  getMerchant,
  reKycMerchant,
  suspendMerchant,
  bulkReKycMerchants,
  reactivateMerchant,
} from '../../services/merchantsService';
import './ReKYCSuspension.css';

const reasons = ['Fraud', 'NPA', 'Compliance', 'Voluntary', 'Other'];

export default function ReKYCSuspension() {
  const { notification, notify, closeNotification } = useNotification();

  const [merchants, setMerchants] = useState([]);
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [merchantId, setMerchantId] = useState('');
  const [merchant, setMerchant] = useState(null);
  const [merchantLoading, setMerchantLoading] = useState(false);

  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState(reasons[0]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [bulkRegion, setBulkRegion] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setMerchantsLoading(true);
        const result = await listMerchants({});
        setMerchants(result.items);
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load merchants.'));
      } finally {
        setMerchantsLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, []);

  const fetchMerchant = useCallback(async () => {
    if (!merchantId) { setMerchant(null); return; }
    try {
      setMerchantLoading(true);
      setMerchant(await getMerchant(merchantId));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load merchant.'));
    } finally {
      setMerchantLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId]);

  useEffect(() => { fetchMerchant(); }, [fetchMerchant]);

  const closeModal = () => { setModal(null); setComment(''); };

  const submit = async () => {
    if (!merchantId) { notify.warning('Select a merchant first.'); return; }
    if (!comment.trim()) { notify.warning('Comment required.'); return; }
    try {
      setSubmitting(true);
      if (modal === 'reactivate') {
        await reactivateMerchant(merchantId);
        notify.success('Merchant reactivated.');
      } else if (modal === 'rekyc') {
        await reKycMerchant(merchantId, comment);
        notify.success('Re-KYC triggered. Audit stamped.');
      } else if (modal === 'suspend') {
        await suspendMerchant(merchantId, comment);
        notify.success('Merchant suspended. Stores + logins auto-disabled. Audit stamped.');
      }
      closeModal();
      fetchMerchant();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Action failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkReKyc = async () => {
    if (!bulkRegion.trim()) { notify.warning('Enter a region to filter by.'); return; }
    const matches = merchants.filter((m) => (m.region ?? '').toLowerCase().includes(bulkRegion.toLowerCase()));
    if (!matches.length) { notify.warning('No merchants match that region.'); return; }
    try {
      setBulkLoading(true);
      await bulkReKycMerchants(matches.map((m) => m.id), `Bulk re-KYC for region: ${bulkRegion}`);
      notify.success(`Re-KYC triggered for ${matches.length} merchant(s) in "${bulkRegion}".`);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Bulk re-KYC failed.'));
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <PageWrapper
      title="Re-KYC & Suspension Workflow"
      subtitle="Screen 19 — Trigger re-KYC, suspend, reactivate with reason taxonomy"
      actions={
        <>
          <Button variant="secondary" onClick={() => setModal('rekyc')} disabled={!merchantId}>Trigger Re-KYC</Button>
          <Button variant="danger" onClick={() => setModal('suspend')} disabled={!merchantId}>Suspend Merchant</Button>
          <Button variant="teal" onClick={() => setModal('reactivate')}>Reactivate</Button>
        </>
      }
    >
      <div className="rekyc-grid">
        <Card title="Current Status">
          <div className="rekyc-picker">
            <label>Merchant</label>
            {merchantsLoading ? <Loader size="sm" text="Loading merchants..." /> : (
              <select value={merchantId} onChange={(e) => setMerchantId(e.target.value)}>
                <option value="">Select a merchant…</option>
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>{m.name ?? m.business_name ?? `Merchant #${m.id}`}</option>
                ))}
              </select>
            )}
          </div>
          {merchantLoading ? <Loader size="sm" text="Loading status..." /> : merchant ? (
            <div className="rekyc-status">
              <div className="rekyc-row"><span>Merchant</span><strong>{merchant.name ?? merchant.business_name}</strong></div>
              <div className="rekyc-row"><span>Status</span><Badge variant="warning">{merchant.status ?? '—'}</Badge></div>
              <div className="rekyc-row"><span>Region</span><strong>{merchant.region ?? merchant.city ?? '—'}</strong></div>
            </div>
          ) : (
            <p className="rekyc-hint">Select a merchant to view status.</p>
          )}
        </Card>

        <Card title="Bulk Actions (cohort)">
          <p className="rekyc-hint">Trigger re-KYC for all merchants matching a region (client-side filtered, then sent as explicit merchant IDs — the API only supports bulk actions by ID list, not a server-side filter).</p>
          <Input label="Filter (state/region)" placeholder="e.g. Maharashtra" value={bulkRegion} onChange={(e) => setBulkRegion(e.target.value)} />
          <Button variant="secondary" style={{ marginTop: '0.75rem' }} onClick={handleBulkReKyc} loading={bulkLoading}>Bulk Re-KYC</Button>
        </Card>
      </div>

      <Modal
        isOpen={!!modal}
        onClose={closeModal}
        title={modal === 'rekyc' ? 'Trigger Re-KYC' : 'Suspend Merchant'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
            <Button variant={modal === 'suspend' ? 'danger' : 'teal'} onClick={submit} loading={submitting}>Confirm</Button>
          </>
        }
      >
        <div className="rekyc-modal">
          <label className="rekyc-label">Reason (for your reference — sent as part of the comment below)</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="rekyc-select">
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <Input
            label="Mandatory comment (audit)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`${reason}: describe the reason...`}
          />
          {modal === 'suspend' && <p className="rekyc-warn">Suspension disables stores & user logins automatically.</p>}
        </div>
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
