import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { createOffer } from '../../services/pricingService';
import './OfferEngineBuilder.css';

export default function OfferEngineBuilder() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();

  const [offer, setOffer] = useState({
    title: '',
    description: '',
    type: 'cashback',
    discountValue: '5',
    scope: 'platform',
    start: '',
    end: '',
    budget: '100000',
  });
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setOffer((o) => ({ ...o, [k]: v }));

  const handleSave = async () => {
    if (!offer.title.trim() || !offer.start || !offer.end) {
      notify.warning('Title, start date, and end date are required.');
      return;
    }
    try {
      setSaving(true);
      await createOffer({
        title: offer.title,
        description: offer.description,
        offerType: offer.type,
        discountValue: Number(offer.discountValue) || 0,
        scopeType: offer.scope,
        startDate: offer.start,
        endDate: offer.end,
        budgetCap: Number(offer.budget) || undefined,
        autoPause: true,
        isPlatformOffer: offer.scope === 'platform',
      });
      notify.success('Offer saved as draft — pending approval.');
      navigate('/pricing/offers/approval');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save offer.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper
      title="Offer Engine Builder"
      subtitle="Screen 31 — Platform offers, scope, schedule, budget cap"
      actions={<Button variant="teal" onClick={handleSave} loading={saving}>Save</Button>}
    >
      <Card title="Create Offer">
        <div className="offer-grid">
          <Input label="Offer title" value={offer.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Diwali Special Cashback" />
          <Input label="Description" value={offer.description} onChange={(e) => update('description', e.target.value)} placeholder="e.g. Get 5% cashback up to ₹1000" />
          <div className="offer-field">
            <label>Offer type</label>
            <select value={offer.type} onChange={(e) => update('type', e.target.value)}>
              <option value="flat">Flat</option>
              <option value="percentage">Percentage</option>
              <option value="cashback">Cashback</option>
            </select>
          </div>
          <Input label="Discount value" type="number" value={offer.discountValue} onChange={(e) => update('discountValue', e.target.value)} />
          <div className="offer-field">
            <label>Scope</label>
            <select value={offer.scope} onChange={(e) => update('scope', e.target.value)}>
              <option value="platform">Platform-wide</option>
              <option value="tier">Merchant tier</option>
              <option value="category">Category</option>
              <option value="lender">Lender</option>
              <option value="geo">Geo</option>
            </select>
          </div>
          <Input label="Start date" type="date" value={offer.start} onChange={(e) => update('start', e.target.value)} />
          <Input label="End date" type="date" value={offer.end} onChange={(e) => update('end', e.target.value)} />
          <Input label="Budget cap" type="number" value={offer.budget} onChange={(e) => update('budget', e.target.value)} />
        </div>

        <p className="offer-note">
          Coupon codes and festival templates aren't supported by the backend's offer schema yet —
          those fields have been removed from this form to avoid implying they're saved.
        </p>

        <div className="offer-actions">
          <Button variant="teal" onClick={handleSave} loading={saving}>Publish (as draft)</Button>
        </div>
      </Card>

      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
