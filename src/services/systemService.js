import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * System module service layer.
 * Backend reference: FinZ LMS API — Phase13-System tag (feature flags,
 * workflows, integrations, system parameters).
 */

// ---------- Feature Flags ----------

export async function listFeatureFlags({ status, search } = {}) {
  const { data } = await api.get("/admin/feature-flags", {
    params: { status: status || undefined, search: search || undefined },
  });
  return normalizeListResponse(data, "flags");
}

export async function getFeatureFlag(key) {
  const { data } = await api.get(`/admin/feature-flags/${key}`);
  return data?.data ?? data;
}

export async function createFeatureFlag({ name, key, description, type = "boolean", defaultValue = false }) {
  const { data } = await api.post("/admin/feature-flags", {
    name, key, description, type, default_value: defaultValue,
  });
  return data;
}

export async function updateFeatureFlag(key, { rolloutStatus, rolloutPercent, cohortRules, description }) {
  const { data } = await api.put(`/admin/feature-flags/${key}`, {
    rollout_status: rolloutStatus,
    rollout_percent: rolloutPercent,
    cohort_rules: cohortRules,
    description,
  });
  return data;
}

export async function killFeatureFlag(key, reason) {
  const { data } = await api.post(`/admin/feature-flags/${key}/kill`, { reason });
  return data;
}

export async function createAbTest(key, payload) {
  const { data } = await api.post(`/admin/feature-flags/${key}/ab-test`, payload);
  return data;
}

export async function getAbTestResults(key) {
  const { data } = await api.get(`/admin/feature-flags/${key}/ab-test/results`);
  return data?.data ?? data;
}

// ---------- Workflows ----------

export async function listWorkflows({ status, type } = {}) {
  const { data } = await api.get("/admin/workflows", {
    params: { status: status || undefined, type: type || undefined },
  });
  return normalizeListResponse(data, "workflows");
}

export async function getWorkflowTemplates() {
  const { data } = await api.get("/admin/workflows/templates");
  return normalizeListResponse(data, "templates");
}

export async function getWorkflow(id) {
  const { data } = await api.get(`/admin/workflows/${id}`);
  return data?.data ?? data;
}

export async function createWorkflow({ name, workflowType, description, canvas }) {
  const { data } = await api.post("/admin/workflows", {
    name, workflow_type: workflowType, description, canvas,
  });
  return data;
}

export async function updateWorkflow(id, { name, description, canvas }) {
  const { data } = await api.put(`/admin/workflows/${id}`, { name, description, canvas });
  return data;
}

export async function publishWorkflow(id) {
  const { data } = await api.post(`/admin/workflows/${id}/publish`);
  return data;
}

export async function archiveWorkflow(id) {
  const { data } = await api.post(`/admin/workflows/${id}/archive`);
  return data;
}

export async function getWorkflowVersions(id) {
  const { data } = await api.get(`/admin/workflows/${id}/versions`);
  return normalizeListResponse(data, "versions");
}

// ---------- Integrations ----------

export async function listIntegrations() {
  const { data } = await api.get("/admin/integrations");
  return normalizeListResponse(data, "integrations");
}

export async function getIntegration(id) {
  const { data } = await api.get(`/admin/integrations/${id}`);
  return data?.data ?? data;
}

export async function updateIntegration(id, payload) {
  const { data } = await api.put(`/admin/integrations/${id}`, payload);
  return data;
}

export async function toggleIntegration(id) {
  const { data } = await api.post(`/admin/integrations/${id}/toggle`);
  return data;
}

export async function healthCheckIntegration(id) {
  const { data } = await api.post(`/admin/integrations/${id}/health-check`);
  return data;
}

export async function healthCheckAllIntegrations() {
  const { data } = await api.post("/admin/integrations/health-check-all");
  return data;
}

export async function setPrimaryIntegration(category, providerId) {
  const { data } = await api.put(`/admin/integrations/category/${category}/primary`, { provider_id: providerId });
  return data;
}

export async function getIntegrationsBillingSummary() {
  const { data } = await api.get("/admin/integrations/billing/summary");
  return data?.data ?? data;
}

// ---------- System Parameters ----------

export async function listSystemParameters() {
  const { data } = await api.get("/admin/system/parameters");
  return normalizeListResponse(data, "parameters");
}

export async function getSystemParameter(key) {
  const { data } = await api.get(`/admin/system/parameters/${key}`);
  return data?.data ?? data;
}

export async function updateSystemParameters(parameters) {
  const { data } = await api.put("/admin/system/parameters", { parameters });
  return data;
}

// ---------- Debug Logging (NEW endpoints) ----------

export async function getDebugLoggingStatus() {
  const { data } = await api.get("/admin/system/parameters/debug-logging");
  return data?.data ?? data;
}

export async function toggleDebugLogging(enabled) {
  const { data } = await api.put("/admin/system/parameters/debug-logging", { enabled });
  return data;
}

// ---------- Reset to Defaults (NEW endpoint) ----------

export async function resetSystemParameters() {
  const { data } = await api.post("/admin/system/parameters/reset");
  return data;
}

// ---------- Lender SLA additions (NEW endpoints) ----------

export async function getLenderSlaTrends() {
  const { data } = await api.get("/admin/lender-sla/trends");
  return data?.data ?? data;
}

export async function getLenderSlaBreakdown(lenderId) {
  const { data } = await api.get(`/admin/lender-sla/${lenderId}/breakdown`);
  return data?.data ?? data;
}

export async function getLenderSlaHistory(lenderId) {
  const { data } = await api.get(`/admin/lender-sla/${lenderId}/history`);
  return normalizeListResponse(data, "history");
}
