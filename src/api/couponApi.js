import api from "./axios";
import { dispatchDataUpdate } from "./dataStore";

const STORAGE_KEY_COUPONS = "hinchmart_admin_coupons_cache_v1";

/**
 * Helper to get locally cached coupons for fallback/offline simulation
 */
export const getStoredCoupons = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_COUPONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

export const saveStoredCoupons = (coupons) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_COUPONS, JSON.stringify(coupons));
    } catch {}
  }
};

/**
 * Normalizes coupon payload to adhere strictly to backend validation rules:
 * 1. maxDiscountAmount must NOT be present when discountType is FIXED_AMOUNT
 * 2. code is uppercase trimmed
 * 3. numbers are properly parsed
 */
export const sanitizeCouponPayload = (formData = {}) => {
  const discountType = (formData.discountType || "PERCENTAGE").toUpperCase();
  const isPercentage = discountType === "PERCENTAGE";

  const payload = {
    code: String(formData.code || "").trim().toUpperCase(),
    title: String(formData.title || "").trim(),
    description: formData.description ? String(formData.description).trim() : undefined,
    discountType,
    discountValue: Number(formData.discountValue || 0),
    minOrderAmount: formData.minOrderAmount !== undefined && formData.minOrderAmount !== "" ? Number(formData.minOrderAmount) : 0,
    perUserLimit: formData.perUserLimit !== undefined && formData.perUserLimit !== "" ? Number(formData.perUserLimit) : 1,
    firstOrderOnly: Boolean(formData.firstOrderOnly),
    isActive: formData.isActive !== undefined ? Boolean(formData.isActive) : true,
  };

  // Rule: maxDiscountAmount must ONLY be sent for PERCENTAGE type
  if (isPercentage && formData.maxDiscountAmount !== undefined && formData.maxDiscountAmount !== "" && Number(formData.maxDiscountAmount) > 0) {
    payload.maxDiscountAmount = Number(formData.maxDiscountAmount);
  }

  // totalUsageLimit
  if (formData.totalUsageLimit !== undefined && formData.totalUsageLimit !== "" && Number(formData.totalUsageLimit) > 0) {
    payload.totalUsageLimit = Number(formData.totalUsageLimit);
  }

  // Dates in ISO 8601
  if (formData.startDate) {
    payload.startDate = new Date(formData.startDate).toISOString();
  }
  if (formData.expiryDate) {
    payload.expiryDate = new Date(formData.expiryDate).toISOString();
  }

  return payload;
};

/**
 * Helper to extract list from backend pagination envelope
 */
const extractList = (response) => {
  if (!response) return [];
  const body = response.data !== undefined ? response.data : response;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.content)) return body.content;
  if (Array.isArray(body?.data?.content)) return body.data.content;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.coupons)) return body.coupons;
  return [];
};

/**
 * 1. Create Coupon
 * POST /api/admin/coupons
 */
export const createCoupon = async (couponData) => {
  const payload = sanitizeCouponPayload(couponData);

  // Client-side pre-validations
  if (!payload.code) throw new Error("Coupon code is required");
  if (!payload.title) throw new Error("Coupon title is required");
  if (payload.discountType === "PERCENTAGE" && (payload.discountValue <= 0 || payload.discountValue > 100)) {
    throw new Error("Percentage discount must be between 1% and 100%");
  }
  if (payload.discountType === "FIXED_AMOUNT" && payload.discountValue <= 0) {
    throw new Error("Fixed discount amount must be greater than 0");
  }
  if (payload.startDate && payload.expiryDate && new Date(payload.expiryDate) <= new Date(payload.startDate)) {
    throw new Error("Expiry date must be after start date");
  }

  try {
    const res = await api.post("/admin/coupons", payload);
    const created = res.data?.data || res.data?.coupon || res.data;
    if (created) {
      const stored = getStoredCoupons();
      saveStoredCoupons([created, ...stored.filter((c) => c.id !== created.id)]);
      dispatchDataUpdate("coupons", "CREATE", created);
      return created;
    }
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    throw new Error(message || "Failed to create coupon on backend");
  }
};

/**
 * 2. List All Coupons (with Filters & Pagination)
 * GET /api/admin/coupons
 * Params: active (boolean), search (string), page (int), size (int)
 */
