import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Lenders, Lender Rules, and Lender Waterfalls service layer.
 * Backend reference: FinZ LMS API — Lender, LenderRule, LenderWaterfall tags.
 *
 * KNOWN GAPS:
 *  - No SLA/latency/performance-monitoring endpoint exists — Lender SLA
 *    Monitor page cannot be backed beyond whatever volume/approval data
 *    listLenders() itself returns.
 *  - createLender/updateLender only accept { name, api_base_url, status } —
 *    no API key/secret, webhook URL, supported-categories, loan-amount
 *    range, or commission fields.
 */

// ---------- Lenders ----------

export async function listLenders() {
  const { data } = await api.get("/admin/lenders");
  return normalizeListResponse(data, "lenders");
}

export async function getLender(id) {
  const { data } = await api.get(`/admin/lenders/${id}`);
  return data?.data ?? data;
}

export async function createLender({ name, apiBaseUrl, status }) {
  const { data } = await api.post("/admin/lenders", { name, api_base_url: apiBaseUrl, status });
  return data;
}

export async function updateLender(id, { name, apiBaseUrl, status }) {
  const { data } = await api.put(`/admin/lenders/${id}`, { name, api_base_url: apiBaseUrl, status });
  return data;
}

export async function toggleLender(id) {
  const { data } = await api.post(`/admin/lenders/${id}/toggle`);
  return data;
}

export async function testLenderConnection(id) {
  const { data } = await api.post(`/admin/lenders/${id}/test-connection`);
  return data;
}

// ---------- Lender Rules ----------

export async function listLenderRules() {
  const { data } = await api.get("/admin/lender-rules");
  return normalizeListResponse(data, "rules");
}

export async function createLenderRule({ name, lenderId, conditions, status = "active" }) {
  const { data } = await api.post("/admin/lender-rules", { name, lender_id: lenderId, conditions, status });
  return data;
}

export async function updateLenderRule(id, { name, lenderId, conditions, status }) {
  const { data } = await api.put(`/admin/lender-rules/${id}`, { name, lender_id: lenderId, conditions, status });
  return data;
}

export async function archiveLenderRule(id) {
  const { data } = await api.post(`/admin/lender-rules/${id}/archive`);
  return data;
}

// ---------- Lender Waterfalls ----------

export async function listLenderWaterfalls() {
  const { data } = await api.get("/admin/lender-waterfalls");
  return normalizeListResponse(data, "waterfalls");
}

export async function createLenderWaterfall({ name, priorityOrder, isActive = true }) {
  const { data } = await api.post("/admin/lender-waterfalls", { name, priority_order: priorityOrder, is_active: isActive });
  return data;
}

export async function updateLenderWaterfall(id, { name, priorityOrder, isActive }) {
  const { data } = await api.put(`/admin/lender-waterfalls/${id}`, { name, priority_order: priorityOrder, is_active: isActive });
  return data;
}

export async function simulateLenderWaterfall(payload) {
  const { data } = await api.post("/admin/lender-waterfalls/simulate", { payload });
  return data;
}

// ---------- Lender SLA ----------

export async function getLenderSlaMetrics() {
  const { data } = await api.get("/admin/lender-sla/metrics");
  return data?.data ?? data;
}

/** Returns a Blob — caller is responsible for triggering the download. */
export async function exportLenderSlaMetrics() {
  const response = await api.get("/admin/lender-sla/export", { responseType: "blob" });
  return response.data;
}
