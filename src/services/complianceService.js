import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Compliance module service layer.
 * Updated with all newly added endpoints from the latest spec.
 */

// ---------- Reports (custom report builder) ----------

export async function listCustomReports() {
  const { data } = await api.get("/admin/reports/custom");
  return normalizeListResponse(data, "reports");
}

export async function getCustomReportSchema() {
  const { data } = await api.get("/admin/reports/custom/schema");
  return data?.data ?? data;
}

export async function runCustomReport(definition) {
  const { data } = await api.post("/admin/reports/custom", definition);
  return data;
}

export async function saveCustomReport({ name, definition, chartType = "table", isShared = false }) {
  const { data } = await api.post("/admin/reports/custom/save", {
    name, definition, chart_type: chartType, is_shared: isShared,
  });
  return data;
}

export async function updateCustomReport(id, { name, definition, chartType, isShared }) {
  const { data } = await api.put(`/admin/reports/custom/${id}`, {
    name, definition, chart_type: chartType, is_shared: isShared,
  });
  return data;
}

export async function deleteCustomReport(id) {
  const { data } = await api.delete(`/admin/reports/custom/${id}`);
  return data;
}

/** Returns a Blob — caller is responsible for triggering the download. */
export async function exportCustomReport(id, format = "csv") {
  const response = await api.post(`/admin/reports/custom/${id}/export`, { format }, { responseType: "blob" });
  return response.data;
}

export async function scheduleCustomReport(id, { frequency, recipients, format = "csv", time }) {
  const { data } = await api.post(`/admin/reports/custom/${id}/schedule`, {
    frequency, recipients, format, time,
  });
  return data;
}

export async function getCustomReportHistory(id) {
  const { data } = await api.get(`/admin/reports/custom/${id}/history`);
  return normalizeListResponse(data, "history");
}

// ---------- Audit Trail (NOW real general audit, not just parameters) ----------

export async function getAuditTrail({ user, role, module, action, dateFrom, dateTo, ip, search } = {}) {
  const { data } = await api.get("/admin/audit-trails", {
    params: {
      user_id: user || undefined,
      role: role || undefined,
      module: module || undefined,
      action: action || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      ip: ip || undefined,
      search: search || undefined,
    },
  });
  return normalizeListResponse(data, "audit");
}

export async function getAuditAnomalies() {
  const { data } = await api.get("/admin/audit-trails/anomalies");
  return normalizeListResponse(data, "anomalies");
}

/** Returns a Blob — caller is responsible for triggering the download. */
export async function exportAuditTrail() {
  const response = await api.get("/admin/audit-trails/export", { responseType: "blob" });
  return response.data;
}

export async function verifyAuditHashChain() {
  const { data } = await api.post("/admin/audit-trails/verify-hash");
  return data;
}

// ---------- Consent Logs (NOW real endpoint) ----------

export async function listConsentLogs() {
  const { data } = await api.get("/admin/consents");
  return normalizeListResponse(data, "consents");
}

/** Returns a Blob. */
export async function exportConsentLogs() {
  const response = await api.get("/admin/consents/export", { responseType: "blob" });
  return response.data;
}

export async function diffConsentVersions(id, compareId) {
  const { data } = await api.get(`/admin/consents/${id}/diff/${compareId}`);
  return data?.data ?? data;
}

export async function withdrawConsent(id, reason) {
  const { data } = await api.post(`/admin/consents/${id}/withdraw`, { reason });
  return data;
}

// ---------- Compliance Dashboard, DPDP, Data Masking, Retention ----------

export async function getComplianceDashboard() {
  const { data } = await api.get("/admin/compliance/dashboard");
  return data?.data ?? data;
}

export async function getDataMaskingPolicy() {
  const { data } = await api.get("/admin/compliance/data-masking-policy");
  return data?.data ?? data;
}

export async function updateDataMaskingPolicy(policies) {
  const { data } = await api.post("/admin/compliance/data-masking-policy", { policies });
  return data;
}

export async function getRetentionPolicy() {
  const { data } = await api.get("/admin/compliance/retention-policy");
  return data?.data ?? data;
}

export async function updateRetentionPolicy(policies) {
  const { data } = await api.post("/admin/compliance/retention-policy", { policies });
  return data;
}

export async function listDpdpRequests() {
  const { data } = await api.get("/admin/compliance/dpdp-requests");
  return normalizeListResponse(data, "requests");
}

export async function resolveDpdpRequest(id, { status, resolutionNotes }) {
  const { data } = await api.post(`/admin/compliance/dpdp-requests/${id}/resolve`, {
    status,
    resolution_notes: resolutionNotes,
  });
  return data;
}

export async function generateComplianceReturn(reportType) {
  const { data } = await api.post("/admin/compliance/returns", { report_type: reportType });
  return data;
}

// ---------- Narrow audit endpoints (kept for backward compat) ----------

export async function getSystemParameterAudit({ key, startDate, endDate } = {}) {
  const { data } = await api.get("/admin/system/parameters/audit", {
    params: { key: key || undefined, start_date: startDate || undefined, end_date: endDate || undefined },
  });
  return normalizeListResponse(data, "audit");
}

export async function getFeatureFlagAudit(key) {
  const { data } = await api.get(`/admin/feature-flags/${key}/audit`);
  return normalizeListResponse(data, "audit");
}

// ---------- Documents ----------

export async function listDocuments({ type, entityType, entityId, search, startDate, endDate, status } = {}) {
  const { data } = await api.get("/admin/documents", {
    params: {
      type: type || undefined, entity_type: entityType || undefined,
      entity_id: entityId || undefined, search: search || undefined,
      start_date: startDate || undefined, end_date: endDate || undefined,
      status: status || undefined,
    },
  });
  return normalizeListResponse(data, "documents");
}

export async function getDocumentStats() {
  const { data } = await api.get("/admin/documents/stats");
  return data?.data ?? data;
}

export async function getDocument(id) {
  const { data } = await api.get(`/admin/documents/${id}`);
  return data?.data ?? data;
}

export async function deleteDocument(id) {
  const { data } = await api.delete(`/admin/documents/${id}`);
  return data;
}

export async function rerunDocumentOcr(id) {
  const { data } = await api.post(`/admin/documents/${id}/ocr-rerun`);
  return data;
}

export async function previewDocument(id, redactSensitive = true) {
  const { data } = await api.get(`/admin/documents/${id}/preview`, {
    params: { redact_sensitive: redactSensitive },
  });
  return data?.data ?? data;
}

export async function updateDocumentRetention(id, retentionUntil) {
  const { data } = await api.put(`/admin/documents/${id}/retention`, { retention_until: retentionUntil });
  return data;
}

export async function shareDocument(id, { expiryMinutes = 60, purpose }) {
  const { data } = await api.post(`/admin/documents/${id}/share`, { expiry_minutes: expiryMinutes, purpose });
  return data;
}

export async function uploadDocument(formData) {
  const { data } = await api.post("/admin/documents", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}


/**
 * Compliance module service layer.
 * Backend reference: FinZ LMS API — Phase11-Reports, Phase12-Documents tags,
 * plus the narrow system/parameters audit endpoint.
 *
 * KNOWN GAPS:
 *  - No general-purpose audit-trail endpoint exists. Only two narrow audit
 *    logs are available: feature-flag audit (per key) and system-parameter
 *    audit (date-rangeable) — the latter is used as the closest available
 *    source for the Audit Trail Explorer page, but it only reflects
 *    system-parameter changes, not all admin actions.
 *  - No consent-record endpoint exists anywhere in the API — Consent Log
 *    Viewer can't be backed at all.
 */

