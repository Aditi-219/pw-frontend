import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Notification Templates + Communication Logs service layer.
 * Backend reference: FinZ LMS API — Phase12-Notifications, Phase12-Communications tags.
 */

// ---------- Templates ----------

export async function listTemplates({ channel, status, search } = {}) {
  const { data } = await api.get("/admin/templates", {
    params: { channel: channel || undefined, status: status || undefined, search: search || undefined },
  });
  return normalizeListResponse(data, "templates");
}

export async function getTemplateVariables() {
  const { data } = await api.get("/admin/templates/variables");
  return normalizeListResponse(data, "variables");
}

export async function getTemplate(id) {
  const { data } = await api.get(`/admin/templates/${id}`);
  return data?.data ?? data;
}

export async function createTemplate({ name, templateKey, channel, subject, body, variables, senderId, dltTemplateId, language = "en" }) {
  const { data } = await api.post("/admin/templates", {
    name, template_key: templateKey, channel, subject, body,
    variables, sender_id: senderId, dlt_template_id: dltTemplateId, language,
  });
  return data;
}

export async function updateTemplate(id, { name, subject, body, variables, senderId, dltTemplateId, language }) {
  const { data } = await api.put(`/admin/templates/${id}`, {
    name, subject, body, variables, sender_id: senderId, dlt_template_id: dltTemplateId, language,
  });
  return data;
}

export async function activateTemplate(id) {
  const { data } = await api.post(`/admin/templates/${id}/activate`);
  return data;
}

export async function archiveTemplate(id) {
  const { data } = await api.post(`/admin/templates/${id}/archive`);
  return data;
}

export async function testSendTemplate(id, to, variables) {
  const { data } = await api.post(`/admin/templates/${id}/test-send`, { to, variables });
  return data;
}

export async function getTemplateDiff(id, v1, v2) {
  const { data } = await api.get(`/admin/templates/${id}/diff/${v1}/${v2}`);
  return data?.data ?? data;
}

export async function rollbackTemplate(id, version) {
  const { data } = await api.post(`/admin/templates/${id}/rollback/${version}`);
  return data;
}

// ---------- Communication Logs ----------

export async function listCommunicationLogs({ channel, status, templateKey, recipient, provider, startDate, endDate, merchantId, perPage } = {}) {
  const { data } = await api.get("/admin/communication-logs", {
    params: {
      channel: channel || undefined,
      status: status || undefined,
      template_key: templateKey || undefined,
      recipient: recipient || undefined,
      provider: provider || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      merchant_id: merchantId || undefined,
      per_page: perPage,
    },
  });
  return normalizeListResponse(data, "logs");
}

export async function getCommunicationLog(id) {
  const { data } = await api.get(`/admin/communication-logs/${id}`);
  return data?.data ?? data;
}

export async function resendCommunicationLogs(logIds) {
  const { data } = await api.post("/admin/communication-logs/resend", { log_ids: logIds });
  return data;
}

export async function getCommunicationDailyTrend(period) {
  const { data } = await api.get("/admin/communication-logs/stats/daily-trend", { params: { period } });
  return data?.data ?? data;
}

export async function getCommunicationSummary(period) {
  const { data } = await api.get("/admin/communication-logs/stats/summary", { params: { period } });
  return data?.data ?? data;
}
