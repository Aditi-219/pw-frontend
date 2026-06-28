import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listLoans, getLoan, forceApproveLoan, overrideLoanRejection, refundLoan, triggerManualDisbursal } from '../../services/loansService';
import { listLenders } from '../../services/lendersService';
import './ManualOverrideConsole.css';

export default function ManualOverrideConsole() {
  const [searchParams, setSearchParams] = useSearchParams();
  const loanId = searchParams.get('id');
  const { notification, notify, closeNotification } = useNotification();

  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [loan, setLoan] = useState(null);
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [secondaryId, setSecondaryId] = useState('');
  const [newLenderId, setNewLenderId] = useState('');
  const [bankVerified, setBankVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listLoans({}).then(r => setQueue(r.items)).catch(() => {}).finally(() => setQueueLoading(false));
    listLenders().then(r => setLenders(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loanId) { setLoan(null); return; }
    setLoading(true);
    getLoan(loanId).then(setLoan).catch(err => notify.error(getErrorMessage(err, 'Failed to load loan.'))).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  const resetForm = () => { setReason(''); setSecondaryId(''); setNewLenderId(''); setBankVerified(false); setAction(null); };

  const handleSubmit = async () => {
    if (!reason.trim()) { notify.warning('Reason is required.'); return; }
    if (!loanId) { notify.warning('Select a loan first.'); return; }
    try {
      setSubmitting(true);
      if (action === 'force-approve') {
        await forceApproveLoan(loanId, { reason, approvedBySecondary: secondaryId ? Number(secondaryId) : undefined });
        notify.success('Loan force-approved. Dual approval logged.');
      } else if (action === 'override-rejection') {
        if (!newLenderId) { notify.warning('Select a new lender.'); return; }
        await overrideLoanRejection(loanId, { newLenderId: Number(newLenderId), reason });
        notify.success('Rejection overridden. Re-routed to selected lender.');
      } else if (action === 'refund') {
        await refundLoan(loanId, { reason, financeApprovedBy: secondaryId ? Number(secondaryId) : undefined });
        notify.success('Refund/reversal initiated. Finance approval recorded.');
      } else if (action === 'manual-disbursal') {
        await triggerManualDisbursal(loanId, { bankAccountVerified: bankVerified, reason });
        notify.success('Manual disbursal triggered.');
      }
      resetForm();
    } catch (err) {
      notify.error(getErrorMessage(err, 'Override action failed.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper title="Manual Override Console" subtitle="Screen 35 — High-privilege overrides with mandatory dual approval">
      <Card>
        <label className="loan-picker-label">Loan</label>
        {queueLoading ? <Loader size="sm" /> : (
          <select className="loan-picker" value={loanId ?? ''} onChange={e => setSearchParams(e.target.value ? { id: e.target.value } : {})}>
            <option value="">Select a loan…</option>
            {queue.map(l => <option key={l.id} value={l.id}>{l.id} — {l.customer_name ?? l.customer ?? 'Customer'} — {l.status}</option>)}
          </select>
        )}
      </Card>

      {loanId && loading && <Loader text="Loading loan..." />}

      {loan && (
        <div className="override-grid">
          <Card title="Loan Context">
            <div className="override-kv"><span>Customer</span><strong>{loan.customer_name ?? loan.customer ?? '—'}</strong></div>
            <div className="override-kv"><span>Amount</span><strong>{loan.loan_amount ?? loan.amount ?? '—'}</strong></div>
            <div className="override-kv"><span>Status</span><Badge variant="warning">{String(loan.status ?? '—')}</Badge></div>
            <div className="override-kv"><span>Lender</span><strong>{loan.lender?.name ?? loan.lender_name ?? '—'}</strong></div>
          </Card>

          <Card title="Override Action">
            <div className="override-actions-pick">
              {[
                { key: 'force-approve', label: 'Force Approve', variant: 'teal' },
                { key: 'override-rejection', label: 'Override Rejection', variant: 'secondary' },
                { key: 'refund', label: 'Refund / Reversal', variant: 'secondary' },
                { key: 'manual-disbursal', label: 'Trigger Disbursal', variant: 'secondary' },
              ].map(a => (
                <Button key={a.key} variant={action === a.key ? a.variant : 'ghost'}
                  onClick={() => { setAction(a.key); setReason(''); }}>
                  {a.label}
                </Button>
              ))}
            </div>

            {action && (
              <div className="override-form">
                <Input label="Mandatory reason (audit logged)" value={reason} onChange={e => setReason(e.target.value)} placeholder="Justification..." />

                {(action === 'force-approve' || action === 'refund') && (
                  <Input label="Secondary approver admin ID (required for high-value)" value={secondaryId}
                    onChange={e => setSecondaryId(e.target.value)} placeholder="Admin user ID" type="number" />
                )}

                {action === 'override-rejection' && (
                  <div className="override-field">
                    <label>Re-route to lender</label>
                    <select value={newLenderId} onChange={e => setNewLenderId(e.target.value)}>
                      <option value="">Select lender…</option>
                      {lenders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>
                )}

                {action === 'manual-disbursal' && (
                  <label className="override-check">
                    <input type="checkbox" checked={bankVerified} onChange={e => setBankVerified(e.target.checked)} />
                    Bank account manually verified
                  </label>
                )}

                <Button variant="danger" onClick={handleSubmit} loading={submitting}>Confirm Override (Dual-approval logged)</Button>
              </div>
            )}
          </Card>
        </div>
      )}

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
