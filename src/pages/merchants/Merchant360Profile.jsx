import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Tabs from '../../components/common/Tabs';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  getMerchant, sendMerchantNotice, suspendMerchant, reactivateMerchant,
  approveMerchantChanges, getMerchantNotes, addMerchantNote, getMerchantDocuments,
  listMerchantAgreements,
} from '../../services/merchantsService';
import './Merchant360Profile.css';

const tabs = [
  { id: 'profile', label: 'Profile' },
  { id: 'stores', label: 'Stores' },
  { id: 'notes', label: 'Internal Notes' },
  { id: 'documents', label: 'Documents' },
  { id: 'agreements', label: 'Agreements' },
];

const storeCols = [
  { key: 'store', label: 'Store' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Status', render: v => <Badge variant={v === 'Active' ? 'success' : 'warning'}>{v}</Badge> },
];

function mapMerchant(m) {
  return {
    name: String(m.name ?? m.business_name ?? '—'),
    status: String(m.status ?? '—'),
    category: String(m.category ?? m.category_name ?? '—'),
    region: String(m.region ?? m.city ?? '—'),
    disbursals: m.disbursal_90d ?? '—',
    approvalRate: m.approval_rate ?? '—',
    npa: m.npa ?? '—',
    stores: (m.stores ?? []).map((s, i) => ({ id: s.id ?? i, store: s.name ?? '—', city: s.city ?? '—', status: String(s.status ?? 'Active') })),
  };
}

export default function Merchant360Profile() {
  const { id } = useParams();
  const { notification, notify, closeNotification } = useNotification();

  const [active, setActive] = useState('profile');
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const [modal, setModal] = useState(null);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMerchant = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getMerchant(id);
      setMerchant(mapMerchant(data));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load merchant.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { fetchMerchant(); }, [fetchMerchant]);

  useEffect(() => {
    if (active === 'notes') getMerchantNotes(id).then(r => setNotes(r.items)).catch(() => {});
    if (active === 'documents') getMerchantDocuments(id).then(r => setDocuments(r.items)).catch(() => {});
    if (active === 'agreements') listMerchantAgreements(id).then(r => setAgreements(r.items)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, id]);

  const closeModal = () => { setModal(null); setComment(''); };

  const handleAction = async () => {
    if (!comment.trim() && modal !== 'reactivate' && modal !== 'approve-changes') {
      notify.warning('Comment required.'); return;
    }
    try {
      setActionLoading(true);
      if (modal === 'notice') { await sendMerchantNotice(id, comment); notify.success('Notice sent.'); }
      else if (modal === 'suspend') { await suspendMerchant(id, comment); notify.success('Suspended.'); }
      else if (modal === 'reactivate') { await reactivateMerchant(id); notify.success('Merchant reactivated.'); }
      else if (modal === 'approve-changes') { await approveMerchantChanges(id); notify.success('Changes approved.'); }
      closeModal();
      fetchMerchant();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Action failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    try {
      setAddingNote(true);
      await addMerchantNote(id, noteInput.trim());
      setNoteInput('');
      const r = await getMerchantNotes(id);
      setNotes(r.items);
      notify.success('Note added.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to add note.'));
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (<PageWrapper title="Merchant 360 Profile" subtitle={`Screen 16 — ${id}`}><Loader text="Loading..." /></PageWrapper>);
  }

  return (
    <PageWrapper title="Merchant 360 Profile" subtitle={`Screen 16 — ${merchant?.name}`}
      actions={
        <>
          <Button variant="secondary" onClick={() => setModal('notice')}>Send Notice</Button>
          <Button variant="secondary" onClick={() => setModal('reactivate')}>Reactivate</Button>
          <Button variant="teal" onClick={() => setModal('approve-changes')}>Approve Changes</Button>
          <Button variant="danger" onClick={() => setModal('suspend')}>Suspend</Button>
        </>
      }
    >
      <Card>
        <Tabs tabs={tabs} active={active} onChange={setActive} />

        {active === 'profile' && merchant && (
          <div className="m360-grid">
            <div className="m360-block">
              <h4>Business Info</h4>
              <div className="m360-kv"><span>Merchant</span><strong>{merchant.name}</strong></div>
              <div className="m360-kv"><span>Status</span><Badge variant="info">{merchant.status}</Badge></div>
              <div className="m360-kv"><span>Category</span><strong>{merchant.category}</strong></div>
              <div className="m360-kv"><span>Region</span><strong>{merchant.region}</strong></div>
            </div>
            <div className="m360-block">
              <h4>Performance (90d)</h4>
              <div className="m360-kv"><span>Disbursals</span><strong>{merchant.disbursals}</strong></div>
              <div className="m360-kv"><span>Approval rate</span><strong>{merchant.approvalRate}</strong></div>
              <div className="m360-kv"><span>NPA</span><strong>{merchant.npa}</strong></div>
            </div>
          </div>
        )}

        {active === 'stores' && (
          <Table columns={storeCols} data={merchant?.stores ?? []} emptyMessage="No stores" />
        )}

        {active === 'notes' && (
          <div className="m360-notes">
            <div className="m360-note-add">
              <Input label="Add internal note" value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="Internal only — not visible to merchant" />
              <Button variant="teal" onClick={handleAddNote} loading={addingNote}>Add</Button>
            </div>
            {notes.map((n, i) => (
              <div key={n.id ?? i} className="m360-note-item">
                <div className="m360-note-head"><strong>{String(n.added_by ?? n.admin ?? 'Admin')}</strong><span>{n.created_at ?? '—'}</span></div>
                <p>{String(n.note ?? n.body ?? n.text ?? '—')}</p>
              </div>
            ))}
            {!notes.length && <p className="m360-empty">No notes yet.</p>}
          </div>
        )}

        {active === 'documents' && (
          <div className="m360-docs">
            {documents.map((d, i) => (
              <div key={d.id ?? i} className="m360-doc-row">
                <span>📄 {String(d.file_name ?? d.name ?? d.type ?? '—')}</span>
                <span>{d.created_at ?? '—'}</span>
                <Badge variant="info">{String(d.status ?? '—')}</Badge>
              </div>
            ))}
            {!documents.length && <p className="m360-empty">No documents.</p>}
          </div>
        )}

        {active === 'agreements' && (
          <div className="m360-agreements">
            {agreements.map((a, i) => (
              <div key={a.id ?? i} className="m360-agreement-row">
                <span>📝 {String(a.name ?? a.type ?? `Agreement #${a.id}`)}</span>
                <span>{a.created_at ?? '—'}</span>
                <Badge variant={String(a.status ?? '—') === 'signed' ? 'success' : 'warning'}>{String(a.status ?? '—')}</Badge>
              </div>
            ))}
            {!agreements.length && <p className="m360-empty">No agreements.</p>}
          </div>
        )}
      </Card>

      <Modal isOpen={!!modal} onClose={closeModal}
        title={modal === 'notice' ? 'Send Notice' : modal === 'suspend' ? 'Suspend Merchant' : modal === 'reactivate' ? 'Reactivate Merchant' : 'Approve Changes'}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={actionLoading}>Cancel</Button>
            <Button variant={modal === 'suspend' ? 'danger' : 'teal'} onClick={handleAction} loading={actionLoading}>Confirm</Button>
          </>
        }
      >
        {(modal === 'notice' || modal === 'suspend') && (
          <Input label={modal === 'notice' ? 'Notice text' : 'Suspension reason'} value={comment} onChange={e => setComment(e.target.value)} />
        )}
        {modal === 'reactivate' && <p>Reactivate <strong>{merchant?.name}</strong> and restore all access?</p>}
        {modal === 'approve-changes' && <p>Approve the pending change request for <strong>{merchant?.name}</strong>?</p>}
      </Modal>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
