import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Support / Tickets module service layer.
 * Backend reference: FinZ LMS API — Tickets tag.
 *
 * KNOWN GAP: there's no ticket-creation endpoint exposed to admins
 * (only list/update/messages/resolve/escalate/bulk/sla/stats) — the
 * "+ Create Ticket" button is disabled and flagged in the UI.
 */

export async function listTickets({ sourceRole, category, priority, status, slaState, search } = {}) {
  const { data } = await api.get("/admin/tickets", {
    params: {
      source_role: sourceRole || undefined,
      category: category || undefined,
      priority: priority || undefined,
      status: status && status !== "all" ? status : undefined,
      sla_state: slaState || undefined,
      search: search || undefined,
    },
  });
  return normalizeListResponse(data, "tickets");
}

export async function getTicketStats() {
  const { data } = await api.get("/admin/tickets/stats");
  return data?.data ?? data;
}

export async function getTicket(id) {
  const { data } = await api.get(`/admin/tickets/${id}`);
  return data?.data ?? data;
}

export async function updateTicket(id, { status, priority, category, assignedTo }) {
  const { data } = await api.put(`/admin/tickets/${id}`, {
    status, priority, category, assigned_to: assignedTo,
  });
  return data;
}

export async function escalateTicket(id, escalateTo, reason) {
  const { data } = await api.post(`/admin/tickets/${id}/escalate`, { escalate_to: escalateTo, reason });
  return data;
}

export async function addTicketMessage(id, body, visibility = "public") {
  const { data } = await api.post(`/admin/tickets/${id}/messages`, { body, visibility });
  return data;
}

export async function resolveTicket(id, { resolutionCategory, resolutionNote, triggerCsat, csatScore, csatComment }) {
  const { data } = await api.post(`/admin/tickets/${id}/resolve`, {
    resolution_category: resolutionCategory,
    resolution_note: resolutionNote,
    trigger_csat: triggerCsat,
    csat_score: csatScore,
    csat_comment: csatComment,
  });
  return data;
}

export async function reassignTicket(id, assigneeId) {
  const { data } = await api.post(`/admin/tickets/${id}/reassign`, { assignee_id: assigneeId });
  return data;
}

export async function getTicketSla(id) {
  const { data } = await api.get(`/admin/tickets/${id}/sla`);
  return data?.data ?? data;
}

export async function bulkTicketAction({ action, ticketIds, assigneeId, escalateTo, note }) {
  const { data } = await api.post("/admin/tickets/bulk", {
    action, ticket_ids: ticketIds, assignee_id: assigneeId, escalate_to: escalateTo, note,
  });
  return data;
}

// ---------- Create Ticket (NEW endpoint) ----------

export async function createTicket({ subject, description, priority, category, linkedEntityType, linkedEntityId }) {
  const { data } = await api.post("/admin/tickets", {
    subject, description, priority, category,
    linked_entity_type: linkedEntityType,
    linked_entity_id: linkedEntityId,
  });
  return data;
}
