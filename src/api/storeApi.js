import api from "./axios";
import { dispatchDataUpdate } from "./dataStore";

const list = (payload) => (Array.isArray(payload) ? payload : payload?.stores || payload?.data || []);

/**
 * 1. Fetch All Stores (with Filters & Pagination)
 * GET /api/admin/stores
 * Params: status (ACTIVE, INACTIVE, SUSPENDED), search, page, limit
 */
export const getAdminStores = async (params = {}) => {
  try {
    const response = await api.get("/admin/stores", { params });
    return response.data?.data !== undefined ? response.data : { success: true, data: list(response.data) };
  } catch (err) {
    try {
      const fallbackRes = await api.get("/stores", { params });
      return fallbackRes.data?.data !== undefined ? fallbackRes.data : { success: true, data: list(fallbackRes.data) };
    } catch {
      return { success: false, data: [] };
    }
  }
};

/**
 * List Stores (General / UI helper)
 * Primary: GET /api/admin/stores -> Fallback: GET /api/stores
 */
export const getStores = async (params = {}) => {
  try {
    const response = await api.get("/admin/stores", { params });
    const raw = list(response.data);
    if (raw && raw.length > 0) return raw;
  } catch {}
  try {
    const response = await api.get("/stores", { params });
    return list(response.data);
  } catch (err) {
    console.warn("Backend /stores fetch notice:", err?.message);
    return [];
  }
};

/**
 * 2. Get Store Profile Details
 * GET /api/stores/{slugOrId}
 */
export const getStoreById = async (slugOrId) => {
  try {
    const response = await api.get(`/stores/${slugOrId}`);
    return response.data?.data || response.data?.store || response.data;
  } catch (err) {
    console.warn(`Backend /stores/${slugOrId} fetch notice:`, err?.message);
    return null;
  }
};

/**
 * 2.1 Fetch Store Details of a Seller by Seller ID
 * Primary: GET /api/admin/sellers/{sellerId}/store
 * Alias: GET /api/admin/stores/seller/{sellerId}
 */
export const getStoreBySellerId = async (sellerId) => {
  try {
    const response = await api.get(`/admin/sellers/${sellerId}/store`);
    return response.data?.data || response.data?.store || response.data;
  } catch (err) {
    try {
      const aliasRes = await api.get(`/admin/stores/seller/${sellerId}`);
      return aliasRes.data?.data || aliasRes.data?.store || aliasRes.data;
    } catch (aliasErr) {
      console.warn(`Backend store fetch for seller ${sellerId} notice:`, aliasErr?.message);
      return null;
    }
  }
};

/**
 * 3. Get Store's Category & Subcategory tree with product counts
 * GET /api/stores/{slugOrId}/categories
 */
export const getStoreCategories = async (slugOrId) => {
  try {
    const response = await api.get(`/stores/${slugOrId}/categories`);
    return list(response.data);
  } catch (err) {
    console.warn(`Backend /stores/${slugOrId}/categories fetch notice:`, err?.message);
    return [];
  }
};

/**
 * 4. List products locked to a store
 * GET /api/stores/{slugOrId}/products
 */
export const getStoreProducts = async (slugOrId, params = {}) => {
  try {
    const response = await api.get(`/stores/${slugOrId}/products`, { params });
    return list(response.data);
  } catch (err) {
    console.warn(`Backend /stores/${slugOrId}/products fetch notice:`, err?.message);
    return [];
  }
};

/**
 * 5. Change Store Status (ACTIVE, SUSPENDED, CLOSED)
 * PATCH /api/admin/stores/{id}/status
 */
export const updateStoreStatus = async (id, { status = "ACTIVE", remarks = "" } = {}) => {
  try {
    const response = await api.patch(`/admin/stores/${id}/status`, { status, remarks });
    dispatchDataUpdate("stores", "STATUS_CHANGE", { id, status, remarks });
    return response.data?.data || response.data;
  } catch (err) {
    console.warn(`Backend /admin/stores/${id}/status update notice:`, err?.message);
    throw err;
  }
};

/**
 * 6. Get Seller's Own Store Profile
 * GET /api/seller/store
 */
export const getSellerStoreProfile = async () => {
  try {
    const response = await api.get("/seller/store");
    return response.data?.data || response.data?.store || response.data;
  } catch (err) {
    console.warn("Backend /seller/store fetch notice:", err?.message);
    return null;
  }
};

/**
 * 7. Update Seller Store Profile
 * PUT /api/seller/store
 * Body: { name, logoUrl, bannerUrl, description, minOrderValue, serviceRadiusKm }
 */
export const updateSellerStoreProfile = async (storeData = {}) => {
  try {
    const response = await api.put("/seller/store", storeData);
    dispatchDataUpdate("stores", "UPDATE_PROFILE", storeData);
    return response.data?.data || response.data;
  } catch (err) {
    console.warn("Backend PUT /seller/store notice:", err?.message);
    throw err;
  }
};

export default {
  getStores,
  getAdminStores,
  getStoreById,
  getStoreBySellerId,
  getStoreCategories,
  getStoreProducts,
  updateStoreStatus,
  getSellerStoreProfile,
  updateSellerStoreProfile,
};

