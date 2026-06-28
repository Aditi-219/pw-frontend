import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Pricing module service layer.
 * Backend reference: FinZ LMS API — Pricing (EMI types, tenure slabs), Offer tags.
 *
 * KNOWN GAPS:
 *  - EMI type schema has no enabled/disabled status field — only
 *    name/type/min/max amount/allowed tiers/effective_from.
 *  - Offer schema has no coupon-code field, and there's no
 *    "festival template" endpoint.
 *  - No approve-with-comment / reject-without-reason distinction — approve
 *    takes no body at all per the spec (reject requires `reason`).
 */

// ---------- EMI Types ----------

export async function listEmiTypes() {
  const { data } = await api.get("/admin/pricing/emi-types");
  return normalizeListResponse(data, "emi_types");
}

export async function getEmiType(id) {
  const { data } = await api.get(`/admin/pricing/emi-types/${id}`);
  return data?.data ?? data;
}

export async function createEmiType({ name, type, minLoanAmount, maxLoanAmount, allowedMerchantTiers, effectiveFrom }) {
  const { data } = await api.post("/admin/pricing/emi-types", {
    name,
    type,
    min_loan_amount: minLoanAmount,
    max_loan_amount: maxLoanAmount,
    allowed_merchant_tiers: allowedMerchantTiers,
    effective_from: effectiveFrom,
  });
  return data;
}

export async function updateEmiType(id, { name, type, minLoanAmount, maxLoanAmount }) {
  const { data } = await api.put(`/admin/pricing/emi-types/${id}`, {
    name,
    type,
    min_loan_amount: minLoanAmount,
    max_loan_amount: maxLoanAmount,
  });
  return data;
}

export async function deleteEmiType(id) {
  const { data } = await api.delete(`/admin/pricing/emi-types/${id}`);
  return data;
}

// ---------- Tenure Slabs ----------

export async function listTenureSlabs(emiTypeId) {
  const { data } = await api.get("/admin/pricing/tenure-slabs", {
    params: { emi_type_id: emiTypeId || undefined },
  });
  return normalizeListResponse(data, "slabs");
}

export async function createTenureSlab({ emiTypeId, tenureMonths, baseInterestRate, processingFeeType, processingFeeValue, processingFeeCap, tierOverrides }) {
  const { data } = await api.post("/admin/pricing/tenure-slabs", {
    emi_type_id: emiTypeId,
    tenure_months: tenureMonths,
    base_interest_rate: baseInterestRate,
    processing_fee_type: processingFeeType,
    processing_fee_value: processingFeeValue,
    processing_fee_cap: processingFeeCap,
    tier_overrides: tierOverrides,
  });
  return data;
}

/** Returns a Blob — caller is responsible for triggering the download. */
export async function exportTenureSlabsCsv() {
  const response = await api.get("/admin/pricing/tenure-slabs/export", { responseType: "blob" });
  return response.data;
}

export async function importTenureSlabsCsv(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/admin/pricing/tenure-slabs/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---------- Offers ----------

export async function listOffers({ status, merchantId } = {}) {
  const { data } = await api.get("/admin/offers", {
    params: { status: status || undefined, merchant_id: merchantId || undefined },
  });
  return normalizeListResponse(data, "offers");
}

export async function getOffer(id) {
  const { data } = await api.get(`/admin/offers/${id}`);
  return data?.data ?? data;
}

export async function createOffer({
  title, description, offerType, discountValue, scopeType,
  startDate, endDate, budgetCap, autoPause, isPlatformOffer,
}) {
  const { data } = await api.post("/admin/offers", {
    title,
    description,
    offer_type: offerType,
    discount_value: discountValue,
    scope_type: scopeType,
    start_date: startDate,
    end_date: endDate,
    budget_cap: budgetCap,
    auto_pause: autoPause,
    is_platform_offer: isPlatformOffer,
  });
  return data;
}

export async function updateOffer(id, { title }) {
  const { data } = await api.put(`/admin/offers/${id}`, { title });
  return data;
}

export async function deleteOffer(id) {
  const { data } = await api.delete(`/admin/offers/${id}`);
  return data;
}

export async function approveOffer(id) {
  const { data } = await api.post(`/admin/offers/${id}/approve`);
  return data;
}

export async function rejectOffer(id, reason) {
  const { data } = await api.post(`/admin/offers/${id}/reject`, { reason });
  return data;
}
