import api from "./axios";
import { dispatchDataUpdate } from "./dataStore";
import { getStoredProducts } from "./productApi";

const STORAGE_KEY_HOT_DEALS = "hinchmart_admin_hot_deals_cache_v1";

// Seed data matching the user's specification structure for offline fallback
const SEED_HOT_DEALS = [
  {
    id: 1,
    productId: 101,
    productName: "Samsung 55 Inch 4K Smart TV",
    displayOrder: 1,
    active: true,
    createdAt: "2026-10-06T08:30:00",
    updatedAt: "2026-10-06T08:30:00",
    product: {
      productId: 101,
      name: "Samsung 55 Inch 4K Smart TV",
      productName: "Samsung 55 Inch 4K Smart TV",
      description: "Ultra HD Crystal 4K LED TV with HDR10+",
      price: 39999.0,
      mrp: 49999.0,
      stockQuantity: 25,
      imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80",
      categoryName: "Electronics",
      displayOrder: 1,
      active: true,
    },
  },
  {
    id: 2,
    productId: 205,
    productName: "HP Pavilion 15 Laptop",
    displayOrder: 2,
    active: false,
    createdAt: "2026-10-06T08:32:00",
    updatedAt: "2026-10-06T08:40:00",
    product: {
      productId: 205,
      name: "HP Pavilion 15 Laptop",
      productName: "HP Pavilion 15 Laptop",
      description: "Intel Core i5 12th Gen, 16GB RAM, 512GB SSD",
      price: 54999.0,
      mrp: 62999.0,
      stockQuantity: 10,
      imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
      categoryName: "Computers",
      displayOrder: 2,
      active: true,
    },
  },
];

/**
 * Local cache getters & setters
 */
export const getStoredHotDeals = () => {
  if (typeof window === "undefined") return SEED_HOT_DEALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HOT_DEALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return SEED_HOT_DEALS;
};

export const saveStoredHotDeals = (deals) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_HOT_DEALS, JSON.stringify(deals));
    } catch {}
  }
};

/**
 * Helper to normalize hot deal objects from backend
 */
export const normalizeHotDeal = (deal) => {
  if (!deal) return null;
  const prod = deal.product || deal || {};
  const id = deal.id;
  const productId = Number(deal.productId || prod.productId || prod.id || id);
  const name = prod.name || prod.productName || prod.title || deal.productName || deal.title || `Product #${productId}`;

  return {
    id: deal.id,
    productId,
    productName: deal.productName || name,
    displayOrder: Number(deal.displayOrder || 1),
    active: deal.active !== false && deal.isActive !== false,
    createdAt: deal.createdAt || new Date().toISOString(),
    updatedAt: deal.updatedAt || new Date().toISOString(),
    product: {
      productId,
      name,
      productName: name,
      description: prod.description || deal.description || "",
      price: Number(prod.price ?? deal.price ?? 0),
      mrp: Number(prod.mrp ?? deal.mrp ?? prod.price ?? deal.price ?? 0),
      stockQuantity: Number(prod.stockQuantity ?? prod.stockQty ?? (typeof prod.stock === "number" ? prod.stock : 25)),
      imageUrl: prod.imageUrl || prod.imageURL || prod.image || deal.imageUrl || deal.image || "",
      categoryName: prod.categoryName || prod.category?.name || prod.category || deal.categoryName || "General",
      displayOrder: Number(prod.displayOrder || deal.displayOrder || 1),
      active: deal.active !== false && deal.isActive !== false,
    },
  };
};

/**
 * Helper to extract descriptive error messages from Axios responses
 */
const extractErrorMessage = (err, fallbackMessage) => {
  if (err.response?.data?.message) {
    return err.response.data.message;
  }
  if (err.response?.data?.error) {
    return typeof err.response.data.error === "string"
      ? err.response.data.error
      : JSON.stringify(err.response.data.error);
  }
  return err.message || fallbackMessage;
};

/**
 * 1. View All Hot Deals (Admin List)
 * Method: GET
 * Endpoint: /api/admin/hot-deals
 */