export const getCoupons = async (params = {}) => {
  const queryParams = {};
  if (params.active !== undefined && params.active !== "ALL" && params.active !== null) {
    queryParams.active = params.active === true || params.active === "true";
  }
  if (params.search) {
    queryParams.search = params.search.trim();
  }
  if (params.page !== undefined) queryParams.page = Number(params.page);
  if (params.size !== undefined) queryParams.size = Number(params.size);

  try {
    const res = await api.get("/admin/coupons", { params: queryParams });
    const content = extractList(res);
    const meta = {
      totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? content.length,
      totalPages: res.data?.data?.totalPages ?? res.data?.totalPages ?? 1,
      size: res.data?.data?.size ?? res.data?.size ?? 20,
      number: res.data?.data?.number ?? res.data?.number ?? 0,
    };

    if (content.length > 0) {
      saveStoredCoupons(content);
    }
    return { content, meta };
  } catch (err) {
    console.warn("Backend GET /admin/coupons notice:", err?.message);
    const cached = getStoredCoupons();
    return { content: cached, meta: { totalElements: cached.length, totalPages: 1, size: 20, number: 0 } };
  }
};

/**
 * 3. Get Coupon by ID
 * GET /api/admin/coupons/{id}
 */
export const getCouponById = async (id) => {
  try {
    const res = await api.get(`/admin/coupons/${id}`);
    return res.data?.data || res.data?.coupon || res.data;
  } catch (err) {
    console.warn(`Backend GET /admin/coupons/${id} notice:`, err?.message);
    const cached = getStoredCoupons();
    return cached.find((c) => String(c.id) === String(id)) || null;
  }
};

/**
 * 4. Update Coupon
 * PUT /api/admin/coupons/{id}
 */
export const updateCoupon = async (id, couponData) => {
  const payload = sanitizeCouponPayload(couponData);

  try {
    const res = await api.put(`/admin/coupons/${id}`, payload);
    const updated = res.data?.data || res.data?.coupon || res.data || { id, ...payload };
    const stored = getStoredCoupons();
    saveStoredCoupons(stored.map((c) => (String(c.id) === String(id) ? { ...c, ...updated } : c)));
    dispatchDataUpdate("coupons", "UPDATE", updated);
    return updated;
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    throw new Error(message || `Failed to update coupon #${id}`);
  }
};

/**
 * 5. Toggle Coupon Status (Active / Inactive)
 * PATCH /api/admin/coupons/{id}/status?active=true/false
 * Also sends request body { isActive: true/false } for server flexibility
 */
export const toggleCouponStatus = async (id, activeStatus) => {
  const isActive = Boolean(activeStatus);

  try {
    const res = await api.patch(
      `/admin/coupons/${id}/status`,
      { isActive },
      { params: { active: isActive } }
    );
    const updated = res.data?.data || res.data || { id, isActive };
    const stored = getStoredCoupons();
    saveStoredCoupons(stored.map((c) => (String(c.id) === String(id) ? { ...c, isActive } : c)));
    dispatchDataUpdate("coupons", "STATUS_CHANGE", { id, isActive });
    return updated;
  } catch (err) {
    const message = err.response?.data?.message || err.response?.data?.error || err.message;
    throw new Error(message || `Failed to toggle status for coupon #${id}`);
  }
};

/**
 * 6. Get Coupon Usages / Audit Trail
 * GET /api/admin/coupons/{id}/usages?page=0&size=20
 */
export const getCouponUsages = async (id, params = { page: 0, size: 20 }) => {
  try {
    const res = await api.get(`/admin/coupons/${id}/usages`, { params });
    const content = res.data?.data?.content || res.data?.content || res.data?.usages || (Array.isArray(res.data) ? res.data : []);
    const meta = {
      totalElements: res.data?.data?.totalElements ?? res.data?.totalElements ?? content.length,
      totalPages: res.data?.data?.totalPages ?? res.data?.totalPages ?? 1,
    };
    return { content, meta };
  } catch (err) {
    console.warn(`Backend GET /admin/coupons/${id}/usages notice:`, err?.message);
    return { content: [], meta: { totalElements: 0, totalPages: 1 } };
  }
};

/**
 * 7. Delete Coupon
 * DELETE /api/admin/coupons/{id}
 * Handles 409 conflict when coupon has already been redeemed
 */
export const deleteCoupon = async (id) => {
  try {
    const res = await api.delete(`/admin/coupons/${id}`);
    const stored = getStoredCoupons();
    saveStoredCoupons(stored.filter((c) => String(c.id) !== String(id)));
    dispatchDataUpdate("coupons", "DELETE", { id });
    return res.data || { success: true };
  } catch (err) {
    const status = err.response?.status;
    const serverMsg = err.response?.data?.message || err.response?.data?.error || "";

    if (status === 409 || serverMsg.toLowerCase().includes("redeemed")) {
      const error = new Error(
        "A redeemed coupon cannot be deleted; deactivate it instead to preserve the audit trail."
      );
      error.isRedeemedConflict = true;
      throw error;
    }

    throw new Error(serverMsg || `Failed to delete coupon #${id}`);
  }
};

export default {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  toggleCouponStatus,
  getCouponUsages,
  deleteCoupon,
  sanitizeCouponPayload,
};
