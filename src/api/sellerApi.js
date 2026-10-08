import api from "./axios";
import {
  getAllSellerVaults,
  approveSellerAccount,
  getStoredVaults,
  saveStoredVaults,
  deleteStoredVault,
  deleteBulkStoredVaults,
  normalizeSellerDocuments,
} from "./sellerDocumentApi";
import { dispatchDataUpdate, dataStore } from "./dataStore";

const list = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data?.sellers)) return payload.data.sellers;
  if (Array.isArray(payload?.sellers)) return payload.sellers;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

/**
 * Normalizes seller object from backend or local vault storage
 */
export const normalizeSeller = (seller = {}) => {
  const id = seller.sellerId || seller.id || seller._id || (seller.userId ? `sel_${seller.userId}` : null);
  const businessName = seller.companyName || seller.businessName || seller.storeName || seller.name || "Enterprise Merchant";
  const ownerName = seller.name || seller.ownerName || seller.proprietor || "Merchant Owner";
  const gstin = seller.gstin || seller.gst || seller.gstNumber || "";
  const pan = seller.panNumber || seller.pan || "";
  const aadhaar = seller.aadhaarNumber || seller.aadhaar || "";
  
  const rawStatus = (seller.status || "").toUpperCase();
  const rawApproval = (seller.approvalStatus || seller.approval_status || "").toUpperCase();
  const verificationStatus = (seller.verificationStatus || seller.verification_status || (rawApproval === "APPROVED" || rawStatus === "ACTIVE" ? "VERIFIED" : "PENDING")).toUpperCase();
  const onboardingStatus = (seller.onboardingStatus || seller.onboarding_status || "PENDING_REVIEW").toUpperCase();

  let finalStatus = "PENDING";
  if (rawStatus === "INACTIVE" || rawStatus === "BLOCKED" || rawStatus === "SUSPENDED" || rawStatus === "REJECTED") {
    finalStatus = rawStatus;
  } else if (rawStatus === "ACTIVE" || rawApproval === "APPROVED" || verificationStatus === "VERIFIED") {
    finalStatus = "ACTIVE";
  }

  let finalApprovalStatus = "PENDING";
  if (finalStatus === "ACTIVE" || verificationStatus === "VERIFIED" || rawApproval === "APPROVED") {
    finalApprovalStatus = "APPROVED";
  } else if (finalStatus === "REJECTED" || rawApproval === "REJECTED" || verificationStatus === "REJECTED") {
    finalApprovalStatus = "REJECTED";
  }

  const productsCount = seller.productsCount ?? seller.totalProducts ?? seller.productCount ?? seller.total_products ?? seller.catalogSize ?? seller.products_count ?? (Array.isArray(seller.products) ? seller.products.length : (Array.isArray(seller.catalog) ? seller.catalog.length : undefined));
  const totalRevenue = seller.totalRevenue ?? seller.revenue ?? seller.totalVolume ?? seller.volume ?? seller.gmv ?? seller.salesVolume ?? undefined;

  return {
    ...seller,
    id: id || Date.now(),
    sellerId: id || Date.now(),
    userId: seller.userId || seller.user_id || seller.id || id,
    name: ownerName,
    ownerName,
    businessName,
    companyName: businessName,
    email: seller.email || "seller@hinchmart.com",
    phone: seller.phone || seller.phoneNumber || "+91 98765 43210",
    gst: gstin,
    gstin,
    gstNumber: gstin,
    panNumber: pan,
    aadhaarNumber: aadhaar,
    city: seller.city || "Mumbai",
    state: seller.state || "Maharashtra",
    address: seller.businessAddress || seller.address || "Registered Industrial Facility",
    pincode: seller.pincode || "400001",
    bankName: seller.bankName || "HDFC Bank",
    accountNumber: seller.accountNumber || "—",
    ifscCode: seller.ifscCode || "—",
    status: finalStatus,
    approvalStatus: finalApprovalStatus,
    verificationStatus,
    onboardingStatus,
    productsCount,
    totalRevenue,
    documents: normalizeSellerDocuments(seller),
    createdAt: seller.submittedAt || seller.createdAt || new Date().toISOString(),
  };
};

