import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { getLender, createLender, updateLender, testLenderConnection } from '../../services/lendersService';
import './LenderConfiguration.css';

export default function LenderConfiguration() {
  const [searchParams] = useSearchParams();
  const lenderId = searchParams.get('id');
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [loading, setLoading] = useState(Boolean(lenderId));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [form, setForm] = useState({
    name: '', apiBaseUrl: '', status: 'active',
    apiKey: '', apiSecret: '', webhookUrl: '',
    category: 'Mobiles', minLoan: '', maxLoan: '',
    commissionType: 'percentage', commissionValue: '',
  });

  useEffect(() => {
    if (!lenderId) return;
    (async () => {
      try {
        setLoading(true);
        const lender = await getLender(lenderId);
        setForm(f => ({
          ...f,
          name: lender.name ?? '',
          apiBaseUrl: lender.api_base_url ?? '',
          status: lender.status ?? 'active',
          apiKey: lender.api_key ?? '',
          apiSecret: lender.api_secret ?? '',
          webhookUrl: lender.webhook_url ?? '',
          minLoan: lender.min_loan_amount ?? '',
          maxLoan: lender.max_loan_amount ?? '',
          commissionType: lender.commission_type ?? 'percentage',
          commissionValue: lender.commission_value ?? '',
        }));
      } catch (err) {
        notify.error(getErrorMessage(err, 'Failed to load lender.'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lenderId]);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.apiBaseUrl.trim()) {
      notify.warning('Lender name and API base URL are required.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name, apiBaseUrl: form.apiBaseUrl, status: form.status,
        apiKey: form.apiKey || undefined, apiSecret: form.apiSecret || undefined,
        webhookUrl: form.webhookUrl || undefined,
        commissionType: form.commissionType || undefined,
        commissionValue: form.commissionValue ? Number(form.commissionValue) : undefined,
        minLoanAmount: form.minLoan ? Number(form.minLoan) : undefined,
        maxLoanAmount: form.maxLoan ? Number(form.maxLoan) : undefined,
        supportedCategories: form.category ? [form.category] : undefined,
      };
      if (lenderId) {
        await updateLender(lenderId, payload);
        notify.success('Lender updated.');
      } else {
        await createLender(payload);
        notify.success('Lender created.');
      }
      navigate('/lenders');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save lender.'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!lenderId) { notify.warning('Save the lender first, then test the connection.'); return; }
    try {
      setTesting(true);
      await testLenderConnection(lenderId);
      notify.success('Connection test succeeded.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Connection test failed.'));
    } finally {
      setTesting(false);
    }
  };

  if (loading) return (
    <PageWrapper title="Lender Configuration" subtitle="Screen 25">
      <Loader text="Loading lender..." />
    </PageWrapper>
  );

  return (
    <PageWrapper title="Lender Configuration" subtitle="Screen 25 — Credentials, endpoints, categories, commission"
      actions={<Button variant="secondary" onClick={() => navigate('/lenders')}>Back</Button>}
    >
      <Card title="API + Credentials">
        <div className="lcfg-grid">
          <Input label="Lender name" value={form.name} onChange={e => update('name', e.target.value)} />
          <Input label="API base URL" value={form.apiBaseUrl} onChange={e => update('apiBaseUrl', e.target.value)} />
          <Input label="API key" type="password" value={form.apiKey} onChange={e => update('apiKey', e.target.value)} placeholder="Encrypted at rest" />
          <Input label="API secret" type="password" value={form.apiSecret} onChange={e => update('apiSecret', e.target.value)} placeholder="Encrypted at rest" />
          <Input label="Webhook URL" value={form.webhookUrl} onChange={e => update('webhookUrl', e.target.value)} placeholder="https://..." />
          <div className="lcfg-field">
            <label>Status</label>
            <select value={form.status} onChange={e => update('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="lcfg-field">
            <label>Supported categories</label>
            <select value={form.category} onChange={e => update('category', e.target.value)}>
              <option>Mobiles</option><option>Appliances</option><option>Furniture</option>
            </select>
          </div>
          <Input label="Min loan amount" type="number" value={form.minLoan} onChange={e => update('minLoan', e.target.value)} />
          <Input label="Max loan amount" type="number" value={form.maxLoan} onChange={e => update('maxLoan', e.target.value)} />
          <div className="lcfg-field">
            <label>Commission type</label>
            <select value={form.commissionType} onChange={e => update('commissionType', e.target.value)}>
              <option value="percentage">Percentage</option>
              <option value="flat">Flat</option>
              <option value="tiered">Tiered slabs</option>
            </select>
          </div>
          <Input label="Commission value" value={form.commissionValue} onChange={e => update('commissionValue', e.target.value)} placeholder="e.g. 1.2" />
        </div>
        <div className="lcfg-actions">
          <Button variant="secondary" onClick={handleTest} loading={testing}>Test connection</Button>
          <Button variant="teal" onClick={handleSave} loading={saving}>Save lender</Button>
        </div>
      </Card>
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
