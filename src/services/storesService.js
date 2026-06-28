import api from "./api";
import { normalizeListResponse } from "./usersService";

/**
 * Stores module service layer.
 * Backend reference: FinZ LMS API — Store tag.
 *
 * KNOWN GAP: there's no endpoint for store-scoped loan applications or
 * inventory snapshots — only directory/detail/deactivate/export.
 */

export async function listStores({ cluster, region, status } = {}) {
  const { data } = await api.get("/admin/stores", {
    params: {
      cluster: cluster || undefined,
      region: region || undefined,
      status: status && status !== "All" ? status : undefined,
    },
  });
  return normalizeListResponse(data, "stores");
}

export async function getStore(id) {
  const { data } = await api.get(`/admin/stores/${id}`);
  return data?.data ?? data;
}

export async function deactivateStore(id, reason) {
  const { data } = await api.post(`/admin/stores/${id}/deactivate`, { reason });
  return data;
}

/** Returns a Blob — caller is responsible for triggering the download. */
export async function exportStoresCsv() {
  const response = await api.get("/admin/stores/export", { responseType: "blob" });
  return response.data;
}

export async function getStoreLinkedProducts(id) {
  const { data } = await api.get(`/admin/stores/${id}/linked-products`);
  return normalizeListResponse(data, "products");
}

export async function getStoreLoanApplications(id) {
  const { data } = await api.get(`/admin/stores/${id}/loan-applications`);
  return normalizeListResponse(data, "applications");
}
