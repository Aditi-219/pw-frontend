import api from "./api";

/**
 * Users module service layer.
 * Backend reference: FinZ LMS API — "7. User Management" / Roles / Permissions / Sessions tags.
 *
 * NOTE ON PAGINATION: the OpenAPI spec does not document `page`/`per_page`/`search`
 * query params or a paginated response envelope for any list endpoint in this module.
 * We pass `page`, `per_page`, and `search` optimistically (common Laravel convention)
 * — the backend will simply ignore unknown query params if unsupported, and
 * normalizeListResponse() below falls back to treating the payload as a flat,
 * unpaginated array. Confirm with backend team if true server-side paging exists.
 */

// ---------- helpers ----------

/**
 * Normalizes the many shapes a Laravel-style API might return for a list:
 *  - { success, data: [...] }
 *  - { success, data: { data: [...], current_page, last_page, total, per_page } }  (Laravel paginator)
 *  - { success, users: [...] }  (resource-named key)
 *  - [...] (bare array)
 * Returns { items, page, totalPages, total, perPage }.
 */
export function normalizeListResponse(payload, resourceKey) {
  const root = payload?.data ?? payload;

  // Laravel-style paginator nested under data.data
  if (root && Array.isArray(root.data)) {
    return {
      items: root.data,
      page: root.current_page ?? 1,
      totalPages: root.last_page ?? 1,
      total: root.total ?? root.data.length,
      perPage: root.per_page ?? root.data.length,
    };
  }

  if (Array.isArray(root)) {
    return { items: root, page: 1, totalPages: 1, total: root.length, perPage: root.length };
  }

  if (resourceKey && Array.isArray(payload?.[resourceKey])) {
    const items = payload[resourceKey];
    return { items, page: 1, totalPages: 1, total: items.length, perPage: items.length };
  }

  // Last resort: nothing recognizable, don't crash the page
  return { items: [], page: 1, totalPages: 1, total: 0, perPage: 0 };
}

// ---------- Users ----------

export async function listUsers({ role, status, search, page, perPage } = {}) {
  const { data } = await api.get("/admin/users", {
    params: {
      role: role && role !== "all" ? role : undefined,
      status: status && status !== "all" ? status : undefined,
      search: search || undefined,
      page,
      per_page: perPage,
    },
  });
  return normalizeListResponse(data, "users");
}

export async function getUser(id) {
  const { data } = await api.get(`/admin/users/${id}`);
  return data?.data ?? data?.user ?? data;
}

export async function createUser({ name, email, mobile, role }) {
  const { data } = await api.post("/admin/users", { name, email, mobile, role });
  return data;
}

export async function updateUser(id, { name }) {
  const { data } = await api.put(`/admin/users/${id}`, { name });
  return data;
}

export async function disableUser(id, reason) {
  const { data } = await api.post(`/admin/users/${id}/disable`, { reason });
  return data;
}

export async function enableUser(id) {
  const { data } = await api.post(`/admin/users/${id}/enable`);
  return data;
}

export async function bulkDisableUsers(userIds, reason) {
  const { data } = await api.post("/admin/users/bulk-disable", { user_ids: userIds, reason });
  return data;
}

export async function forceMfa(id) {
  const { data } = await api.post(`/admin/users/${id}/force-mfa`);
  return data;
}

export async function requestPasswordResetCode(id, email) {
  const { data } = await api.post(`/admin/users/${id}/reset-password`, { email });
  return data;
}

export async function changeUserPassword(id, { verificationCode, newPassword, newPasswordConfirmation }) {
  const { data } = await api.put(`/admin/users/${id}/change-password`, {
    verification_code: verificationCode,
    new_password: newPassword,
    new_password_confirmation: newPasswordConfirmation,
  });
  return data;
}

export async function impersonateUser(id, reason) {
  const { data } = await api.post(`/admin/users/${id}/impersonate`, { reason });
  return data;
}

/** Returns a Blob — caller is responsible for triggering the download. */
export async function exportUsersCsv() {
  const response = await api.get("/admin/users/export/csv", { responseType: "blob" });
  return response.data;
}

// ---------- Roles ----------

export async function listRoles() {
  const { data } = await api.get("/admin/roles");
  return normalizeListResponse(data, "roles");
}

export async function getRole(id) {
  const { data } = await api.get(`/admin/roles/${id}`);
  return data?.data ?? data;
}

export async function createRole({ name, permissions }) {
  const { data } = await api.post("/admin/roles", { name, permissions });
  return data;
}

export async function renameRole(id, name) {
  const { data } = await api.put(`/admin/roles/${id}`, { name });
  return data;
}

export async function archiveRole(id) {
  const { data } = await api.delete(`/admin/roles/${id}`);
  return data;
}

export async function cloneRole(id, newName) {
  const { data } = await api.post(`/admin/roles/${id}/clone`, { new_name: newName });
  return data;
}

// ---------- Permissions ----------

export async function getPermissionsMatrix() {
  const { data } = await api.get("/admin/permissions");
  return data?.data ?? data;
}

export async function updateRolePermissions(roleId, permissions) {
  const { data } = await api.put(`/admin/permissions/roles/${roleId}`, { permissions });
  return data;
}

export async function compareRoles(roleId, compareId) {
  const { data } = await api.get(`/admin/permissions/roles/${roleId}/diff/${compareId}`);
  return data?.data ?? data;
}

export async function rollbackRolePermissions(roleId) {
  const { data } = await api.post(`/admin/permissions/roles/${roleId}/rollback`);
  return data;
}

// ---------- Sessions ----------

export async function listSessions({ suspicious } = {}) {
  const { data } = await api.get("/admin/sessions", {
    params: { suspicious: suspicious || undefined },
  });
  return normalizeListResponse(data, "sessions");
}

export async function listSuspiciousSessions() {
  const { data } = await api.get("/admin/sessions/suspicious");
  return normalizeListResponse(data, "sessions");
}

export async function revokeSession(id) {
  const { data } = await api.post(`/admin/sessions/${id}/revoke`);
  return data;
}

export async function revokeAllUserSessions(userId) {
  const { data } = await api.post(`/admin/sessions/users/${userId}/revoke-all`);
  return data;
}

export async function updateIpSessionRules({ role, allowlist, denylist, concurrentSessionLimit }) {
  const { data } = await api.put("/admin/sessions/ip-rules", {
    role,
    allowlist,
    denylist,
    concurrent_session_limit: concurrentSessionLimit,
  });
  return data;
}

// ---------- Bulk Session Revoke (NEW endpoint) ----------

export async function bulkRevokeSessions(sessionIds) {
  const { data } = await api.post("/admin/sessions/bulk-revoke", { session_ids: sessionIds });
  return data;
}
