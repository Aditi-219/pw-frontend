import { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listMerchants, generateMerchantAgreement,
  listMerchantAgreements, getAgreementEsignStatus,
} from '../../services/merchantsService';
import './AgreementManagement.css';

export default function AgreementManagement() {
  const { notification, notify, closeNotification } = useNotification();
  const [merchants, setMerchants] = useState([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [agreements, setAgreements] = useState([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    listMerchants({ status: 'Approved' })
      .then(r => setMerchants(r.items))
      .catch(() => {})
      .finally(() => setLoadingMerchants(false));
  }, []);

  const fetchAgreements = async (merchantId) => {
    if (!merchantId) { setAgreements([]); return; }
    try {
      setLoadingAgreements(true);
      const result = await listMerchantAgreements(merchantId);
      setAgreements(result.items);
    } catch {
      setAgreements([]);
    } finally {
      setLoadingAgreements(false);
    }
  };

  const handleMerchantChange = (id) => {
    setSelectedId(id);
    fetchAgreements(id);
  };

  const handleGenerate = async () => {
    if (!selectedId) { notify.warning('Select a merchant first.'); return; }
    try {
      setGenerating(true);
      await generateMerchantAgreement(selectedId);
      notify.success('Agreement generated.');
      fetchAgreements(selectedId);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to generate agreement.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleCheckEsign = async (merchantId, agreementId) => {
    try {
      setBusyId(agreementId);
      const status = await getAgreementEsignStatus(merchantId, agreementId);
      notify.info(`eSign status: ${JSON.stringify(status?.status ?? status)}`);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to get eSign status.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageWrapper title="Merchant Agreement Management" subtitle="Screen 17 — Generate, list, view eSign status"
      actions={<Button variant="teal" onClick={handleGenerate} loading={generating} disabled={!selectedId}>Generate Agreement</Button>}
    >
      <Card title="Select Merchant">
        {loadingMerchants ? <Loader size="sm" /> : (
          <select className="agr-select" value={selectedId} onChange={e => handleMerchantChange(e.target.value)}>
            <option value="">Select merchant…</option>
            {merchants.map(m => <option key={m.id} value={m.id}>{String(m.name ?? m.business_name ?? `Merchant #${m.id}`)}</option>)}
          </select>
        )}
      </Card>

      <Card title="Agreements">
        {loadingAgreements ? <Loader size="sm" text="Loading agreements..." /> : (
          <div className="agr-list">
            {agreements.map((a, i) => (
              <div key={a.id ?? i} className="agr-row">
                <div className="agr-row-info">
                  <span>📝 {String(a.name ?? a.type ?? `Agreement #${a.id}`)}</span>
                  <span>{a.created_at ?? '—'}</span>
                  <Badge variant={String(a.status ?? '') === 'signed' ? 'success' : 'warning'}>{String(a.status ?? 'pending')}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleCheckEsign(selectedId, a.id)} loading={busyId === a.id}>
                  Check eSign
                </Button>
              </div>
            ))}
            {!agreements.length && selectedId && <p className="agr-empty">No agreements yet. Generate one above.</p>}
            {!selectedId && <p className="agr-empty">Select a merchant to view agreements.</p>}
          </div>
        )}
      </Card>
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