export const getHotDeals = async () => {
  try {
    const response = await api.get("/admin/hot-deals");
    const rawData = response.data;
    const list = Array.isArray(rawData)
      ? rawData
      : Array.isArray(rawData?.content)
      ? rawData.content
      : Array.isArray(rawData?.data)
      ? rawData.data
      : [];
    const normalized = list.map(normalizeHotDeal).sort((a, b) => a.displayOrder - b.displayOrder);
    saveStoredHotDeals(normalized);
    return normalized;
  } catch (err) {
    console.warn("getHotDeals backend fetch failed, using local cache:", err.message);
    const cached = getStoredHotDeals();
    return cached.map(normalizeHotDeal).sort((a, b) => a.displayOrder - b.displayOrder);
  }
};

/**
 * 2. Add an Existing Product to Hot Deals
 * Method: POST
 * Endpoint: /api/admin/hot-deals
 * Body: { productId, displayOrder?, active? }
 */
export const addHotDeal = async ({ productId, displayOrder, active = true, productDetails = null }) => {
  const pId = Number(productId);
  if (!pId) throw new Error("A valid Product ID is required");

  const payload = {
    productId: pId,
    active: Boolean(active),
  };
  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== "") {
    payload.displayOrder = Number(displayOrder);
  }

  try {
    const response = await api.post("/admin/hot-deals", payload);
    const created = normalizeHotDeal(response.data);

    // Update local cache
    const current = getStoredHotDeals();
    const updated = [...current.filter((d) => d.id !== created.id), created].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    saveStoredHotDeals(updated);
    dispatchDataUpdate("hot-deals", "create", created);
    return created;
  } catch (err) {
    // If it's a 409 Conflict or 404 Not Found from backend, throw with server message
    if (err.response?.status === 409 || err.response?.status === 404) {
      const msg = extractErrorMessage(err, "Conflict or Not Found error");
      const customErr = new Error(msg);
      customErr.status = err.response.status;
      throw customErr;
    }

    // Offline simulation fallback if backend is unreachable
    console.warn("addHotDeal backend call failed, performing offline simulation:", err.message);
    const current = getStoredHotDeals();
    if (current.some((d) => Number(d.productId) === pId)) {
      const conflictErr = new Error(`Product with ID ${pId} is already in Hot Deals`);
      conflictErr.status = 409;
      throw conflictErr;
    }

    const nextOrder =
      payload.displayOrder !== undefined
        ? payload.displayOrder
        : current.length > 0
        ? Math.max(...current.map((d) => d.displayOrder || 0)) + 1
        : 1;

    const newDeal = {
      id: Date.now(),
      productId: pId,
      productName: productDetails?.name || productDetails?.productName || `Product #${pId}`,
      displayOrder: nextOrder,
      active: payload.active,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      product: {
        productId: pId,
        name: productDetails?.name || productDetails?.productName || `Product #${pId}`,
        productName: productDetails?.productName || productDetails?.name || `Product #${pId}`,
        description: productDetails?.description || "",
        price: Number(productDetails?.price || 0),
        mrp: Number(productDetails?.mrp || productDetails?.price || 0),
        stockQuantity: Number(productDetails?.stockQuantity ?? 10),
        imageUrl: productDetails?.imageUrl || "",
        categoryName: productDetails?.categoryName || "General",
        displayOrder: nextOrder,
        active: payload.active,
      },
    };

    const updated = [...current, newDeal].sort((a, b) => a.displayOrder - b.displayOrder);
    saveStoredHotDeals(updated);
    dispatchDataUpdate("hot-deals", "create", newDeal);
    return newDeal;
  }
};

/**
 * 3. Enable / Disable a Hot Deal (Toggle Status)
 * Method: PATCH
 * Endpoint: /api/admin/hot-deals/{id}/status?active={true|false}
 */
export const toggleHotDealStatus = async (id, active) => {
  const isActive = Boolean(active);
  try {
    const response = await api.patch(`/admin/hot-deals/${id}/status?active=${isActive}`);
    const updated = normalizeHotDeal(response.data);

    const current = getStoredHotDeals();
    const list = current.map((d) => (d.id === id ? { ...d, ...updated, active: isActive } : d));
    saveStoredHotDeals(list);
    dispatchDataUpdate("hot-deals", "update", updated);
    return updated;
  } catch (err) {
    console.warn("toggleHotDealStatus backend call failed, performing offline update:", err.message);
    const current = getStoredHotDeals();
    const existing = current.find((d) => d.id === id);
    if (!existing) throw new Error(`Hot deal with ID ${id} not found`);

    const updated = {
      ...existing,
      active: isActive,
      updatedAt: new Date().toISOString(),
      product: {
        ...existing.product,
        active: isActive,
      },
    };
    const list = current.map((d) => (d.id === id ? updated : d));
    saveStoredHotDeals(list);
    dispatchDataUpdate("hot-deals", "update", updated);
    return updated;
  }
};

