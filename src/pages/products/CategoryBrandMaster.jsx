import { useState, useEffect, useCallback, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Table from '../../components/common/Table';
import Badge from '../../components/common/Badge';
import Loader from '../../components/common/Loader';
import Notification from '../../components/common/Notification';
import useNotification from '../../hooks/useNotification';
import { getErrorMessage } from '../../services/api';
import {
  listCategories, createCategory, setCategoryFinancingRules,
  listBrands, createBrand,
  exportCategories, importCategories, exportBrands, importBrands,
} from '../../services/productsService';
import './CategoryBrandMaster.css';

function mapCategory(c) {
  return { id: c.id, name: c.name ?? '—', parentName: c.parent?.name ?? null, downPayment: c.default_down_payment_percent ?? c.financing_rules?.default_down_payment_percent, tenure: c.default_tenure_months ?? c.financing_rules?.default_tenure_months };
}
function mapBrand(b) {
  return { id: b.id, brand: b.name ?? '—', status: String(b.status ?? 'pending') };
}

export default function CategoryBrandMaster() {
  const { notification, notify, closeNotification } = useNotification();
  const catImportRef = useRef(null);
  const brandImportRef = useRef(null);

  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [addingCategory, setAddingCategory] = useState(false);
  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [addingBrand, setAddingBrand] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [downPayment, setDownPayment] = useState('');
  const [tenure, setTenure] = useState('');
  const [savingRules, setSavingRules] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [importing, setImporting] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const result = await listCategories();
      const mapped = result.items.map(mapCategory);
      setCategories(mapped);
      if (mapped.length && selectedCategoryId == null) {
        setSelectedCategoryId(mapped[0].id);
        setDownPayment(mapped[0].downPayment ?? '');
        setTenure(mapped[0].tenure ?? '');
      }
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load categories.'));
    } finally {
      setCategoriesLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBrands = useCallback(async () => {
    try {
      setBrandsLoading(true);
      const result = await listBrands();
      setBrands(result.items.map(mapBrand));
    } catch (err) {
      notify.error(getErrorMessage(err, 'Failed to load brands.'));
    } finally {
      setBrandsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchCategories(); fetchBrands(); }, [fetchCategories, fetchBrands]);

  const handleAddCategory = async () => {
    if (!cat.trim()) return;
    try {
      setAddingCategory(true);
      await createCategory(cat.trim());
      notify.success('Category added.');
      setCat('');
      fetchCategories();
    } catch (err) { notify.error(getErrorMessage(err, 'Failed to add category.')); }
    finally { setAddingCategory(false); }
  };

  const handleAddBrand = async () => {
    if (!brand.trim()) return;
    try {
      setAddingBrand(true);
      await createBrand({ name: brand.trim(), status: 'pending' });
      notify.success('Brand added.');
      setBrand('');
      fetchBrands();
    } catch (err) { notify.error(getErrorMessage(err, 'Failed to add brand.')); }
    finally { setAddingBrand(false); }
  };

  const selectCategory = c => { setSelectedCategoryId(c.id); setDownPayment(c.downPayment ?? ''); setTenure(c.tenure ?? ''); };

  const handleSaveRules = async () => {
    if (!selectedCategoryId) return;
    try {
      setSavingRules(true);
      await setCategoryFinancingRules(selectedCategoryId, {
        defaultDownPaymentPercent: downPayment !== '' ? Number(downPayment) : undefined,
        defaultTenureMonths: tenure !== '' ? Number(tenure) : undefined,
      });
      notify.success('Financing rules saved.');
      fetchCategories();
    } catch (err) { notify.error(getErrorMessage(err, 'Failed to save rules.')); }
    finally { setSavingRules(false); }
  };

  const triggerDownload = (blob, filename) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); };

  const handleExportCat = async () => { try { setExporting('cat'); const b = await exportCategories(); triggerDownload(b, 'categories.csv'); } catch (err) { notify.error(getErrorMessage(err, 'Export failed.')); } finally { setExporting(null); } };
  const handleExportBrand = async () => { try { setExporting('brand'); const b = await exportBrands(); triggerDownload(b, 'brands.csv'); } catch (err) { notify.error(getErrorMessage(err, 'Export failed.')); } finally { setExporting(null); } };
  const handleImportCat = async e => { const file = e.target.files?.[0]; e.target.value=''; if (!file) return; try { setImporting('cat'); await importCategories(file); notify.success('Categories imported.'); fetchCategories(); } catch (err) { notify.error(getErrorMessage(err, 'Import failed.')); } finally { setImporting(null); } };
  const handleImportBrand = async e => { const file = e.target.files?.[0]; e.target.value=''; if (!file) return; try { setImporting('brand'); await importBrands(file); notify.success('Brands imported.'); fetchBrands(); } catch (err) { notify.error(getErrorMessage(err, 'Import failed.')); } finally { setImporting(null); } };

  const brandCols = [{ key: 'brand', label: 'Brand' }, { key: 'status', label: 'Status', render: v => <Badge variant={v === 'approved' ? 'success' : 'warning'}>{v}</Badge> }];
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <PageWrapper title="Category & Brand Master" subtitle="Screen 23 — Taxonomy, brands, financing rules, import/export">
      <div className="cbm-grid">
        <Card title="Categories">
          <div className="cbm-row">
            <Input label="Add category" value={cat} onChange={e => setCat(e.target.value)} placeholder="e.g. Mobiles" />
            <Button variant="teal" onClick={handleAddCategory} loading={addingCategory}>Add</Button>
          </div>
          <div className="cbm-import-export">
            <input ref={catImportRef} type="file" accept=".csv" hidden onChange={handleImportCat} />
            <Button variant="ghost" size="sm" onClick={handleExportCat} loading={exporting === 'cat'}>Export CSV</Button>
            <Button variant="ghost" size="sm" onClick={() => catImportRef.current?.click()} loading={importing === 'cat'}>Import CSV</Button>
          </div>
          {categoriesLoading ? <Loader size="sm" text="Loading categories..." /> : (
            <div className="cbm-tree">
              {categories.map(c => (
                <button type="button" key={c.id} className={`cbm-node ${selectedCategoryId === c.id ? 'cbm-node--active' : ''}`} onClick={() => selectCategory(c)}>
                  <strong>{c.name}</strong>
                  {c.parentName && <span>under {c.parentName}</span>}
                </button>
              ))}
              {!categories.length && <p className="cbm-empty">No categories yet.</p>}
            </div>
          )}
          <div className="cbm-rules">
            <h4>Financing rules{selectedCategory ? ` — ${selectedCategory.name}` : ''}</h4>
            {selectedCategory ? (
              <>
                <Input label="Down-payment %" type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} />
                <Input label="Tenure (months)" type="number" value={tenure} onChange={e => setTenure(e.target.value)} />
                <Button variant="primary" style={{ marginTop:'0.5rem' }} onClick={handleSaveRules} loading={savingRules}>Save rules</Button>
              </>
            ) : <p className="cbm-empty">Select a category to configure rules.</p>}
          </div>
        </Card>

        <Card title="Brand Directory">
          <div className="cbm-row">
            <Input label="Add brand" value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Apple" />
            <Button variant="teal" onClick={handleAddBrand} loading={addingBrand}>Add</Button>
          </div>
          <div className="cbm-import-export">
            <input ref={brandImportRef} type="file" accept=".csv" hidden onChange={handleImportBrand} />
            <Button variant="ghost" size="sm" onClick={handleExportBrand} loading={exporting === 'brand'}>Export CSV</Button>
            <Button variant="ghost" size="sm" onClick={() => brandImportRef.current?.click()} loading={importing === 'brand'}>Import CSV</Button>
          </div>
          {brandsLoading ? <Loader size="sm" text="Loading brands..." /> : (
            <Table columns={brandCols} data={brands} emptyMessage="No brands" />
          )}
        </Card>
      </div>
      <Notification {...notification} onClose={closeNotification} />
    </PageWrapper>
  );
}
