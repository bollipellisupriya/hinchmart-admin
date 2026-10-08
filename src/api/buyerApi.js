import api from "./axios";
import dataStore, { dispatchDataUpdate } from "./dataStore";
import { topupCustomerWallet } from "./walletApi";

const list = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data?.customers)) return payload.data.customers;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.data?.buyers)) return payload.data.buyers;
  if (Array.isArray(payload?.buyers)) return payload.buyers;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

/**
 * 5. Customer Management APIs (ADMIN only)
 */

/**
 * List all customers
 * GET /api/customers → ADMIN only
 */
export const getBuyers = async (params = {}) => {
  try {
    const res = await api.get("/customers", { params });
    const raw = list(res.data);
    if (raw && raw.length > 0) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hinchmart_cached_customers", JSON.stringify(raw));
        } catch (_) {}
      }
      return raw;
    }
  } catch (err) {
    console.warn("Live backend /customers fetch notice:", err?.message);
  }

  // Resilient fallback: Try previously cached live customers
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("hinchmart_cached_customers");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
  }

  // Secondary fallback: Extract customer profiles from existing database orders
  try {
    const localOrders = (await dataStore.getOrders()) || [];
    const derivedBuyers = [];
    const seenEmails = new Set();
    localOrders.forEach((o) => {
      const b = o.buyer || {};
      const key = b.email || b.phone || b.name;
      if (key && !seenEmails.has(key)) {
        seenEmails.add(key);
        derivedBuyers.push({
          id: o.customerId || b.id || `buy_${derivedBuyers.length + 101}`,
          name: b.name || o.customerName || "Customer",
          email: b.email || o.email || "",
          phone: b.phone || o.phone || "",
          company: b.company || o.company || "Enterprise",
          city: b.city || o.city || "Mumbai",
          state: b.state || o.state || "Maharashtra",
          status: "ACTIVE",
          totalOrders: 1,
          totalSpent: Number(o.totalAmount || 0),
          createdAt: o.createdAt || new Date().toISOString(),
        });
      }
    });
    if (derivedBuyers.length > 0) return derivedBuyers;
  } catch (_) {}

  return dataStore.getBuyers();
};

/**
 * View any customer profile
 * GET /api/customers/{id}
 */
export const getBuyerById = async (id) => {
  try {
    const res = await api.get(`/customers/${id}`);
    const customer = res.data?.data || res.data?.customer || res.data;
    if (customer) return customer;
  } catch (err) {
    console.warn(`Live backend /customers/${id} fetch notice:`, err?.message);
  }
  return dataStore.getBuyerById(id);
};

/**
 * Create customer profile (direct or platform)
 * POST /api/customers
 */
export const createBuyer = async (buyerData) => {
  try {
    const res = await api.post("/customers", buyerData);
    const created = res.data?.data || res.data?.customer || res.data;
    if (created) {
      dispatchDataUpdate("buyers", "CREATE", created);
      return created;
    }
  } catch (err) {
    console.warn("Live backend POST /customers notice:", err?.message);
  }
  return dataStore.addBuyer(buyerData);
};

/**
 * Update any customer
 * PUT /api/customers/{id}
 */
export const updateBuyer = async (id, updates) => {
  try {
    const res = await api.put(`/customers/${id}`, updates);
    const updated = res.data?.data || res.data?.customer || res.data;
    if (updated) {
      dispatchDataUpdate("buyers", "UPDATE", { id, ...updated });
      return updated;
    }
  } catch (err) {
    console.warn(`Live backend PUT /customers/${id} notice:`, err?.message);
  }
  return dataStore.updateBuyer(id, updates);
};

/**
 * Activate customer
 * PATCH /api/customers/{id}/activate or status update
 */
export const activateBuyer = async (id) => {
  try {
    await api.patch(`/customers/${id}/status`, { status: "ACTIVE" });
  } catch {}
  return dataStore.setBuyerStatus(id, "ACTIVE");
};

/**
 * Deactivate customer
 * PATCH /api/customers/{id}/deactivate or status update
 */
export const deactivateBuyer = async (id) => {
  try {
    await api.patch(`/customers/${id}/status`, { status: "INACTIVE" });
  } catch {}
  return dataStore.setBuyerStatus(id, "INACTIVE");
};

/**
 * Block customer
 */
export const blockBuyer = async (id) => {
  try {
    await api.patch(`/customers/${id}/status`, { status: "BLOCKED" });
  } catch {}
  return dataStore.setBuyerStatus(id, "BLOCKED");
};

/**
 * Unblock customer
 */
export const unblockBuyer = async (id) => {
  try {
    await api.patch(`/customers/${id}/status`, { status: "ACTIVE" });
  } catch {}
  return dataStore.setBuyerStatus(id, "ACTIVE");
};

/**
 * Delete any customer
 * DELETE /api/customers/{id}
 */
export const deleteBuyer = async (id) => {
  try {
    await api.delete(`/customers/${id}`);
    dispatchDataUpdate("buyers", "DELETE", { id });
  } catch (err) {
    console.warn(`Live backend DELETE /customers/${id} notice:`, err?.message);
  }
  return dataStore.deleteBuyer(id);
};

/**
 * Top-up customer wallet
 * POST /api/wallet/topup
 */
export const topupBuyerWallet = async (id, { amount, note, email }) => {
  return topupCustomerWallet({ amount, note, customerId: id, email });
};