/**
 * 4. Batch Reorder Hot Deals
 * Method: PATCH
 * Endpoint: /api/admin/hot-deals/reorder
 * Body: { items: [ { id: 2, displayOrder: 1 }, { id: 1, displayOrder: 2 } ] }
 */
export const reorderHotDeals = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Items array is required for reordering");
  }

  const payload = {
    items: items.map((item) => ({
      id: item.id,
      displayOrder: Number(item.displayOrder),
    })),
  };

  try {
    const response = await api.patch("/admin/hot-deals/reorder", payload);
    const rawList = Array.isArray(response.data) ? response.data : response.data?.content || [];
    const normalized = rawList.map(normalizeHotDeal).sort((a, b) => a.displayOrder - b.displayOrder);
    saveStoredHotDeals(normalized);
    dispatchDataUpdate("hot-deals", "reorder", normalized);
    return normalized;
  } catch (err) {
    console.warn("reorderHotDeals backend call failed, performing offline reordering:", err.message);
    const orderMap = new Map(payload.items.map((it) => [it.id, it.displayOrder]));
    const current = getStoredHotDeals();
    const reordered = current
      .map((d) => {
        if (orderMap.has(d.id)) {
          const newOrder = orderMap.get(d.id);
          return {
            ...d,
            displayOrder: newOrder,
            product: { ...d.product, displayOrder: newOrder },
            updatedAt: new Date().toISOString(),
          };
        }
        return d;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);

    saveStoredHotDeals(reordered);
    dispatchDataUpdate("hot-deals", "reorder", reordered);
    return reordered;
  }
};

/**
 * 5. Update a Hot Deal (PUT)
 * Method: PUT
 * Endpoint: /api/admin/hot-deals/{id}
 * Body: { displayOrder: 3, active: true }
 */
export const updateHotDeal = async (id, { displayOrder, active }) => {
  const payload = {};
  if (displayOrder !== undefined && displayOrder !== null && displayOrder !== "") {
    payload.displayOrder = Number(displayOrder);
  }
  if (active !== undefined && active !== null) {
    payload.active = Boolean(active);
  }

  try {
    const response = await api.put(`/admin/hot-deals/${id}`, payload);
    const updated = normalizeHotDeal(response.data);

    const current = getStoredHotDeals();
    const list = current
      .map((d) => (d.id === id ? { ...d, ...updated } : d))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    saveStoredHotDeals(list);
    dispatchDataUpdate("hot-deals", "update", updated);
    return updated;
  } catch (err) {
    console.warn("updateHotDeal backend call failed, performing offline update:", err.message);
    const current = getStoredHotDeals();
    const existing = current.find((d) => d.id === id);
    if (!existing) throw new Error(`Hot deal with ID ${id} not found`);

    const updated = {
      ...existing,
      displayOrder: payload.displayOrder !== undefined ? payload.displayOrder : existing.displayOrder,
      active: payload.active !== undefined ? payload.active : existing.active,
      updatedAt: new Date().toISOString(),
      product: {
        ...existing.product,
        displayOrder: payload.displayOrder !== undefined ? payload.displayOrder : existing.product?.displayOrder,
        active: payload.active !== undefined ? payload.active : existing.product?.active,
      },
    };

    const list = current
      .map((d) => (d.id === id ? updated : d))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    saveStoredHotDeals(list);
    dispatchDataUpdate("hot-deals", "update", updated);
    return updated;
  }
};

/**
 * 6. Remove a Product from Hot Deals
 * Method: DELETE
 * Endpoint: /api/admin/hot-deals/{id}
 * Response: 204 No Content
 */
export const deleteHotDeal = async (id) => {
  try {
    await api.delete(`/admin/hot-deals/${id}`);
    const current = getStoredHotDeals();
    const filtered = current.filter((d) => d.id !== id);
    saveStoredHotDeals(filtered);
    dispatchDataUpdate("hot-deals", "delete", { id });
    return true;
  } catch (err) {
    console.warn("deleteHotDeal backend call failed, performing offline deletion:", err.message);
    const current = getStoredHotDeals();
    const filtered = current.filter((d) => d.id !== id);
    saveStoredHotDeals(filtered);
    dispatchDataUpdate("hot-deals", "delete", { id });
    return true;
  }
};

