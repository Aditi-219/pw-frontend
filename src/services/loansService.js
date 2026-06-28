import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Loans module service layer.
 * Backend reference: FinZ LMS API — LoanApplication, ManualOverride tags.
 * All endpoints in this file are NEW in the latest spec (were missing before).
 */

// ---------- Loan Applications ----------

export async function listLoans({ merchant, store, lender, status, dateFrom, dateTo, amountMin, amountMax, search, page } = {}) {
  const { data } = await api.get("/admin/loans", {
    params: {
      merchant_id: merchant || undefined,
      store_id: store || undefined,
      lender_id: lender || undefined,
      status: status && status !== "all" ? status : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      amount_min: amountMin || undefined,
      amount_max: amountMax || undefined,
      search: search || undefined,
      page,
    },
  });
  return normalizeListResponse(data, "loans");
}

export async function getLoan(id) {
  const { data } = await api.get(`/admin/loans/${id}`);
  return data?.data ?? data;
}

export async function getLoanTimeline(id) {
  const { data } = await api.get(`/admin/loans/${id}/timeline`);
  return normalizeListResponse(data, "events");
}

export async function getLoanDocuments(id) {
  const { data } = await api.get(`/admin/loans/${id}/documents`);
  return normalizeListResponse(data, "documents");
}

export async function getLoanCommunications(id) {
  const { data } = await api.get(`/admin/loans/${id}/communications`);
  return normalizeListResponse(data, "communications");
}

/** Returns a Blob for download. */
export async function exportLoans() {
  const response = await api.get("/admin/loans/export", { responseType: "blob" });
  return response.data;
}

export async function getSavedFilters() {
  const { data } = await api.get("/admin/loans/saved-filters");
  return normalizeListResponse(data, "filters");
}

export async function saveFilter({ name, filterPayload }) {
  const { data } = await api.post("/admin/loans/saved-filters", { name, filter_payload: filterPayload });
  return data;
}

// ---------- Manual Overrides ----------

export async function forceApproveLoan(id, { reason, approvedBySecondary }) {
  const { data } = await api.post(`/admin/loans/overrides/${id}/force-approve`, {
    reason,
    approved_by_secondary: approvedBySecondary,
  });
  return data;
}

export async function overrideLoanRejection(id, { newLenderId, reason }) {
  const { data } = await api.post(`/admin/loans/overrides/${id}/override-rejection`, {
    new_lender_id: newLenderId,
    reason,
  });
  return data;
}

export async function refundLoan(id, { reason, financeApprovedBy }) {
  const { data } = await api.post(`/admin/loans/overrides/${id}/refund`, {
    reason,
    finance_approved_by: financeApprovedBy,
  });
  return data;
}

export async function triggerManualDisbursal(id, { bankAccountVerified, reason }) {
  const { data } = await api.post(`/admin/loans/overrides/${id}/trigger-disbursal`, {
    bank_account_verified: bankAccountVerified,
    reason,
  });
  return data;
}

// ---------- Disbursals & Settlements ----------

export async function listPendingDisbursals() {
  const { data } = await api.get("/admin/disbursals/pending");
  return normalizeListResponse(data, "disbursals");
}

export async function triggerBatchDisbursal(lenderId) {
  const { data } = await api.post("/admin/disbursals/trigger-batch", { lender_id: lenderId });
  return data;
}

export async function listSettlementBatches() {
  const { data } = await api.get("/admin/settlements/batches");
  return normalizeListResponse(data, "batches");
}

export async function getSettlementEntries(batchId) {
  const { data } = await api.get(`/admin/settlements/batches/${batchId}/entries`);
  return normalizeListResponse(data, "entries");
}

/** Returns a Blob for download. */
export async function downloadSettlementBatch(batchId) {
  const response = await api.get(`/admin/settlements/batches/${batchId}/download`, { responseType: "blob" });
  return response.data;
}

export async function disputeSettlementEntry(entryId, reason) {
  const { data } = await api.post(`/admin/settlements/entries/${entryId}/dispute`, { reason });
  return data;
}

// ---------- Collections & Bounce ----------

export async function listCollections() {
  const { data } = await api.get("/admin/collections");
  return normalizeListResponse(data, "collections");
}

export async function listBounces() {
  const { data } = await api.get("/admin/collections/bounces");
  return normalizeListResponse(data, "bounces");
}

export async function retryBounce(id) {
  const { data } = await api.post(`/admin/collections/bounces/${id}/retry`);
  return data;
}

export async function assignCollectionAgent(id, agentId) {
  const { data } = await api.post(`/admin/collections/${id}/assign-agent`, { agent_id: agentId });
  return data;
}

export async function setNpaStatus(id, npaStatus) {
  const { data } = await api.post(`/admin/collections/${id}/npa-status`, { npa_status: npaStatus });
  return data;
}
