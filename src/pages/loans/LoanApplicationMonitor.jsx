import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/searchbar';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import Pagination from '../../components/common/Pagination';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import { listLoans, exportLoans, getSavedFilters, saveFilter } from '../../services/loansService';
import './LoanApplicationMonitor.css';

const STATUS_PIPELINE = ['Initiated','KYC','Bureau','Approved','eSign','eNACH','Disbursed','Rejected'];
const statusVariant = { Approved:'success', Disbursed:'success', Rejected:'danger', Bureau:'warning', eSign:'info', eNACH:'info', KYC:'warning', Initiated:'default' };

function mapLoan(l) {
  return {
    id: l.id ?? l.application_id ?? '—',
    customer: l.customer_name ?? l.customer ?? '—',
    merchant: l.merchant?.name ?? l.merchant_name ?? '—',
    store: l.store?.name ?? l.store_name ?? '—',
    lender: l.lender?.name ?? l.lender_name ?? '—',
    amount: l.loan_amount ?? l.amount ?? '—',
    status: String(l.status ?? 'Initiated'),
    stuck: Boolean(l.is_stuck ?? l.stuck),
    createdAt: l.created_at ?? '—',
  };
}

export default function LoanApplicationMonitor() {
  const navigate = useNavigate();
  const { notification, notify, closeNotification } = useNotification();
  const fileRef = useRef(null);

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({ search:'', status:'all', dateFrom:'', dateTo:'' });
  const [savedFilters, setSavedFilters] = useState([]);
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterName, setFilterName] = useState('');

  const fetchLoans = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listLoans({ ...filters, page });
      setLoans(result.items.map(mapLoan));
      setTotalPages(result.totalPages);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load loans.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  useEffect(() => { fetchLoans(); }, [fetchLoans]);

  useEffect(() => {
    getSavedFilters().then(r => setSavedFilters(r.items)).catch(() => {});
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportLoans();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'loans-export.csv';
      a.click();
      notify.success('Export started.');
    } catch (err) {
      notify.error(getErrorMessage(err, 'Export failed.'));
    } finally {
      setExporting(false);
    }
  };

  const handleSaveFilter = async () => {
    if (!filterName.trim()) return;
    try {
      setSavingFilter(true);
      await saveFilter({ name: filterName, filterPayload: filters });
      notify.success(`Filter "${filterName}" saved.`);
      setFilterName('');
      const r = await getSavedFilters();
      setSavedFilters(r.items);
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to save filter.'));
    } finally {
      setSavingFilter(false);
    }
  };

  const applyFilter = (f) => {
    setFilters(prev => ({ ...prev, ...(f.filter_payload ?? {}) }));
    notify.success(`Applied filter: ${f.name}`);
  };

  return (
    <PageWrapper title="Loan Application Monitor" subtitle="Screen 33 — Every loan across the platform">
      <Card>
        <div className="loan-toolbar">
          <SearchBar placeholder="Search customer, loan ID..." value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))} />
          <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="all">All Status</option>
            {STATUS_PIPELINE.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
          <input type="date" value={filters.dateTo} onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
          <Button variant="secondary" onClick={handleExport} loading={exporting}>Export</Button>
        </div>

        {savedFilters.length > 0 && (
          <div className="loan-saved-filters">
            <span>Saved:</span>
            {savedFilters.map(f => (
              <button key={f.id} className="saved-filter-chip" onClick={() => applyFilter(f)}>{f.name}</button>
            ))}
          </div>
        )}

        <div className="loan-save-row">
          <input placeholder="Save current filter as..." value={filterName}
            onChange={(e) => setFilterName(e.target.value)} className="filter-name-input" />
          <Button variant="ghost" size="sm" onClick={handleSaveFilter} loading={savingFilter}>Save filter</Button>
        </div>

        {loading ? <Loader text="Loading loans..." /> : (
          <>
            <div className="loan-list">
              {loans.map(loan => (
                <div key={loan.id} className={`loan-row ${loan.stuck ? 'loan-row--stuck' : ''}`}
                  onClick={() => navigate(`/loan-detail-timeline?id=${loan.id}`)}>
                  <div className="loan-row__id">
                    {loan.id}
                    {loan.stuck && <Badge variant="danger">STUCK</Badge>}
                  </div>
                  <div className="loan-row__meta">
                    <span>{loan.customer}</span>
                    <span>{loan.merchant}</span>
                    <span>{loan.lender}</span>
                    <span>{loan.amount}</span>
                    <Badge variant={statusVariant[loan.status] || 'default'}>{loan.status}</Badge>
                    <span>{loan.createdAt}</span>
                  </div>
                </div>
              ))}
              {!loans.length && <p className="loan-empty">No loans found.</p>}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </Card>
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