/**
 * 7. Search Existing Products (For Admin Dropdown / Selector)
 * Method: GET
 * Endpoint: /api/products?keyword=Samsung&page=0&size=10
 */
export const searchProductsForHotDeals = async (keyword = "", page = 0, size = 20) => {
  const cleanKw = (keyword || "").toLowerCase().trim();

  try {
    const params = {
      page,
      size,
    };
    if (cleanKw) {
      params.keyword = cleanKw;
      params.search = cleanKw;
    }

    const response = await api.get("/products", { params });
    const data = response.data;

    let items = [];
    let totalElements = 0;
    let totalPages = 1;

    if (Array.isArray(data)) {
      items = data;
      totalElements = data.length;
    } else if (Array.isArray(data?.content)) {
      items = data.content;
      totalElements = data.totalElements ?? items.length;
      totalPages = data.totalPages ?? 1;
    } else if (Array.isArray(data?.data)) {
      items = data.data;
      totalElements = data.totalElements ?? items.length;
    } else if (Array.isArray(data?.products)) {
      items = data.products;
      totalElements = items.length;
    }

    if (items.length > 0) {
      const formatted = items.map((p) => ({
        productId: Number(p.productId || p.id),
        name: p.name || p.title || p.productName || "Unnamed Product",
        productName: p.productName || p.name || p.title || "Unnamed Product",
        description: p.description || "",
        price: Number(p.price || 0),
        mrp: Number(p.mrp || p.price || 0),
        stockQuantity: Number(p.stockQuantity ?? p.stockQty ?? (typeof p.stock === "number" ? p.stock : 25)),
        imageUrl: p.imageUrl || p.imageURL || p.image || (p.images && p.images[0]) || "",
        categoryName: p.categoryName || p.category?.name || p.category || "General",
        active: p.active !== false && p.isActive !== false,
      }));

      return {
        content: formatted,
        totalElements,
        totalPages,
      };
    }
  } catch (err) {
    console.warn("searchProductsForHotDeals backend fetch notice:", err.message);
  }

  // Fallback to rich in-memory / local storage products catalog
  let catalogProducts = [];
  try {
    catalogProducts = getStoredProducts() || [];
  } catch {}

  if (!Array.isArray(catalogProducts) || catalogProducts.length === 0) {
    catalogProducts = [
      {
        id: 101,
        productId: 101,
        name: "Samsung 55 Inch 4K Smart TV",
        price: 39999.0,
        mrp: 49999.0,
        stockQty: 25,
        imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80",
        categoryName: "Electronics",
      },
      {
        id: 205,
        productId: 205,
        name: "HP Pavilion 15 Laptop",
        price: 54999.0,
        mrp: 62999.0,
        stockQty: 10,
        imageUrl: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80",
        categoryName: "Computers",
      },
    ];
  }

  const filtered = cleanKw
    ? catalogProducts.filter((p) => {
        const title = (p.name || p.title || p.productName || "").toLowerCase();
        const cat = (p.categoryName || p.category || "").toLowerCase();
        const brand = (p.brandName || p.brand || "").toLowerCase();
        const pId = String(p.productId || p.id);
        return title.includes(cleanKw) || cat.includes(cleanKw) || brand.includes(cleanKw) || pId.includes(cleanKw);
      })
    : catalogProducts;

  const slice = filtered.slice(page * size, (page + 1) * size);
  return {
    content: slice.map((p) => ({
      productId: Number(p.productId || p.id),
      name: p.name || p.title || p.productName || "Unnamed Product",
      productName: p.productName || p.name || p.title || "Unnamed Product",
      description: p.description || "",
      price: Number(p.price || 0),
      mrp: Number(p.mrp || p.price || 0),
      stockQuantity: Number(p.stockQty ?? p.stockQuantity ?? (typeof p.stock === "number" ? p.stock : 25)),
      imageUrl: p.imageUrl || p.imageURL || p.image || (p.images && p.images[0]) || "",
      categoryName: p.categoryName || p.category?.name || p.category || "General",
      active: p.active !== false && p.isActive !== false,
    })),
    totalElements: filtered.length,
    totalPages: Math.ceil(filtered.length / size) || 1,
  };
};