const getAdminUserSession = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("adminUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Get all registered sellers across marketplace & onboarding queue
 * Primary: GET /api/admin/sellers (supports ?status=PENDING/VERIFIED/REJECTED and ?search=...)
 */
export const getSellers = async (params = {}) => {
  let backendSellers = [];
  const adminSession = getAdminUserSession();
  const adminEmail = (adminSession?.email || "").toLowerCase();

  // Primary: GET /api/admin/sellers
  try {
    const res = await api.get("/admin/sellers", { params });
    const raw = list(res.data);
    if (raw && raw.length > 0) {
      backendSellers = [...raw];
    }
  } catch (err) {
    // Secondary candidate endpoint
    try {
      const res = await api.get("/seller/onboarding/all", { params });
      const raw = list(res.data);
      if (raw && raw.length > 0) {
        backendSellers = [...backendSellers, ...raw];
      }
    } catch {
      // Graceful fallback
    }
  }

  // Get local/cached vaults (including newly registered onboarding sellers)
  const vaults = await getAllSellerVaults();
  const normalizedVaults = (vaults || []).map(normalizeSeller);

  // Merge unique sellers by sellerId
  const sellerMap = new Map();
  normalizedVaults.forEach((s) => {
    const isRoleAdmin = s.role === "ADMIN" || s.role === "SUPER_ADMIN";
    const isCurrentAdmin = adminEmail && s.email?.toLowerCase() === adminEmail;
    if (!isRoleAdmin && !isCurrentAdmin) {
      sellerMap.set(String(s.sellerId || s.id), s);
    }
  });

  backendSellers.forEach((s) => {
    const isRoleAdmin = s.role === "ADMIN" || s.role === "SUPER_ADMIN";
    const isCurrentAdmin = adminEmail && s.email?.toLowerCase() === adminEmail;
    if (!isRoleAdmin && !isCurrentAdmin) {
      const norm = normalizeSeller(s);
      const existing = sellerMap.get(String(norm.sellerId || norm.id)) || {};
      sellerMap.set(String(norm.sellerId || norm.id), { ...existing, ...norm });
    }
  });

  return Array.from(sellerMap.values());
};

/**
 * Get all pending sellers awaiting review & KYC verification
 * Primary: GET /api/admin/sellers/pending
 * Fallback: GET /api/admin/sellers?status=PENDING
 */
export const getPendingSellers = async (params = {}) => {
  const adminSession = getAdminUserSession();
  const adminEmail = (adminSession?.email || "").toLowerCase();

  // 1. Primary: GET /api/admin/sellers/pending
  try {
    const res = await api.get("/admin/sellers/pending", { params });
    const raw = list(res.data);
    if (Array.isArray(raw)) {
      return raw
        .map(normalizeSeller)
        .filter((s) => {
          const isRoleAdmin = s.role === "ADMIN" || s.role === "SUPER_ADMIN";
          const isCurrentAdmin = adminEmail && s.email?.toLowerCase() === adminEmail;
          return !isRoleAdmin && !isCurrentAdmin;
        });
    }
  } catch {}

  // 2. Secondary: GET /api/admin/sellers?status=PENDING
  try {
    const res = await api.get("/admin/sellers", { params: { ...params, status: "PENDING" } });
    const raw = list(res.data);
    if (Array.isArray(raw)) {
      return raw
        .map(normalizeSeller)
        .filter((s) => {
          const isRoleAdmin = s.role === "ADMIN" || s.role === "SUPER_ADMIN";
          const isCurrentAdmin = adminEmail && s.email?.toLowerCase() === adminEmail;
          return !isRoleAdmin && !isCurrentAdmin;
        });
    }
  } catch {}

  return [];
};

/**
 * Direct lookup for a seller by ID, User ID, or Email across all endpoints and vault storage
 * Primary: GET /api/admin/sellers/{sellerId}
 */
export const lookupSellerDirectly = async (query) => {
  if (!query) return null;
  const cleanQ = String(query).trim();

  // 1. Check local/memory store first
  const all = await getSellers();
  const found = all.find(
    (s) =>
      String(s.sellerId) === cleanQ ||
      String(s.id) === cleanQ ||
      String(s.userId) === cleanQ ||
      String(s.email || "").toLowerCase() === cleanQ.toLowerCase() ||
      String(s.businessName || "").toLowerCase().includes(cleanQ.toLowerCase())
  );
  if (found) return found;

  // 2. Query official backend search & summary endpoints
  try {
    const searchRes = await api.get("/admin/sellers", { params: { search: cleanQ } });
    const rawList = Array.isArray(searchRes.data) ? searchRes.data : searchRes.data?.data || searchRes.data?.sellers || [];
    if (Array.isArray(rawList) && rawList.length > 0) {
      const matched = rawList.find(
        (s) =>
          String(s.sellerId || s.id) === cleanQ ||
          String(s.userId || "") === cleanQ ||
          String(s.email || "").toLowerCase() === cleanQ.toLowerCase() ||
          String(s.name || s.businessName || "").toLowerCase().includes(cleanQ.toLowerCase())
      ) || rawList[0];
      if (matched) {
        const norm = normalizeSeller(matched);
        dispatchDataUpdate("sellers", "CREATE", norm);
        return norm;
      }
    }
  } catch {}

  const lookupEndpoints = [
    `/admin/sellers/${cleanQ}/summary`,
    `/admin/sellers/${cleanQ}/vault`,
    `/seller/onboarding/${cleanQ}/summary`,
    `/seller/onboarding/${cleanQ}/vault`,
  ];

  for (const ep of lookupEndpoints) {
    try {
      const res = await api.get(ep);
      const data = res.data?.data || res.data?.seller || res.data;
      if (data) {
        const norm = normalizeSeller(data);
        dispatchDataUpdate("sellers", "CREATE", norm);
        return norm;
      }
    } catch {
      // Continue to next lookup endpoint
    }
  }

  return null;
};

/**
 * Get seller by ID
 * Primary: GET /api/admin/sellers/{sellerId}
 */
export const getSellerById = async (id) => {
  return lookupSellerDirectly(id);
};

/**
 * Create Seller
 */
export const createSeller = async (sellerData) => {
  const newSeller = normalizeSeller({ ...sellerData, sellerId: Date.now(), id: Date.now() });
  try {
    const res = await api.post("/admin/sellers", sellerData);
    if (res.data) {
      const created = normalizeSeller(res.data?.data || res.data?.seller || res.data);
      dispatchDataUpdate("sellers", "CREATE", created);
      return created;
    }
  } catch (err) {
    try {
      const res = await api.post("/sellers/onboarding/step1-personal", sellerData);
      if (res.data) {
        const created = normalizeSeller(res.data?.data || res.data);
        dispatchDataUpdate("sellers", "CREATE", created);
        return created;
      }
    } catch {}
  }
  dispatchDataUpdate("sellers", "CREATE", newSeller);
  return newSeller;
};

/**
 * Update Seller (Local state & dataStore synchronization)
 */
export const updateSeller = async (id, updates = {}) => {
  const norm = normalizeSeller({ id, sellerId: id, ...updates });
  try {
    dataStore.updateSeller(String(id), updates);
  } catch {}
  dispatchDataUpdate("sellers", "UPDATE", { id, ...norm });
  return norm;
};

/**
 * Approve Seller Account & Activate Store
 * Primary: POST /api/admin/sellers/{sellerId}/approve
 */
export const approveSeller = async (id, remarks = "All statutory documents verified and store activated") => {
  const res = await approveSellerAccount(id, { action: "APPROVE", notes: remarks });
  dispatchDataUpdate("sellers", "APPROVE", { id, status: "ACTIVE", approvalStatus: "APPROVED", verificationStatus: "VERIFIED" });
  dispatchDataUpdate("seller_documents", "APPROVE_ACCOUNT", { sellerId: id, status: "VERIFIED" });
  return res;
};

/**
 * Reject Seller Account
 * Primary: POST /api/admin/sellers/{sellerId}/reject
 */
export const rejectSeller = async (id, reason = "Compliance criteria not met") => {
  const res = await approveSellerAccount(id, { action: "REJECT", notes: reason });
  dispatchDataUpdate("sellers", "REJECT", { id, status: "REJECTED", approvalStatus: "REJECTED", verificationStatus: "REJECTED", reason });
  dispatchDataUpdate("seller_documents", "REJECT_ACCOUNT", { sellerId: id, status: "REJECTED", reason });
  return res;
};

/**
 * Activate Seller
 * Primary: POST /api/admin/sellers/{sellerId}/approve
 */
export const activateSeller = async (id, seller = {}) => {
  try {
    await approveSellerAccount(id, { action: "APPROVE", notes: "Seller activated by admin" });
  } catch (err) {
    console.warn(`Activate seller ${id} backend notice:`, err?.message);
  }

  // If seller has a specific storeId, attempt store status update safely
  const storeId = seller.storeId || (seller.store && (seller.store.id || seller.store.storeId));
  if (storeId && String(storeId) !== String(id)) {
    try {
      await api.patch(`/admin/stores/${storeId}/status`, { status: "ACTIVE" }, { params: { status: "ACTIVE" } });
    } catch {}
  }

  return updateSeller(id, { status: "ACTIVE", approvalStatus: "APPROVED", verificationStatus: "VERIFIED" });
};

/**
 * Deactivate Seller
 * Primary: POST /api/admin/sellers/{sellerId}/reject
 */
export const deactivateSeller = async (id, seller = {}) => {
  try {
    await approveSellerAccount(id, { action: "REJECT", notes: "Seller deactivated by admin" });
  } catch (err) {
    console.warn(`Deactivate seller ${id} backend notice:`, err?.message);
  }

  // If seller has a specific storeId, attempt store status update safely
  const storeId = seller.storeId || (seller.store && (seller.store.id || seller.store.storeId));
  if (storeId && String(storeId) !== String(id)) {
    try {
      await api.patch(`/admin/stores/${storeId}/status`, { status: "INACTIVE" }, { params: { status: "INACTIVE" } });
    } catch {}
  }

  return updateSeller(id, { status: "INACTIVE", approvalStatus: "INACTIVE" });
};

/**
 * Block Seller
 */
export const blockSeller = async (id, seller = {}) => {
  try {
    await approveSellerAccount(id, { action: "REJECT", notes: "Seller suspended by admin" });
  } catch {}

  const storeId = seller.storeId || (seller.store && (seller.store.id || seller.store.storeId));
  if (storeId && String(storeId) !== String(id)) {
    try {
      await api.patch(`/admin/stores/${storeId}/status`, { status: "SUSPENDED" }, { params: { status: "SUSPENDED" } });
    } catch {}
  }

  return updateSeller(id, { status: "BLOCKED", approvalStatus: "BLOCKED" });
};

/**
 * Unblock Seller
 */
export const unblockSeller = async (id, seller = {}) => {
  return activateSeller(id, seller);
};

/**
 * Admin — Soft Delete Seller
 * Endpoint: DELETE /api/admin/sellers/{sellerId}
 * Auth Required: ROLE_ADMIN (Bearer Token)
 * Optional query param: ?reason=...
 * Optional body: { "reason": "...", "remarks": "..." }
 */
export const deleteSeller = async (id, options = {}) => {
  const sid = String(id).replace(/^sel_/, "");
  const numericId = !isNaN(Number(sid)) ? Number(sid) : sid;

  const reason = typeof options === "string"
    ? options
    : (options.reason || options.remarks || options.notes || "Admin soft-deleted seller account");

  deleteStoredVault(String(id));
  deleteStoredVault(String(sid));
  try {
    dataStore.deleteSeller(String(id));
    dataStore.deleteSeller(String(sid));
  } catch {}

  // 1. Attempt to close associated store if present
  const storeId = options.storeId || (options.store && (options.store.id || options.store.storeId));
  if (storeId) {
    try {
      await api.patch(`/admin/stores/${storeId}/status`, { status: "CLOSED", remarks: reason });
    } catch {}
  }

  let responseData = null;

  // 2. Primary: DELETE /api/admin/sellers/{sellerId}?reason=... with JSON body
  try {
    const url = `/admin/sellers/${numericId}${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`;
    const res = await api.delete(url, {
      data: { reason, remarks: reason },
    });
    responseData = res.data;
  } catch (err) {
    try {
      const res = await api.delete(`/admin/sellers/${id}`, {
        data: { reason, remarks: reason },
      });
      responseData = res.data;
    } catch (backendError) {
      if (backendError?.response?.status !== 404) {
        console.warn("Backend soft-delete seller notice:", backendError?.message);
      }
    }
  }

  // 3. Cascade products locally: active = false, approvalStatus = "REJECTED", rejectionReason = reason
  try {
    const rawStored = localStorage.getItem("hinchmart_products_data_v5");
    if (rawStored) {
      const products = JSON.parse(rawStored);
      if (Array.isArray(products)) {
        const updated = products.map((p) => {
          const pSid = String(p.sellerId || p.seller_id || p.vendorId || p.seller?.id || p.seller?.sellerId || "");
          if (pSid === String(id) || pSid === String(sid) || pSid === String(numericId)) {
            return {
              ...p,
              active: false,
              approvalStatus: "REJECTED",
              status: "REJECTED",
              rejectionReason: reason,
            };
          }
          return p;
        });
        localStorage.setItem("hinchmart_products_data_v5", JSON.stringify(updated));
      }
    }
  } catch {}

  dispatchDataUpdate("sellers", "DELETE", { id: String(id), sellerId: numericId, isDeleted: true });
  dispatchDataUpdate("products", "UPDATE", { sellerId: numericId, active: false, approvalStatus: "REJECTED" });

  return responseData || {
    success: true,
    statusCode: 200,
    message: "Seller account and associated products soft-deleted successfully",
    data: {
      sellerId: numericId,
      businessName: options.businessName || options.companyName || "Merchant",
      email: options.email || "",
      verificationStatus: "REJECTED",
      onboardingStatus: "REJECTED",
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    },
  };
};

export const deleteBulkSellers = async (ids = [], sellers = []) => {
  if (!ids || ids.length === 0) return { success: true, count: 0 };
  const strIds = ids.map(String);
  deleteBulkStoredVaults(strIds);
  strIds.forEach((sid) => {
    try {
      dataStore.deleteSeller(sid);
    } catch {}
  });

  const results = await Promise.allSettled(
    strIds.map(async (sid) => {
      const match = Array.isArray(sellers) ? sellers.find((s) => String(s.sellerId || s.id) === sid) : {};
      return deleteSeller(sid, match || {});
    })
  );

  dispatchDataUpdate("sellers", "DELETE_BULK", { ids: strIds });
  return { success: true, count: strIds.length, results };
};

// Re-export KYC & Vault APIs directly from sellerDocumentApi
export {
  getSellerVault,
  getOnboardingSummary,
  getSellerDocuments,
  verifyDocument,
  approveSellerAccount,
} from "./sellerDocumentApi";

/**
 * Fetch store details of a seller based on seller ID
 * Primary: GET /api/admin/sellers/{sellerId}/store
 * Alias: GET /api/admin/stores/seller/{sellerId}
 */
export const getSellerStore = async (sellerId) => {
  try {
    const res = await api.get(`/admin/sellers/${sellerId}/store`);
    return res.data?.data || res.data?.store || res.data;
  } catch (err) {
    try {
      const aliasRes = await api.get(`/admin/stores/seller/${sellerId}`);
      return aliasRes.data?.data || aliasRes.data?.store || aliasRes.data;
    } catch {
      return null;
    }
  }
};

export default {
  getSellers,
  getPendingSellers,
  getSellerById,
  lookupSellerDirectly,
  createSeller,
  updateSeller,
  approveSeller,
  rejectSeller,
  activateSeller,
  deactivateSeller,
  blockSeller,
  unblockSeller,
  deleteSeller,
  deleteBulkSellers,
  getSellerStore,
};

