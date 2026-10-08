import api from "./axios";
import { invalidateRequest } from "./requestCache";
import { dispatchDataUpdate } from "./dataStore";
import { getStoredCategories } from "./categoryApi";
import { getStoredSubcategories } from "./subcategoryApi";
import { compressImage } from "../utils/imageStore";

const STORAGE_KEY_BRANDS = "hinchmart_brands_data_v2";
const STORAGE_KEY_DELETED_BRANDS = "hinchmart_deleted_brand_ids_v1";

const isRemoteId = (id) => {
  if (!id) return false;
  const num = Number(id);
  return !isNaN(num) && num > 0 && num <= 2147483647;
};

export const getDeletedBrandIds = () => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_BRANDS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const markBrandDeleted = (id) => {
  const deleted = getDeletedBrandIds();
  deleted.add(String(id));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_BRANDS, JSON.stringify(Array.from(deleted)));
    } catch {}
  }
};

const slugify = (value = "") =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Preset high-res Brand Logos / Badges
export const BRAND_PRESET_LOGOS = [
  { name: "Tata Tiscon", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&auto=format&fit=crop&q=80" },
  { name: "JSW Neosteel", url: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=200&auto=format&fit=crop&q=80" },
  { name: "Jindal Panther", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80" },
  { name: "UltraTech", url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=200&auto=format&fit=crop&q=80" },
  { name: "ACC Cement", url: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&auto=format&fit=crop&q=80" },
  { name: "Polycab", url: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=200&auto=format&fit=crop&q=80" },
  { name: "Havells", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format&fit=crop&q=80" },
  { name: "Supreme", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80" },
  { name: "Astral", url: "https://images.unsplash.com/photo-1541888946425-d0fbb180c5f7?w=200&auto=format&fit=crop&q=80" },
  { name: "Bosch", url: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&auto=format&fit=crop&q=80" },
  { name: "DeWalt", url: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=200&auto=format&fit=crop&q=80" },
  { name: "Asian Paints", url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=200&auto=format&fit=crop&q=80" },
];

export const INITIAL_BRANDS = [
  {
    id: 1,
    brandId: 1,
    subcategoryId: 1,
    subcategoryName: "TMT Steel & Rebars",
    categoryId: 1,
    categoryName: "Civil & Structural",
    name: "Tata Tiscon",
    slug: "tata-tiscon",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&auto=format&fit=crop&q=80",
    productCount: 4,
    sortOrder: 1,
    active: true,
    createdAt: "2026-08-25T10:00:00.000Z",
  },
  {
    id: 2,
    brandId: 2,
    subcategoryId: 1,
    subcategoryName: "TMT Steel & Rebars",
    categoryId: 1,
    categoryName: "Civil & Structural",
    name: "JSW Neosteel",
    slug: "jsw-neosteel",
    imageUrl: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=200&auto=format&fit=crop&q=80",
    productCount: 3,
    sortOrder: 2,
    active: true,
    createdAt: "2026-08-25T10:30:00.000Z",
  },
  {
    id: 3,
    brandId: 3,
    subcategoryId: 1,
    subcategoryName: "TMT Steel & Rebars",
    categoryId: 1,
    categoryName: "Civil & Structural",
    name: "Jindal Panther",
    slug: "jindal-panther",
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200&auto=format&fit=crop&q=80",
    productCount: 2,
    sortOrder: 3,
    active: true,
    createdAt: "2026-08-25T11:00:00.000Z",
  },
  {
    id: 4,
    brandId: 4,
    subcategoryId: 2,
    subcategoryName: "Cement & RMC",
    categoryId: 1,
    categoryName: "Civil & Structural",
    name: "UltraTech",
    slug: "ultratech",
    imageUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=200&auto=format&fit=crop&q=80",
    productCount: 5,
    sortOrder: 1,
    active: true,
    createdAt: "2026-08-25T11:30:00.000Z",
  },
  {
    id: 5,
    brandId: 5,
    subcategoryId: 2,
    subcategoryName: "Cement & RMC",
    categoryId: 1,
    categoryName: "Civil & Structural",
    name: "ACC Cement",
    slug: "acc-cement",
    imageUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&auto=format&fit=crop&q=80",
    productCount: 3,
    sortOrder: 2,
    active: true,
    createdAt: "2026-08-25T12:00:00.000Z",
  },
  {
    id: 6,
    brandId: 6,
    subcategoryId: 3,
    subcategoryName: "Wires & Cables",
    categoryId: 2,
    categoryName: "Electrical",
    name: "Polycab",
    slug: "polycab",
    imageUrl: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=200&auto=format&fit=crop&q=80",
    productCount: 6,
    sortOrder: 1,
    active: true,
    createdAt: "2026-08-25T12:30:00.000Z",
  },
  {
    id: 7,
    brandId: 7,
    subcategoryId: 3,
    subcategoryName: "Wires & Cables",
    categoryId: 2,
    categoryName: "Electrical",
    name: "Havells",
    slug: "havells",
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format&fit=crop&q=80",
    productCount: 4,
    sortOrder: 2,
    active: true,
    createdAt: "2026-08-25T13:00:00.000Z",
  },
  {
    id: 8,
    brandId: 8,
    subcategoryId: 4,
    subcategoryName: "CPVC & PVC Pipes",
    categoryId: 3,
    categoryName: "Plumbing",
    name: "Supreme",
    slug: "supreme",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80",
    productCount: 4,
    sortOrder: 1,
    active: true,
    createdAt: "2026-08-25T13:30:00.000Z",
  },
  {
    id: 9,
    brandId: 9,
    subcategoryId: 4,
    subcategoryName: "CPVC & PVC Pipes",
    categoryId: 3,
    categoryName: "Plumbing",
    name: "Astral",
    slug: "astral",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb180c5f7?w=200&auto=format&fit=crop&q=80",
    productCount: 3,
    sortOrder: 2,
    active: true,
    createdAt: "2026-08-25T14:00:00.000Z",
  },
  {
    id: 10,
    brandId: 10,
    subcategoryId: 5,
    subcategoryName: "Power Tools",
    categoryId: 4,
    categoryName: "Tools & Equipment",
    name: "Bosch",
    slug: "bosch",
    imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&auto=format&fit=crop&q=80",
    productCount: 5,
    sortOrder: 1,
    active: true,
    createdAt: "2026-08-25T14:30:00.000Z",
  },
  {
    id: 11,
    brandId: 11,
    subcategoryId: 5,
    subcategoryName: "Power Tools",
    categoryId: 4,
    categoryName: "Tools & Equipment",
    name: "DeWalt",
    slug: "dewalt",
    imageUrl: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=200&auto=format&fit=crop&q=80",
    productCount: 3,
    sortOrder: 2,
    active: true,
    createdAt: "2026-08-25T15:00:00.000Z",
  },
  {
    id: 12,
    brandId: 12,
    subcategoryId: 6,
    subcategoryName: "Paints & Primers",
    categoryId: 5,
    categoryName: "Finishes & Paints",
    name: "Asian Paints",
    slug: "asian-paints",
    imageUrl: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=200&auto=format&fit=crop&q=80",
    productCount: 4,
    sortOrder: 1,
    active: true,
    createdAt: "2026-08-25T15:30:00.000Z",
  },
];

export const getStoredBrands = () => {
  if (typeof window === "undefined") return INITIAL_BRANDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BRANDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BRANDS, JSON.stringify(INITIAL_BRANDS));
      return INITIAL_BRANDS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const valid = parsed.filter((b) => b && typeof b === "object" && (b.name || b.brandId || b.id));
      return valid.length > 0 ? valid : INITIAL_BRANDS;
    }
    return INITIAL_BRANDS;
  } catch {
    return INITIAL_BRANDS;
  }
};

export const setStoredBrands = (brands) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_BRANDS, JSON.stringify(brands));
  } catch {}
};

export const resolveBrandImage = (url, name = "") => {
  const safeName = String(name || "").trim();
  if (!url || typeof url !== "string") {
    const matchedPreset = BRAND_PRESET_LOGOS.find(
      (p) =>
        p.name.toLowerCase() === safeName.toLowerCase() ||
        (safeName && p.name.toLowerCase().includes(safeName.toLowerCase().split(" ")[0]))
    );
    if (matchedPreset) return matchedPreset.url;
    return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&auto=format&fit=crop&q=80";
  }
  return url;
};

export const normalizeBrand = (brand) => {
  if (!brand || typeof brand !== "object") return null;
  const id = brand.brandId ?? brand.id ?? brand._id;
  const rawSubcatId = brand.subcategoryId ?? brand.sub_category_id;
  const rawCatId = brand.categoryId ?? brand.category_id;

  const subcategoryId = rawSubcatId !== undefined && rawSubcatId !== null && rawSubcatId !== ""
    ? rawSubcatId
    : "";
  const categoryId = rawCatId !== undefined && rawCatId !== null && rawCatId !== ""
    ? rawCatId
    : "";

  // Look up lineage from subcategories & categories safely
  let allSubcategories = [];
  try {
    const subs = getStoredSubcategories();
    allSubcategories = Array.isArray(subs) ? subs : [];
  } catch {
    allSubcategories = [];
  }

  const matchedSub = allSubcategories.find(
    (s) => s && String(s.subcategoryId || s.id) === String(subcategoryId)
  );

  let allCategories = [];
  try {
    const cats = getStoredCategories();
    allCategories = Array.isArray(cats) ? cats : [];
  } catch {
    allCategories = [];
  }

  const effectiveCatId = categoryId || (matchedSub ? String(matchedSub.categoryId || matchedSub.category_id) : "");
  const matchedCat = allCategories.find(
    (c) => c && String(c.categoryId || c.id) === String(effectiveCatId)
  );

  const subcategoryName = brand.subcategoryName || matchedSub?.name || (matchedCat ? `${matchedCat.name} (General)` : "General Subcategory");
  const categoryName = brand.categoryName || matchedCat?.name || "General Category";

  return {
    id: id ? (typeof id === "number" ? id : String(id)) : Date.now(),
    brandId: id ? (typeof id === "number" ? id : String(id)) : Date.now(),
    subcategoryId: subcategoryId || (matchedSub ? (matchedSub.subcategoryId || matchedSub.id) : ""),
    subcategoryName,
    categoryId: effectiveCatId || (matchedCat ? (matchedCat.categoryId || matchedCat.id) : ""),
    categoryName,
    name: brand.name || brand.title || "Untitled Brand",
    slug: brand.slug || slugify(brand.name || "brand"),
    imageUrl: resolveBrandImage(brand.imageUrl || brand.image || brand.logoUrl || "", brand.name || brand.title || ""),
    sortOrder: Number(brand.sortOrder ?? brand.displayOrder ?? 1),
    productCount: Number(brand.productCount ?? brand.productsCount ?? 0),
    active: brand.active ?? brand.isActive ?? true,
    createdAt: brand.createdAt || new Date().toISOString(),
  };
};

const list = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.brands)) return payload.data.brands;
  if (Array.isArray(payload?.brands)) return payload.brands;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

export const getBrands = async (filters = {}) => {
  const localBrands = (getStoredBrands() || []).map(normalizeBrand).filter(Boolean);
  const deletedIds = getDeletedBrandIds();

  try {
    const params = new URLSearchParams();
    if (filters.subcategoryId) params.append("subcategoryId", filters.subcategoryId);
    if (filters.categoryId) params.append("categoryId", filters.categoryId);
    if (filters.active !== undefined) params.append("active", filters.active);
    if (filters.search) params.append("search", filters.search);

    const queryStr = params.toString() ? `?${params.toString()}` : "";
    const res = await api.get(`/brands${queryStr}`);
    const remoteList = list(res.data).map(normalizeBrand).filter(Boolean);

    if (remoteList.length > 0) {
      // Merge remote and local
      const map = new Map();
      remoteList.forEach((b) => {
        if (b && !deletedIds.has(String(b.id))) map.set(String(b.id), b);
      });
      localBrands.forEach((b) => {
        if (b && !isRemoteId(b.id) && !deletedIds.has(String(b.id))) {
          map.set(String(b.id), b);
        }
      });
      const merged = Array.from(map.values()).filter(Boolean).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setStoredBrands(merged);
      return merged;
    }
  } catch (err) {
    console.warn("Backend /brands unavailable, using local data store:", err?.message);
  }

  let result = localBrands.filter((b) => b && !deletedIds.has(String(b.id)));
  if (filters.subcategoryId) {
    result = result.filter((b) => Number(b.subcategoryId) === Number(filters.subcategoryId));
  }
  if (filters.categoryId) {
    result = result.filter((b) => Number(b.categoryId) === Number(filters.categoryId));
  }
  if (filters.active !== undefined) {
    result = result.filter((b) => Boolean(b.active) === Boolean(filters.active));
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q));
  }

  return result.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
};

export const getBrandById = async (id) => {
  try {
    const res = await api.get(`/brands/${id}`);
    const data = res.data?.data || res.data?.brand || res.data;
    return normalizeBrand(data);
  } catch {
    const local = getStoredBrands().map(normalizeBrand);
    return local.find((b) => String(b.id) === String(id) || String(b.brandId) === String(id)) || null;
  }
};

export const createBrand = async (brandData) => {
  let processedImage = brandData.imageUrl || "";
  if (processedImage.startsWith("data:image")) {
    try {
      processedImage = await compressImage(processedImage, 400, 400, 0.85);
    } catch {}
  }

  const name = (brandData.name || brandData.title || "").trim();
  const slug = brandData.slug ? slugify(brandData.slug) : slugify(name);
  const rawSubcatId = brandData.subcategoryId ?? brandData.sub_category_id;
  const rawCatId = brandData.categoryId ?? brandData.category_id;
  const subcategoryId = rawSubcatId !== undefined && rawSubcatId !== null && rawSubcatId !== ""
    ? (typeof rawSubcatId === "number" ? rawSubcatId : (!isNaN(Number(rawSubcatId)) ? Number(rawSubcatId) : rawSubcatId))
    : "";
  const categoryId = rawCatId !== undefined && rawCatId !== null && rawCatId !== ""
    ? (typeof rawCatId === "number" ? rawCatId : (!isNaN(Number(rawCatId)) ? Number(rawCatId) : rawCatId))
    : "";

  const cleanImage = processedImage.startsWith("blob:") ? "" : processedImage;

  const payload = {
    name,
    slug,
    subcategoryId: !isNaN(Number(subcategoryId)) && subcategoryId !== "" ? Number(subcategoryId) : subcategoryId,
    categoryId: !isNaN(Number(categoryId)) && categoryId !== "" ? Number(categoryId) : categoryId,
    logoUrl: cleanImage,
    imageUrl: cleanImage,
    image: cleanImage,
    website: (brandData.website || "").trim() || null,
    sortOrder: Number(brandData.sortOrder || 1),
    active: brandData.active !== undefined ? Boolean(brandData.active) : true,
  };

  let createdBrand = null;
  let lastError = null;

  // Try endpoints: POST /brands -> POST /admin/brands
  const endpoints = ["/brands", "/admin/brands"];
  for (const ep of endpoints) {
    try {
      const res = await api.post(ep, payload);
      const remoteData = res.data?.data || res.data?.brand || res.data;
      if (remoteData) {
        createdBrand = normalizeBrand(remoteData);
        lastError = null;
        break;
      }
    } catch (err) {
      lastError = err;
      if (err?.response?.status === 409) {
        // Unique slug conflict: auto-retry with timestamp suffix
        try {
          const uniqueSlug = `${slug}-${Date.now().toString().slice(-4)}`;
          const retryRes = await api.post(ep, { ...payload, slug: uniqueSlug });
          const remoteData = retryRes.data?.data || retryRes.data?.brand || retryRes.data;
          if (remoteData) {
            createdBrand = normalizeBrand(remoteData);
            lastError = null;
            break;
          }
        } catch (retryErr) {
          lastError = retryErr;
        }
      }
      if (err?.response?.status !== 404) {
        break;
      }
    }
  }

  if (!createdBrand && lastError) {
    console.error("Backend createBrand rejected by server:", lastError?.response?.data || lastError?.message);
    throw lastError;
  }

  if (createdBrand) {
    const current = (getStoredBrands() || []).map(normalizeBrand).filter(Boolean);
    const updated = [createdBrand, ...current.filter((b) => b && String(b.id) !== String(createdBrand.id))];
    setStoredBrands(updated);
    invalidateRequest("/brands");
    dispatchDataUpdate("brands", "CREATE", createdBrand);
    return createdBrand;
  }

  throw new Error("Failed to save brand to backend database.");
};

export const updateBrand = async (id, brandData) => {
  let processedImage = brandData.imageUrl;
  if (processedImage && processedImage.startsWith("data:image")) {
    try {
      processedImage = await compressImage(processedImage, 400, 400, 0.85);
    } catch {}
  }

  const name = (brandData.name || brandData.title || "").trim();
  const slug = brandData.slug ? slugify(brandData.slug) : slugify(name);
  const rawSubcatId = brandData.subcategoryId ?? brandData.sub_category_id;
  const rawCatId = brandData.categoryId ?? brandData.category_id;
  const subcategoryId = rawSubcatId !== undefined && rawSubcatId !== null && rawSubcatId !== ""
    ? (typeof rawSubcatId === "number" ? rawSubcatId : (!isNaN(Number(rawSubcatId)) ? Number(rawSubcatId) : rawSubcatId))
    : "";
  const categoryId = rawCatId !== undefined && rawCatId !== null && rawCatId !== ""
    ? (typeof rawCatId === "number" ? rawCatId : (!isNaN(Number(rawCatId)) ? Number(rawCatId) : rawCatId))
    : "";

  const cleanImage = (processedImage || "").startsWith("blob:") ? "" : (processedImage || "");

  const payload = {
    name,
    slug,
    subcategoryId: !isNaN(Number(subcategoryId)) && subcategoryId !== "" ? Number(subcategoryId) : subcategoryId,
    categoryId: !isNaN(Number(categoryId)) && categoryId !== "" ? Number(categoryId) : categoryId,
    logoUrl: cleanImage,
    imageUrl: cleanImage,
    image: cleanImage,
    sortOrder: Number(brandData.sortOrder || 1),
    active: brandData.active !== undefined ? Boolean(brandData.active) : true,
  };

  let updatedBrand = null;
  if (isRemoteId(id)) {
    const endpoints = [`/brands/${id}`, `/admin/brands/${id}`];
    for (const ep of endpoints) {
      try {
        const res = await api.put(ep, payload);
        const remoteData = res.data?.data || res.data?.brand || res.data;
        if (remoteData) {
          updatedBrand = normalizeBrand(remoteData);
          break;
        }
      } catch (err) {
        if (err?.response?.status !== 404) {
          console.warn(`Backend updateBrand(${id}) error on ${ep}:`, err?.message);
          break;
        }
      }
    }
  }

  const current = (getStoredBrands() || []).map(normalizeBrand).filter(Boolean);
  const existing = current.find((b) => b && (String(b.id) === String(id) || String(b.brandId) === String(id)));

  if (!updatedBrand) {
    updatedBrand = normalizeBrand({
      ...(existing || {}),
      ...payload,
      id: Number(id),
      brandId: Number(id),
    });
  }

  const updatedList = current.map((b) =>
    b && (String(b.id) === String(id) || String(b.brandId) === String(id)) ? updatedBrand : b
  ).filter(Boolean);
  setStoredBrands(updatedList);

  invalidateRequest("/brands");
  dispatchDataUpdate("brands", "UPDATE", updatedBrand);

  return updatedBrand;
};

export const toggleBrandActive = async (brand) => {
  const id = brand?.brandId || brand?.id;
  const newActive = !(brand?.active ?? brand?.isActive ?? true);

  if (isRemoteId(id)) {
    try {
      await api.patch(`/brands/${id}/toggle-active`, { active: newActive });
    } catch {
      try {
        await api.put(`/brands/${id}`, { ...brand, active: newActive });
      } catch {}
    }
  }

  const current = (getStoredBrands() || []).map(normalizeBrand).filter(Boolean);
  const updatedList = current.map((b) =>
    b && (String(b.id) === String(id) || String(b.brandId) === String(id))
      ? { ...b, active: newActive }
      : b
  ).filter(Boolean);
  setStoredBrands(updatedList);

  invalidateRequest("/brands");
  dispatchDataUpdate("brands", "TOGGLE_ACTIVE", { id, active: newActive });

  return { id, active: newActive };
};

export const deleteBrand = async (id) => {
  if (isRemoteId(id)) {
    try {
      await api.delete(`/brands/${id}`);
    } catch (err) {
      if (err?.response?.status === 404) {
        try {
          await api.delete(`/admin/brands/${id}`);
        } catch {}
      } else {
        console.warn(`Backend deleteBrand(${id}) failed:`, err?.message);
      }
    }
  }

  markBrandDeleted(id);
  const current = (getStoredBrands() || []).map(normalizeBrand).filter(Boolean);
  const filtered = current.filter((b) => b && String(b.id) !== String(id) && String(b.brandId) !== String(id));
  setStoredBrands(filtered);

  invalidateRequest("/brands");
  dispatchDataUpdate("brands", "DELETE", { id });

  return { success: true, id };
};
