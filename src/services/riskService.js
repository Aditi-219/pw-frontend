import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Risk & Fraud module service layer.
 * Backend reference: FinZ LMS API — FraudAlert, Blacklist, RiskRule, ManualReview tags.
 * All endpoints in this file are NEW in the latest spec.
 */

// ---------- Fraud Alerts ----------

export async function listFraudAlerts() {
  const { data } = await api.get("/admin/fraud-alerts");
  return normalizeListResponse(data, "alerts");
}

export async function getFraudHeatmap() {
  const { data } = await api.get("/admin/fraud-alerts/stats/heatmap");
  return data?.data ?? data;
}

export async function blockFraudAlert(id) {
  const { data } = await api.post(`/admin/fraud-alerts/${id}/block`);
  return data;
}

export async function unblockFraudAlert(id) {
  const { data } = await api.post(`/admin/fraud-alerts/${id}/unblock`);
  return data;
}

export async function escalateFraudAlert(id) {
  const { data } = await api.post(`/admin/fraud-alerts/${id}/escalate`);
  return data;
}

// ---------- Blacklist ----------

export async function listBlacklist() {
  const { data } = await api.get("/admin/blacklist");
  return normalizeListResponse(data, "entries");
}

export async function addToBlacklist({ category, value, reason, severity }) {
  const { data } = await api.post("/admin/blacklist", { category, value, reason, severity });
  return data;
}

export async function removeFromBlacklist(id, reason) {
  const { data } = await api.post(`/admin/blacklist/${id}/remove`, { reason });
  return data;
}

export async function whitelistOverride(id, { overrideApprovedBy, reason }) {
  const { data } = await api.post(`/admin/blacklist/${id}/whitelist-override`, {
    override_approved_by: overrideApprovedBy,
    reason,
  });
  return data;
}

export async function bulkImportBlacklist(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post("/admin/blacklist/bulk-import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ---------- Risk Rules ----------

export async function listRiskRules() {
  const { data } = await api.get("/admin/risk-rules");
  return normalizeListResponse(data, "rules");
}

export async function createRiskRule({ ruleType, name, parameters, threshold, action }) {
  const { data } = await api.post("/admin/risk-rules", {
    rule_type: ruleType,
    name,
    parameters,
    threshold,
    action,
  });
  return data;
}

export async function updateRiskRule(id, { threshold }) {
  const { data } = await api.put(`/admin/risk-rules/${id}`, { threshold });
  return data;
}

export async function simulateRiskRule({ ruleId, datasetDays }) {
  const { data } = await api.post("/admin/risk-rules/simulate", {
    rule_id: ruleId,
    dataset_days: datasetDays,
  });
  return data;
}

// ---------- Manual Review Queue ----------

export async function listManualReviews() {
  const { data } = await api.get("/admin/manual-reviews");
  return normalizeListResponse(data, "reviews");
}

export async function getManualReview(id) {
  const { data } = await api.get(`/admin/manual-reviews/${id}`);
  return data?.data ?? data;
}

export async function decideManualReview(id, decision) {
  const { data } = await api.post(`/admin/manual-reviews/${id}/decide`, { decision });
  return data;
}

export async function getReviewerScorecard(reviewerId) {
  const { data } = await api.get(`/admin/manual-reviews/scorecard/${reviewerId}`);
  return data?.data ?? data;
}
