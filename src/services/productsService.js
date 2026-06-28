import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Products, Categories, and Brands service layer.
 * Backend reference: FinZ LMS API — Product, Category, Brand tags.
 *
 * KNOWN GAPS:
 *  - No "duplicate SKU detection" endpoint.
 *  - Bulk financing-eligibility toggle is scoped to a single category_id
 *    (POST /admin/products/bulk-financing-toggle), not an arbitrary
 *    multi-select of SKUs across categories.
 *  - No import/export endpoint for category/brand taxonomy.
 */

// ---------- Products ----------

export async function listProducts({ categoryId, brandId, page, search } = {}) {
  const { data } = await api.get("/admin/products", {
    params: {
      category_id: categoryId || undefined,
      brand_id: brandId || undefined,
      page,
      search: search || undefined,
    },
  });
  return normalizeListResponse(data, "products");
}

export async function flagProduct(id) {
  const { data } = await api.post(`/admin/products/${id}/flag`);
  return data;
}

export async function delistProduct(id, reason) {
  const { data } = await api.post(`/admin/products/${id}/delist`, { reason });
  return data;
}

export async function bulkToggleFinancingEligibility(categoryId, financingEligibility) {
  const { data } = await api.post("/admin/products/bulk-financing-toggle", {
    category_id: categoryId,
    financing_eligibility: financingEligibility,
  });
  return data;
}

export async function importProductsCsv(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/admin/products/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---------- Categories ----------

export async function listCategories() {
  const { data } = await api.get("/admin/categories");
  return normalizeListResponse(data, "categories");
}

export async function createCategory(name, parentId = null) {
  const { data } = await api.post("/admin/categories", { name, parent_id: parentId });
  return data;
}

export async function updateCategory(id, { name, parentId }) {
  const { data } = await api.put(`/admin/categories/${id}`, { name, parent_id: parentId });
  return data;
}

export async function archiveCategory(id, reassignTo = null) {
  const { data } = await api.post(`/admin/categories/${id}/archive`, { reassign_to: reassignTo });
  return data;
}

export async function setCategoryFinancingRules(id, { defaultDownPaymentPercent, defaultTenureMonths }) {
  const { data } = await api.put(`/admin/categories/${id}/financing-rules`, {
    default_down_payment_percent: defaultDownPaymentPercent,
    default_tenure_months: defaultTenureMonths,
  });
  return data;
}

// ---------- Brands ----------

export async function listBrands() {
  const { data } = await api.get("/admin/brands");
  return normalizeListResponse(data, "brands");
}

export async function createBrand({ name, logoUrl, status }) {
  const { data } = await api.post("/admin/brands", { name, logo_url: logoUrl, status });
  return data;
}

export async function updateBrand(id, { name, logoUrl, status }) {
  const { data } = await api.put(`/admin/brands/${id}`, { name, logo_url: logoUrl, status });
  return data;
}

// ---------- Duplicate SKU Detection (NEW endpoint) ----------

export async function detectDuplicateSkus() {
  const { data } = await api.post("/admin/products/detect-duplicates");
  return normalizeListResponse(data, "duplicates");
}

// ---------- Categories Import/Export (NEW endpoints) ----------

export async function exportCategories() {
  const response = await api.get("/admin/categories/export", { responseType: "blob" });
  return response.data;
}

export async function importCategories(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/admin/categories/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---------- Brands Import/Export (NEW endpoints) ----------

export async function exportBrands() {
  const response = await api.get("/admin/brands/export", { responseType: "blob" });
  return response.data;
}

export async function importBrands(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/admin/brands/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
