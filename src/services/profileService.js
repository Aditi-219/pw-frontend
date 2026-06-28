import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Profile, Notifications, and Global Search service layer.
 * Backend reference: FinZ LMS API — Auth (profile), Phase 1x notification tags, search.
 */

// ---------- Profile ----------

export async function getProfile() {
  const { data } = await api.get("/admin/profile");
  return data?.data ?? data?.user ?? data;
}

/**
 * Backend PUT /admin/profile only accepts { name, mobile } per the spec.
 * Email, timezone, theme, and notification-channel preferences are NOT
 * persisted by this endpoint — the page surfaces this as disabled fields.
 */
export async function updateProfile({ name, mobile }) {
  const { data } = await api.put("/admin/profile", { name, mobile });
  return data;
}

// ---------- Notifications ----------

export async function listNotifications({ tab } = {}) {
  const { data } = await api.get("/admin/notifications", {
    params: { tab: tab && tab !== "all" ? tab : undefined },
  });
  return normalizeListResponse(data, "notifications");
}

export async function markNotificationRead(id) {
  const { data } = await api.put(`/admin/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.put("/admin/notifications/read-all");
  return data;
}

export async function archiveNotification(id) {
  const { data } = await api.put(`/admin/notifications/${id}/archive`);
  return data;
}

export async function deleteNotification(id) {
  const { data } = await api.delete(`/admin/notifications/${id}`);
  return data;
}

export async function snoozeNotification(id, minutes = 60) {
  const { data } = await api.put(`/admin/notifications/${id}/snooze`, { minutes });
  return data;
}

// Bulk helpers: the API only exposes per-id read/archive/snooze plus a
// global read-all — there's no bulk-by-id-array endpoint, so these fan
// out into parallel individual requests.
export async function bulkMarkRead(ids) {
  return Promise.all(ids.map((id) => markNotificationRead(id)));
}

export async function bulkArchive(ids) {
  return Promise.all(ids.map((id) => archiveNotification(id)));
}

export async function bulkSnooze(ids, minutes = 60) {
  return Promise.all(ids.map((id) => snoozeNotification(id, minutes)));
}

// ---------- Global Search ----------

export async function globalSearch(q) {
  const { data } = await api.get("/admin/search", { params: { q } });
  return data?.data ?? data;
}

export async function getRecentSearches() {
  const { data } = await api.get("/admin/search/recent");
  return normalizeListResponse(data, "recent");
}

export async function saveSearch(query) {
  const { data } = await api.post("/admin/search/save", { query });
  return data;
}

export async function deleteSavedSearch(id) {
  const { data } = await api.delete(`/admin/search/saved/${id}`);
  return data;
}

// ---------- Dashboard ----------

export async function getDashboard() {
  const { data } = await api.get("/admin/dashboard");
  return data?.data ?? data;
}

export async function getActionTray() {
  const { data } = await api.get("/admin/dashboard/action-tray");
  return data?.data ?? data;
}

export async function getLiveStream() {
  const { data } = await api.get("/admin/dashboard/live-stream");
  return data?.data ?? data;
}

// ---------- System Health ----------

export async function getSystemHealth() {
  const { data } = await api.get("/admin/system-health");
  return data?.data ?? data;
}

export async function getApiStatus() {
  const { data } = await api.get("/admin/system-health/api-status");
  return data?.data ?? data;
}

export async function getErrorLogs() {
  const { data } = await api.get("/admin/system-health/error-logs");
  return normalizeListResponse(data, "logs");
}

export async function getIntegrationsHealth() {
  const { data } = await api.get("/admin/system-health/integrations");
  return normalizeListResponse(data, "integrations");
}

export async function getQueueDepth() {
  const { data } = await api.get("/admin/system-health/queue-depth");
  return data?.data ?? data;
}

export async function triggerMaintenance({ enabled, banner, endsAt } = {}) {
  // /admin/system/maintenance accepts enabled + banner + ends_at, which
  // matches what the System Health UI collects. /admin/system-health/maintenance
  // exists too but only accepts `enabled` — kept as toggleApiHealthMaintenance
  // below in case a future screen needs the lighter version.
  const { data } = await api.post("/admin/system/maintenance", {
    enabled,
    banner: banner || undefined,
    ends_at: endsAt || undefined,
  });
  return data;
}

export async function toggleApiHealthMaintenance(enabled) {
  const { data } = await api.post("/admin/system-health/maintenance", { enabled });
  return data;
}

// ---------- Self password change (NEW endpoint) ----------

export async function changeOwnPassword({ currentPassword, newPassword, newPasswordConfirmation }) {
  const { data } = await api.post("/admin/profile/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
    new_password_confirmation: newPasswordConfirmation,
  });
  return data;
}
