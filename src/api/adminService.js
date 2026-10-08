import api from "./axios";

/**
 * AdminService provides unified client methods for all Admin & Moderation endpoints
 * Base URL: https://api.hinchmart.com (or http://localhost:9000)
 * Authentication: Authorization: Bearer <FIREBASE_ID_TOKEN>
 */
export const AdminService = {
  // ==========================================
  // 1. Authentication & Role Sync
  // ==========================================
  /**
   * Links firebase_uid, sets Firebase custom claim role=ADMIN, and returns admin profile.
   * POST /api/auth/claim-admin
   */
  claimAdmin: async () => {
    const response = await api.post("/auth/claim-admin");
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Syncs current token role with database records.
   * POST /api/auth/sync-role
   */
  syncRole: async () => {
    const response = await api.post("/auth/sync-role");
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Synchronizes Firebase authenticated Admin with the backend database
   * POST /api/auth/sync
   * @param {{ name?: string, email?: string, phone?: string, role?: string }} data
   */
  syncAuth: async (data = {}) => {
    const response = await api.post("/auth/sync", data);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Returns logged-in user profile, role, and Firebase claims.
   * GET /api/auth/me
   */
  getMe: async () => {
    const response = await api.get("/auth/me");
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // Part 1: Admin Store APIs
  // ==========================================
  /**
   * #1 Fetch All Stores (with Filters & Pagination)
   * GET /api/admin/stores
   * Params: status (ACTIVE, INACTIVE, SUSPENDED), search, page (default 1), limit (default 20)
   */
  getAdminStores: async (params = {}) => {
    try {
      const response = await api.get("/admin/stores", { params });
      return response.data !== undefined ? response.data : response;
    } catch (err) {
      const response = await api.get("/stores", { params });
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * #2 Fetch Store Details by Seller ID
   * Primary: GET /api/admin/sellers/{sellerId}/store
   * Alias: GET /api/admin/stores/seller/{sellerId}
   */
  getStoreBySellerId: async (sellerId) => {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/store`);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get(`/admin/stores/seller/${sellerId}`);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * #3 Update Store Status (Activate / Deactivate / Suspend)
   * PATCH /api/admin/stores/{id}/status
   * Request: { status: "SUSPENDED", remarks: "..." }
   */
  updateStoreStatus: async (id, { status = "ACTIVE", remarks = "" } = {}) => {
    const response = await api.patch(`/admin/stores/${id}/status`, { status, remarks });
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // Part 2: Admin Seller APIs
  // ==========================================
  /**
   * #4 List All Registered Sellers
   * GET /api/admin/sellers?status=PENDING&search=...
   */
  getSellers: async (params = {}) => {
    const response = await api.get("/admin/sellers", { params });
    return response.data !== undefined ? response.data : response;
  },

  /**
   * List only sellers awaiting KYC review
   * GET /api/admin/sellers/pending?search=...
   */
  getPendingSellers: async (params = {}) => {
    try {
      const response = await api.get("/admin/sellers/pending", { params });
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get("/admin/sellers", { params: { ...params, status: "PENDING" } });
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Get basic seller details
   * Primary: GET /api/admin/sellers/{sellerId}/summary or GET /api/admin/sellers?search={sellerId}
   */
  getSellerById: async (sellerId) => {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/summary`);
      return response.data !== undefined ? response.data : response;
    } catch {
      try {
        const response = await api.get("/admin/sellers", { params: { search: sellerId } });
        const list = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.sellers || [];
        return list.find((s) => String(s.sellerId || s.id) === String(sellerId)) || list[0] || null;
      } catch {
        return null;
      }
    }
  },

  /**
   * Get full KYC application (Business, Bank, GST, PAN, Documents)
   * GET /api/admin/sellers/{sellerId}/summary
   */
  getSellerSummary: async (sellerId) => {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/summary`);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get(`/seller/onboarding/${sellerId}/summary`);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * View document vault with all uploaded files & URLs
   * GET /api/admin/sellers/{sellerId}/vault
   */
  getSellerVault: async (sellerId) => {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/vault`);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get(`/seller/onboarding/${sellerId}/vault`);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * List all uploaded documents for a seller
   * GET /api/admin/sellers/{sellerId}/documents
   */
  getSellerDocuments: async (sellerId) => {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/documents`);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get(`/seller/onboarding/${sellerId}/documents`);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Approve seller onboarding & activate seller account
   * POST /api/admin/sellers/{sellerId}/approve
   * Body: { remarks: "...", verified: true }
   */
  approveSeller: async (sellerId, remarks = "All statutory documents verified and store activated") => {
    const payload = { remarks, verified: true };
    const response = await api.post(`/admin/sellers/${sellerId}/approve`, payload, {
      params: { remarks },
    });
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Reject seller onboarding with remarks
   * POST /api/admin/sellers/{sellerId}/reject
   * Body: { remarks: "...", verified: false }
   */
  rejectSeller: async (sellerId, remarks = "KYC documents rejected due to discrepancies") => {
    const payload = { remarks, verified: false };
    const response = await api.post(`/admin/sellers/${sellerId}/reject`, payload, {
      params: { remarks },
    });
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Verify or reject a specific document (e.g. GST_CERTIFICATE, PAN_CARD, AADHAAR)
   * PUT /api/admin/sellers/{sellerId}/documents/{docType}/verify?status=...&remarks=...
   */
  verifyDocument: async (sellerId, docType, status = "VERIFIED", remarks = "") => {
    const payload = { status, remarks };
    try {
      const response = await api.put(
        `/admin/sellers/${sellerId}/documents/${docType}/verify`,
        payload,
        { params: payload }
      );
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.put(
        `/seller/onboarding/${sellerId}/documents/${docType}/verify`,
        payload,
        { params: payload }
      );
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Alternate list of onboarding applications
   * GET /api/seller/onboarding/all
   */
  getAllOnboardingSellers: async (params = {}) => {
    try {
      const response = await api.get("/seller/onboarding/all", { params });
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get("/admin/sellers", { params });
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Fetch store details of a seller by seller ID
   * Primary: GET /api/admin/sellers/{sellerId}/store
   * Alias: GET /api/admin/stores/seller/{sellerId}
   */
  getSellerStore: async (sellerId) => {
    try {
      const response = await api.get(`/admin/sellers/${sellerId}/store`);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get(`/admin/stores/seller/${sellerId}`);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Update store status (ACTIVE, INACTIVE, SUSPENDED) with remarks
   * PATCH /api/admin/stores/{id}/status
   */
  updateStoreStatus: async (id, { status = "ACTIVE", remarks = "" } = {}) => {
    const response = await api.patch(`/admin/stores/${id}/status`, { status, remarks });
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 3. Product Catalog & Approvals
  // ==========================================
  /**
   * List all products across all sellers
   * GET /api/admin/products
   */
  getAllProducts: async (params = {}) => {
    const defaultParams = { page: 0, size: 1000, limit: 1000, ...params };
    const response = await api.get("/admin/products", { params: defaultParams });
    return response.data !== undefined ? response.data : response;
  },

  /**
   * List seller-submitted products awaiting admin approval
   * GET /api/admin/products/pending
   */
  getPendingProducts: async (params = {}) => {
    const defaultParams = { page: 0, size: 1000, limit: 1000, ...params };
    try {
      const response = await api.get("/admin/products/pending", { params: defaultParams });
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get("/admin/products", { params: { ...defaultParams, status: "PENDING" } });
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Get complete product details by ID
   * GET /api/admin/products/{id}
   */
  getProductById: async (id) => {
    const response = await api.get(`/admin/products/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Approve product so it becomes visible on the marketplace
   * PATCH /api/admin/products/{id}/approve
   */
  approveProduct: async (id) => {
    try {
      const response = await api.patch(`/admin/products/${id}/approve`);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.put(`/admin/products/${id}/approve`, { status: "APPROVED" });
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Reject product with a reason sent to the seller
   * PATCH /api/admin/products/{id}/reject
   * Body: { "reason": "Image resolution too low" }
   */
  rejectProduct: async (id, reason = "Image resolution too low") => {
    const body = { reason };
    try {
      const response = await api.patch(`/admin/products/${id}/reject`, body);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.put(`/admin/products/${id}/reject`, body);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Create a new product on behalf of a seller
   * POST /api/admin/products/sellers/{sellerId}
   */
  createProductForSeller: async (sellerId, productData) => {
    const response = await api.post(`/admin/products/sellers/${sellerId}`, productData);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * List all products belonging to a specific seller
   * GET /api/admin/products/sellers/{sellerId}
   */
  getProductsForSeller: async (sellerId, params = {}) => {
    const response = await api.get(`/admin/products/sellers/${sellerId}`, { params });
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Edit a seller's product details as Admin
   * PUT /api/admin/products/sellers/{sellerId}/{productId}
   */
  updateProductForSeller: async (sellerId, productId, data) => {
    const response = await api.put(`/admin/products/sellers/${sellerId}/${productId}`, data);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Delete a seller's product
   * DELETE /api/admin/products/sellers/{sellerId}/{productId}
   */
  deleteProductForSeller: async (sellerId, productId) => {
    const response = await api.delete(`/admin/products/sellers/${sellerId}/${productId}`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Create global/direct product
   * POST /api/products
   */
  createProduct: async (data) => {
    const response = await api.post("/products", data);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Update global product
   * PUT /api/products/{id}
   */
  updateProduct: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Delete product
   * DELETE /api/products/{id}
   */
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Update product stock level
   * PATCH /api/products/{id}/stock
   * Body: { "stockQuantity": 50 }
   */
  updateStock: async (id, stockQuantity = 50) => {
    const response = await api.patch(`/products/${id}/stock`, { stockQuantity, stock: stockQuantity });
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Activate product
   * PATCH /api/products/{id}/activate
   */
  activateProduct: async (id) => {
    const response = await api.patch(`/products/${id}/activate`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Deactivate product
   * PATCH /api/products/{id}/deactivate
   */
  deactivateProduct: async (id) => {
    const response = await api.patch(`/products/${id}/deactivate`);
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 4. Category & Brand Proposals
  // ==========================================
  /**
   * View category creation requests submitted by sellers
   * GET /api/admin/category-requests
   */
  getCategoryRequests: async (params = { status: "PENDING" }) => {
    try {
      const response = await api.get("/admin/category-requests", { params });
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get("/seller/category-requests", { params });
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Approve category request (automatically creates category in master catalog)
   * Primary: PATCH /api/admin/category-requests/{id}/approve
   * Fallback: POST /api/admin/category-requests/{id}/approve
   */
  approveCategoryRequest: async (id) => {
    try {
      const response = await api.patch(`/admin/category-requests/${id}/approve`);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.post(`/admin/category-requests/${id}/approve`);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Reject category proposal with a reason
   * Primary: PATCH /api/admin/category-requests/{id}/reject
   * Fallback: POST /api/admin/category-requests/{id}/reject
   * Body: { "reason": "Duplicate category exists" }
   */
  rejectCategoryRequest: async (id, reason = "Duplicate category exists") => {
    try {
      const response = await api.patch(`/admin/category-requests/${id}/reject`, { reason });
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.post(`/admin/category-requests/${id}/reject`, { reason });
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Create master category directly
   * POST /api/categories
   */
  createCategory: async (data) => {
    const response = await api.post("/categories", data);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Update master category
   * PUT /api/categories/{id}
   */
  updateCategory: async (id, data) => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Delete master category
   * DELETE /api/categories/{id}
   */
  deleteCategory: async (id) => {
    const response = await api.delete(`/categories/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Create subcategory
   * POST /api/subcategories
   */
  createSubcategory: async (data) => {
    const response = await api.post("/subcategories", data);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Create brand
   * POST /api/brands
   */
  createBrand: async (data) => {
    const response = await api.post("/brands", data);
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 5. Seller Discounts & Campaigns Approval APIs
  // Controller: SellerDiscountController.java
  // ==========================================
  /**
   * List all seller discount campaigns submitted for review
   * Primary: GET /api/admin/seller-discounts
   */
  getDiscounts: async (params = {}) => {
    try {
      const response = await api.get("/admin/seller-discounts", { params });
      return response.data !== undefined ? response.data : response;
    } catch {
      try {
        const response = await api.get("/seller/discounts/admin/discounts", { params });
        return response.data !== undefined ? response.data : response;
      } catch {
        const response = await api.get("/admin/discounts", { params });
        return response.data !== undefined ? response.data : response;
      }
    }
  },

  getSellerDiscounts: async (params = {}) => {
    return AdminService.getDiscounts(params);
  },

  /**
   * List discounts submitted by sellers awaiting approval
   * Primary: GET /api/admin/seller-discounts?status=PENDING
   */
  getPendingDiscounts: async (params = {}) => {
    try {
      const response = await api.get("/admin/seller-discounts", { params: { ...params, status: "PENDING" } });
      return response.data !== undefined ? response.data : response;
    } catch {
      try {
        const response = await api.get("/seller/discounts/admin/discounts/pending", { params });
        return response.data !== undefined ? response.data : response;
      } catch {
        const response = await api.get("/admin/discounts/pending", { params });
        return response.data !== undefined ? response.data : response;
      }
    }
  },

  /**
   * View details of a specific seller discount rule
   * Primary: GET /api/admin/seller-discounts/{id}
   */
  getDiscountById: async (id) => {
    try {
      const response = await api.get(`/admin/seller-discounts/${id}`);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.get(`/admin/discounts/${id}`);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Approve seller discount
   * Primary: PATCH /api/admin/seller-discounts/{id}/approve
   */
  approveDiscount: async (discountId) => {
    try {
      const response = await api.patch(`/admin/seller-discounts/${discountId}/approve`);
      return response.data !== undefined ? response.data : response;
    } catch {
      try {
        const response = await api.patch(`/seller/discounts/admin/discounts/${discountId}/approve`);
        return response.data !== undefined ? response.data : response;
      } catch {
        const response = await api.patch(`/admin/discounts/${discountId}/approve`);
        return response.data !== undefined ? response.data : response;
      }
    }
  },

  /**
   * Reject seller discount
   * Primary: PATCH /api/admin/seller-discounts/{id}/reject
   * Body: { reason: "..." }
   */
  rejectDiscount: async (discountId, reason = "Discount margin too high") => {
    const body = { reason };
    try {
      const response = await api.patch(`/admin/seller-discounts/${discountId}/reject`, body);
      return response.data !== undefined ? response.data : response;
    } catch {
      try {
        const response = await api.patch(`/seller/discounts/admin/discounts/${discountId}/reject`, body);
        return response.data !== undefined ? response.data : response;
      } catch {
        const response = await api.patch(`/admin/discounts/${discountId}/reject`, body);
        return response.data !== undefined ? response.data : response;
      }
    }
  },

  /**
   * Pause / resume seller discount campaign
   * Primary: PATCH /api/admin/seller-discounts/{id}/status
   * Body: { status: "ACTIVE" | "PAUSED" | "INACTIVE" }
   */
  updateDiscountStatus: async (discountId, statusOrPayload = "ACTIVE") => {
    const payload = typeof statusOrPayload === "object" ? statusOrPayload : { status: statusOrPayload };
    try {
      const response = await api.patch(`/admin/seller-discounts/${discountId}/status`, payload);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.patch(`/admin/discounts/${discountId}/status`, payload);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Edit discount parameters as Admin
   * PUT /api/seller/discounts/admin/discounts/{id} or /api/admin/seller-discounts/{id}
   */
  updateDiscount: async (discountId, data) => {
    try {
      const response = await api.put(`/admin/seller-discounts/${discountId}`, data);
      return response.data !== undefined ? response.data : response;
    } catch {
      try {
        const response = await api.put(`/seller/discounts/admin/discounts/${discountId}`, data);
        return response.data !== undefined ? response.data : response;
      } catch {
        const response = await api.put(`/admin/discounts/${discountId}`, data);
        return response.data !== undefined ? response.data : response;
      }
    }
  },

  // ==========================================
  // 6. Customer Management
  // ==========================================
  /**
   * List all registered buyers/customers
   * GET /api/customers
   */
  getCustomers: async (params = {}) => {
    const response = await api.get("/customers", { params });
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Get customer profile, contact, and address history
   * GET /api/customers/{id}
   */
  getCustomerById: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Update customer information
   * PUT /api/customers/{id}
   */
  updateCustomer: async (id, data) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Deactivate or delete customer account
   * DELETE /api/customers/{id}
   */
  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 7. Order Management & Invoices
  // ==========================================
  /**
   * Get full order details, line items, seller info, and payment breakdown
   * GET /api/orders/{id}
   */
  getOrderById: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Get order status checkpoints & tracking timeline
   * GET /api/orders/{id}/tracking
   */
  getOrderTracking: async (id) => {
    const response = await api.get(`/orders/${id}/tracking`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Retrieve tax invoice data
   * GET /api/orders/{id}/invoice
   */
  getOrderInvoice: async (id) => {
    const response = await api.get(`/orders/${id}/invoice`);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Preview order tax invoice PDF
   * GET /api/orders/{id}/invoice/pdf
   */
  getOrderInvoicePdf: async (id) => {
    const response = await api.get(`/orders/${id}/invoice/pdf`, {
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Download official order tax invoice PDF
   * GET /api/orders/{id}/invoice/download
   */
  downloadOrderInvoice: async (id) => {
    const response = await api.get(`/orders/${id}/invoice/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Update order fulfillment status
   * PUT /api/orders/{id}/status
   * Body: { "status": "SHIPPED", "location": "Warehouse Hub 1", "description": "Package dispatched" }
   */
  updateOrderStatus: async (id, data = {}) => {
    const payload = typeof data === "string" ? { status: data } : data;
    try {
      const response = await api.put(`/orders/${id}/status`, payload);
      return response.data !== undefined ? response.data : response;
    } catch {
      const response = await api.patch(`/orders/${id}/status`, payload);
      return response.data !== undefined ? response.data : response;
    }
  },

  /**
   * Cancel order
   * PATCH /api/orders/{id}/cancel
   * Body: { "description": "Cancelled by Admin due to compliance" }
   */
  cancelOrder: async (id, description = "Cancelled by Admin due to compliance") => {
    const response = await api.patch(`/orders/${id}/cancel`, { description });
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 8. Stores & Wallet
  // ==========================================
  /**
   * Update seller storefront status
   * PATCH /api/admin/stores/{id}/status
   * Body: { "status": "ACTIVE" | "SUSPENDED" }
   */
  updateStoreStatus: async (id, data = { status: "ACTIVE" }) => {
    const payload = typeof data === "string" ? { status: data } : data;
    const response = await api.patch(`/admin/stores/${id}/status`, payload);
    return response.data !== undefined ? response.data : response;
  },

  /**
   * Credit/Top-up user wallet balance
   * POST /api/wallet/topup
   * Body: { "amount": 500.00, "description": "Promotional Credit" }
   */
  topupWallet: async ({ amount = 500.0, description = "Promotional Credit", customerId, buyerId, email } = {}) => {
    const payload = {
      amount: Number(amount) || 0,
      description: description || "Promotional Credit",
      note: description || "Promotional Credit",
    };
    if (customerId) payload.customerId = customerId;
    if (buyerId) payload.buyerId = buyerId;
    if (email) payload.email = email;

    const response = await api.post("/wallet/topup", payload);
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 9. Purchase Orders (B2B Approval Workflow)
  // ==========================================
  getPendingPurchaseOrders: async (params = {}) => {
    const response = await api.get("/purchase-orders/admin/pending", { params });
    return response.data !== undefined ? response.data : response;
  },

  approvePurchaseOrder: async (id) => {
    const response = await api.patch(`/purchase-orders/admin/${id}/approve`);
    return response.data !== undefined ? response.data : response;
  },

  rejectPurchaseOrder: async (id, remarks = "Credit limit exceeded") => {
    const response = await api.patch(`/purchase-orders/admin/${id}/reject`, null, { params: { remarks } });
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 10. Reviews & Content Moderation
  // ==========================================
  getPendingReviews: async (params = {}) => {
    const response = await api.get("/reviews/admin/pending", { params });
    return response.data !== undefined ? response.data : response;
  },

  approveReview: async (id) => {
    const response = await api.patch(`/reviews/admin/${id}/approve`);
    return response.data !== undefined ? response.data : response;
  },

  rejectReview: async (id, reason = "Content does not meet policy") => {
    const response = await api.patch(`/reviews/admin/${id}/reject`, null, { params: { reason } });
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 11. Banners & Marketing Management
  // ==========================================
  getBanners: async (params = {}) => {
    const response = await api.get("/banners", { params });
    return response.data !== undefined ? response.data : response;
  },

  createBanner: async (data) => {
    const response = await api.post("/banners", data);
    return response.data !== undefined ? response.data : response;
  },

  uploadBannerVideo: async (bannerId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await api.post(`/banners/${bannerId}/video`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data !== undefined ? response.data : response;
    } catch (err) {
      const fallback = await api.post(`/banners/${bannerId}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return fallback.data !== undefined ? fallback.data : fallback;
    }
  },

  updateBanner: async (id, data) => {
    const response = await api.put(`/banners/${id}`, data);
    return response.data !== undefined ? response.data : response;
  },

  deleteBanner: async (id) => {
    const response = await api.delete(`/banners/${id}`);
    return response.data !== undefined ? response.data : response;
  },

  // ==========================================
  // 12. Brands Catalog (Tier 3 Classification)
  // ==========================================
  getBrands: async (params = {}) => {
    const response = await api.get("/brands", { params });
    return response.data !== undefined ? response.data : response;
  },

  createBrand: async (data) => {
    const response = await api.post("/brands", data);
    return response.data !== undefined ? response.data : response;
  },

  updateBrand: async (id, data) => {
    const response = await api.put(`/brands/${id}`, data);
    return response.data !== undefined ? response.data : response;
  },

  deleteBrand: async (id) => {
    const response = await api.delete(`/brands/${id}`);
    return response.data !== undefined ? response.data : response;
  },
};

export default AdminService;
