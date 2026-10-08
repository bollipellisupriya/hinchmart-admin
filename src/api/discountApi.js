import api from "./axios";
import { dispatchDataUpdate } from "./dataStore";

const list = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data?.discounts)) return payload.data.discounts;
  if (Array.isArray(payload?.discounts)) return payload.discounts;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

/**
 * 4. Seller Discounts & Campaigns Approval APIs
 * Controller: SellerDiscountController.java
 */

/**
 * List all seller discount campaigns submitted for review
 * Primary: GET /api/admin/seller-discounts
 * Fallbacks: GET /api/seller/discounts/admin/discounts or /api/admin/discounts
 */
export const getDiscounts = async (params = {}) => {
  try {
    const res = await api.get("/admin/seller-discounts", { params });
    return list(res.data);
  } catch (err) {
    try {
      const res = await api.get("/seller/discounts/admin/discounts", { params });
      return list(res.data);
    } catch {
      try {
        const res = await api.get("/admin/discounts", { params });
        return list(res.data);
      } catch {
        return [];
      }
    }
  }
};

export const getSellerDiscounts = getDiscounts;

/**
 * View pending seller discounts awaiting approval
 * Primary: GET /api/admin/discounts/pending or /api/admin/seller-discounts/pending
 */
export const getPendingDiscounts = async (params = {}) => {
  try {
    const res = await api.get("/admin/discounts/pending", { params });
    return list(res.data);
  } catch (err) {
    try {
      const res = await api.get("/admin/seller-discounts", { params: { ...params, status: "PENDING" } });
      return list(res.data);
    } catch {
      try {
        const res = await api.get("/seller/discounts/admin/discounts/pending", { params });
        return list(res.data);
      } catch {
        return [];
      }
    }
  }
};

/**
 * View details of a specific seller discount rule
 * Primary: GET /api/admin/seller-discounts/{id} or /api/admin/discounts/{id}
 */
export const getDiscountById = async (id) => {
  try {
    const res = await api.get(`/admin/seller-discounts/${id}`);
    return res.data?.data || res.data?.discount || res.data;
  } catch (err) {
    try {
      const res = await api.get(`/admin/discounts/${id}`);
      return res.data?.data || res.data?.discount || res.data;
    } catch {
      return null;
    }
  }
};

export const getSellerDiscountById = getDiscountById;

/**
 * Approve seller discount
 * Primary: PATCH /api/admin/discounts/{discountId}/approve or /api/admin/seller-discounts/{discountId}/approve
 */
export const approveDiscount = async (discountId) => {
  try {
    const res = await api.patch(`/admin/discounts/${discountId}/approve`);
    dispatchDataUpdate("discounts", "APPROVE", { id: discountId });
    return res.data?.data || res.data;
  } catch (err) {
    try {
      const res = await api.patch(`/admin/seller-discounts/${discountId}/approve`);
      dispatchDataUpdate("discounts", "APPROVE", { id: discountId });
      return res.data?.data || res.data;
    } catch {
      try {
        const res = await api.patch(`/seller/discounts/admin/discounts/${discountId}/approve`);
        dispatchDataUpdate("discounts", "APPROVE", { id: discountId });
        return res.data?.data || res.data;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
  }
};

export const approveSellerDiscount = approveDiscount;

/**
 * Reject seller discount with reasons
 * Primary: PATCH /api/admin/discounts/{discountId}/reject or /api/admin/seller-discounts/{discountId}/reject
 * Body: { reason: "..." }
 */
export const rejectDiscount = async (discountId, reason = "Discount rejected by admin compliance") => {
  const body = { reason };
  try {
    const res = await api.patch(`/admin/discounts/${discountId}/reject`, body);
    dispatchDataUpdate("discounts", "REJECT", { id: discountId, reason });
    return res.data?.data || res.data;
  } catch (err) {
    try {
      const res = await api.patch(`/admin/seller-discounts/${discountId}/reject`, body);
      dispatchDataUpdate("discounts", "REJECT", { id: discountId, reason });
      return res.data?.data || res.data;
    } catch {
      try {
        const res = await api.patch(`/seller/discounts/admin/discounts/${discountId}/reject`, body);
        dispatchDataUpdate("discounts", "REJECT", { id: discountId, reason });
        return res.data?.data || res.data;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
  }
};

export const rejectSellerDiscount = rejectDiscount;

/**
 * Pause / resume seller discount campaign
 * Primary: PATCH /api/admin/seller-discounts/{id}/status
 * Body: { status: "ACTIVE" | "PAUSED" | "INACTIVE" }
 */
export const updateDiscountStatus = async (discountId, statusOrPayload = "ACTIVE") => {
  const payload = typeof statusOrPayload === "object" ? statusOrPayload : { status: statusOrPayload };
  try {
    const res = await api.patch(`/admin/seller-discounts/${discountId}/status`, payload);
    dispatchDataUpdate("discounts", "STATUS_CHANGE", { id: discountId, ...payload });
    return res.data?.data || res.data;
  } catch (err) {
    try {
      const res = await api.patch(`/admin/discounts/${discountId}/status`, payload);
      dispatchDataUpdate("discounts", "STATUS_CHANGE", { id: discountId, ...payload });
      return res.data?.data || res.data;
    } catch (fallbackErr) {
      console.warn(`PATCH /admin/seller-discounts/${discountId}/status notice:`, fallbackErr?.message);
      throw fallbackErr;
    }
  }
};

export const updateSellerDiscountStatus = updateDiscountStatus;

/**
 * Edit discount directly
 * PUT /api/seller/discounts/admin/discounts/{discountId} or /api/admin/discounts/{discountId}
 */
export const updateDiscount = async (discountId, data) => {
  try {
    const res = await api.put(`/admin/seller-discounts/${discountId}`, data);
    dispatchDataUpdate("discounts", "UPDATE", { id: discountId, ...data });
    return res.data?.data || res.data;
  } catch (err) {
    try {
      const res = await api.put(`/seller/discounts/admin/discounts/${discountId}`, data);
      dispatchDataUpdate("discounts", "UPDATE", { id: discountId, ...data });
      return res.data?.data || res.data;
    } catch {
      const res = await api.put(`/admin/discounts/${discountId}`, data);
      dispatchDataUpdate("discounts", "UPDATE", { id: discountId, ...data });
      return res.data?.data || res.data;
    }
  }
};

export default {
  getDiscounts,
  getSellerDiscounts,
  getPendingDiscounts,
  getDiscountById,
  getSellerDiscountById,
  approveDiscount,
  approveSellerDiscount,
  rejectDiscount,
  rejectSellerDiscount,
  updateDiscountStatus,
  updateSellerDiscountStatus,
  updateDiscount,
};
