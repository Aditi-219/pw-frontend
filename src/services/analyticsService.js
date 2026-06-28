import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Analytics module service layer.
 * Backend reference: FinZ LMS API — Phase11-Analytics tag.
 */

export async function getBusinessAnalytics({ period, startDate, endDate } = {}) {
  const { data } = await api.get("/admin/analytics/business", {
    params: { period: period || undefined, start_date: startDate || undefined, end_date: endDate || undefined },
  });
  return data?.data ?? data;
}

export async function saveAnalyticsSnapshot() {
  const { data } = await api.post("/admin/analytics/business/snapshot");
  return data;
}

export async function listAnalyticsSnapshots() {
  const { data } = await api.get("/admin/analytics/business/snapshots");
  return normalizeListResponse(data, "snapshots");
}

export async function getLenderAnalytics({ period, lenderId } = {}) {
  const { data } = await api.get("/admin/analytics/lender", {
    params: { period: period || undefined, lender_id: lenderId || undefined },
  });
  return data?.data ?? data;
}

export async function exportLenderAnalytics(payload) {
  const response = await api.post("/admin/analytics/lender/export", payload, { responseType: "blob" });
  return response.data;
}

export async function getLenderScorecard(id) {
  const { data } = await api.get(`/admin/analytics/lender/${id}/scorecard`);
  return data?.data ?? data;
}

export async function getSalesAnalytics({ period, region, execId } = {}) {
  const { data } = await api.get("/admin/analytics/sales", {
    params: { period: period || undefined, region: region || undefined, exec_id: execId || undefined },
  });
  return data?.data ?? data;
}

export async function getExecutivePipeline(id) {
  const { data } = await api.get(`/admin/analytics/sales/exec/${id}/pipeline`);
  return data?.data ?? data;
}

export async function getRegionStoresDrilldown(state) {
  const { data } = await api.get(`/admin/analytics/sales/region/${state}/stores`);
  return normalizeListResponse(data, "stores");
}
