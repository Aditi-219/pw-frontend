import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Merchants module service layer.
 * Backend reference: FinZ LMS API — Merchant, MerchantAgreement,
 * MerchantCategory, VerificationLog tags.
 *
 * KNOWN GAPS (see module integration notes for full detail):
 *  - No agreement list/preview/send-eSign endpoints — only "generate".
 *  - No "reactivate merchant" or "approve changes" endpoint.
 *  - No bulk re-KYC by region/filter — only by explicit merchant_ids array.
 *  - verification-logs and agreement generation are merchant-scoped
 *    (require a merchant id); there's no cross-merchant/global log feed.
 */

// ---------- Merchant Directory ----------

export async function listMerchants({ status, region, category, salesExecId, signupDate, page, search } = {}) {
  const { data } = await api.get("/admin/merchants", {
    params: {
      status: status && status !== "All" ? status : undefined,
      region: region || undefined,
      category: category || undefined,
      sales_exec_id: salesExecId || undefined,
      signup_date: signupDate || undefined,
      page,
      search: search || undefined,
    },
  });
  return normalizeListResponse(data, "merchants");
}

export async function getMerchant(id) {
  const { data } = await api.get(`/admin/merchants/${id}`);
  return data?.data ?? data?.merchant ?? data;
}

export async function approveMerchant(id, comment) {
  const { data } = await api.post(`/admin/merchants/${id}/approve`, { comment });
  return data;
}

export async function rejectMerchant(id, reason) {
  const { data } = await api.post(`/admin/merchants/${id}/reject`, { reason });
  return data;
}

export async function reKycMerchant(id, reason) {
  const { data } = await api.post(`/admin/merchants/${id}/re-kyc`, { reason });
  return data;
}

export async function suspendMerchant(id, reasonCode) {
  const { data } = await api.post(`/admin/merchants/${id}/suspend`, { reason_code: reasonCode });
  return data;
}

export async function escalateMerchant(id, escalationReason) {
  const { data } = await api.post(`/admin/merchants/${id}/escalate`, { escalation_reason: escalationReason });
  return data;
}

export async function sendMerchantNotice(id, noticeText) {
  const { data } = await api.post(`/admin/merchants/${id}/send-notice`, { notice_text: noticeText });
  return data;
}

export async function generateMerchantAgreement(id) {
  const { data } = await api.post(`/admin/merchants/${id}/agreement`);
  return data;
}

export async function bulkApproveMerchants(merchantIds, comment) {
  const { data } = await api.post("/admin/merchants/bulk-approve", { merchant_ids: merchantIds, comment });
  return data;
}

export async function bulkRejectMerchants(merchantIds, reason) {
  const { data } = await api.post("/admin/merchants/bulk-reject", { merchant_ids: merchantIds, reason });
  return data;
}

export async function bulkReKycMerchants(merchantIds, reason) {
  const { data } = await api.post("/admin/merchants/bulk-re-kyc", { merchant_ids: merchantIds, reason });
  return data;
}

/** Returns a Blob — caller is responsible for triggering the download. */
export async function exportMerchantsCsv() {
  const response = await api.get("/admin/merchants/export", { responseType: "blob" });
  return response.data;
}

// ---------- Verification Logs (merchant-scoped) ----------

export async function listVerificationLogs(merchantId, { apiType } = {}) {
  const { data } = await api.get(`/admin/merchants/${merchantId}/verification-logs`, {
    params: { api_type: apiType || undefined },
  });
  return normalizeListResponse(data, "logs");
}

export async function retryVerificationLog(merchantId, logId) {
  const { data } = await api.post(`/admin/merchants/${merchantId}/verification-logs/${logId}/retry`);
  return data;
}

// ---------- Merchant Categories ----------

export async function mapMerchantCategory(id, mappedCategoryId) {
  const { data } = await api.post(`/admin/merchant-categories/${id}/map`, { mapped_category_id: mappedCategoryId });
  return data;
}

// ---------- Merchant Notes (NEW endpoints) ----------

export async function getMerchantNotes(id) {
  const { data } = await api.get(`/admin/merchants/${id}/notes`);
  return normalizeListResponse(data, "notes");
}

export async function addMerchantNote(id, note) {
  const { data } = await api.post(`/admin/merchants/${id}/notes`, { note });
  return data;
}

export async function addEphemeralNote(id, note) {
  const { data } = await api.post(`/admin/merchants/${id}/ephemeral-notes`, { note });
  return data;
}

// ---------- Merchant Reactivate (NEW endpoint) ----------

export async function reactivateMerchant(id) {
  const { data } = await api.post(`/admin/merchants/${id}/reactivate`);
  return data;
}

// ---------- Merchant Approve Changes (NEW endpoint) ----------

export async function approveMerchantChanges(id) {
  const { data } = await api.post(`/admin/merchants/${id}/approve-changes`);
  return data;
}

// ---------- Merchant Documents (NEW endpoint) ----------

export async function getMerchantDocuments(id) {
  const { data } = await api.get(`/admin/merchants/${id}/documents`);
  return normalizeListResponse(data, "documents");
}

export async function viewMerchantDocument(id, documentId) {
  const { data } = await api.get(`/admin/merchants/${id}/documents/${documentId}/view`);
  return data?.data ?? data;
}

// ---------- Merchant Agreements (NEW endpoints) ----------

export async function listMerchantAgreements(id) {
  const { data } = await api.get(`/admin/merchants/${id}/agreements`);
  return normalizeListResponse(data, "agreements");
}

export async function previewMerchantAgreement(id, agreementId) {
  const response = await api.get(`/admin/merchants/${id}/agreements/${agreementId}/preview`, { responseType: "blob" });
  return response.data;
}

export async function getAgreementEsignStatus(id, agreementId) {
  const { data } = await api.get(`/admin/merchants/${id}/agreements/${agreementId}/esign-status`);
  return data?.data ?? data;
}

// ---------- Verification Provider Switch (NEW endpoint) ----------

export async function switchVerificationProvider({ provider, callType }) {
  const { data } = await api.post("/admin/verifications/provider-switch", {
    provider,
    call_type: callType,
  });
  return data;
}
