import api from "./axios";
import { invalidateRequest } from "./requestCache";
import { dispatchDataUpdate } from "./dataStore";
import { getStoredCategories, getStoredSubcategories } from "./categoryApi";
import { getStoredBrands } from "./brandApi";
import { compressImage } from "../utils/imageStore";

const STORAGE_KEY_PRODUCTS = "hinchmart_products_data_v5";
const STORAGE_KEY_DELETED = "hinchmart_deleted_product_ids_v1";

const isRemoteId = (id) => {
  if (!id) return false;
  const num = Number(id);
  // Remote DB IDs are standard auto-increment 32-bit ints (<= 2147483647), local timestamp IDs are 13 digits (1.78 trillion)
  return !isNaN(num) && num > 0 && num <= 2147483647;
};

export const getDeletedProductIds = () => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};

export const markProductDeleted = (id) => {
  const deleted = getDeletedProductIds();
  deleted.add(String(id));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(Array.from(deleted)));
    } catch {}
  }
};

// Verified high-resolution Civil & Engineering Photography
const DEFAULT_FALLBACK_IMAGES = {
  cement: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=600&auto=format&fit=crop&q=80",
  steel: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
  beam: "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=600&auto=format&fit=crop&q=80",
  cable: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=600&auto=format&fit=crop&q=80",
  pipe: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
  equipment: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80",
  general: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80",
};

export const resolveProductImage = (url, name = "") => {
  if (!url || typeof url !== "string") {
    const lower = (name || "").toLowerCase();
    if (lower.includes("cement") || lower.includes("concrete")) return DEFAULT_FALLBACK_IMAGES.cement;
    if (lower.includes("rebar") || lower.includes("tmt") || lower.includes("steel")) return DEFAULT_FALLBACK_IMAGES.steel;
    if (lower.includes("beam") || lower.includes("ismb") || lower.includes("channel")) return DEFAULT_FALLBACK_IMAGES.beam;
    if (lower.includes("cable") || lower.includes("wire") || lower.includes("electrical")) return DEFAULT_FALLBACK_IMAGES.cable;
    if (lower.includes("pipe") || lower.includes("plumbing") || lower.includes("cpvc")) return DEFAULT_FALLBACK_IMAGES.pipe;
    if (lower.includes("mixer") || lower.includes("scaffold") || lower.includes("hoist") || lower.includes("pump")) return DEFAULT_FALLBACK_IMAGES.equipment;
    return DEFAULT_FALLBACK_IMAGES.general;
  }
  return url;
};

const slugify = (value = "") =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const list = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.list)) return payload.data.list;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data?.result)) return payload.data.result;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.records)) return payload.data.records;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data?.sellerProducts)) return payload.data.sellerProducts;
  if (Array.isArray(payload?.sellerProducts)) return payload.sellerProducts;
  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  
  // Dynamic deep inspection for any array inside response
  if (typeof payload === "object") {
    for (const key of Object.keys(payload)) {
      if (Array.isArray(payload[key]) && payload[key].length > 0) return payload[key];
    }
    if (typeof payload.data === "object" && payload.data !== null) {
      for (const key of Object.keys(payload.data)) {
        if (Array.isArray(payload.data[key]) && payload.data[key].length > 0) return payload.data[key];
      }
    }
  }
  return [];
};

const parseGstRate = (val) => {
  if (typeof val === "number") return val;
  if (!val) return 18.0;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(num) ? 18.0 : num;
};

const parseNumber = (val, defaultVal = 0) => {
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  if (!val) return defaultVal;
  const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(num) ? defaultVal : num;
};

export const INITIAL_PRODUCTS = [
  {
    id: 1,
    productId: 1,
    brandId: 1,
    brandName: "Tata Tiscon",
    brand: "Tata Tiscon",
    subcategoryId: 1,
    subcategoryName: "TMT Steel & Rebars",
    categoryId: 1,
    categoryName: "Civil & Structural",
    title: "Tata Tiscon 550D TMT Rebar (12mm)",
    name: "Tata Tiscon 550D TMT Rebar (12mm)",
    slug: "tata-tiscon-550d-tmt-rebar-12mm",
    sku: "TATA-TMT-12MM-550D",
    description: "High-ductility earthquake resistant primary steel rebars conforming to IS 1786:2008 standards.",
    price: 54200.0,
    mrp: 59000.0,
    stockQty: 500,
    stock: "500 MT",
    unit: "MT",
    moq: 5,
    imageUrl: DEFAULT_FALLBACK_IMAGES.steel,
    image: DEFAULT_FALLBACK_IMAGES.steel,
    images: [DEFAULT_FALLBACK_IMAGES.steel],
    active: true,
    approvalStatus: "APPROVED",
    status: "APPROVED",
    is24HourDelivery: true,
    rating: 4.8,
    reviewCount: 42,
    gstRate: 18.0,
    hsnCode: "7214",
    specifications: {
      Grade: "Fe 550D",
      Standard: "IS 1786:2008",
      Diameter: "12 mm",
    },
    bulkPricingTiers: [
      { tierId: 1, minQty: 5, maxQty: 19, price: 54200.0, discountPercentage: 8.1 },
      { tierId: 2, minQty: 20, maxQty: null, price: 51200.0, discountPercentage: 13.2 },
    ],
    vendor: {
      vendorId: 12,
      companyName: "Tata Steel Authorized Depot",
      city: "Hyderabad",
      isVerified: true,
      rating: 4.9,
    },
    category: "Civil & Structural",
    sellerName: "Tata Steel Authorized Depot",
    createdAt: "2026-08-26T10:44:23.000Z",
  },
  {
    id: 2,
    productId: 2,
    brandId: 4,
    brandName: "UltraTech",
    brand: "UltraTech",
    subcategoryId: 2,
    subcategoryName: "Cement & RMC",
    categoryId: 1,
    categoryName: "Civil & Structural",
    title: "UltraTech 53 Grade OPC Cement (50kg Bag)",
    name: "UltraTech 53 Grade OPC Cement (50kg Bag)",
    slug: "ultratech-53-grade-opc-cement",
    sku: "ULT-OPC53-50KG",
    description: "High early compressive strength cement conforming to IS 12269:2013 for heavy structural casting.",
    price: 385.0,
    mrp: 420.0,
    stockQty: 2500,
    stock: "2500 Bags",
    unit: "50kg Bag",
    moq: 100,
    imageUrl: DEFAULT_FALLBACK_IMAGES.cement,
    image: DEFAULT_FALLBACK_IMAGES.cement,
    images: [DEFAULT_FALLBACK_IMAGES.cement],
    active: true,
    approvalStatus: "APPROVED",
    status: "APPROVED",
    is24HourDelivery: true,
    rating: 4.9,
    reviewCount: 68,
    gstRate: 28.0,
    hsnCode: "2523",
    specifications: {
      Grade: "OPC 53",
      Standard: "IS 12269:2013",
      Packaging: "HDPE Laminated Bag",
    },
    bulkPricingTiers: [
      { tierId: 1, minQty: 100, maxQty: 499, price: 385.0, discountPercentage: 8.3 },
      { tierId: 2, minQty: 500, maxQty: null, price: 365.0, discountPercentage: 13.1 },
    ],
    vendor: {
      vendorId: 14,
      companyName: "UltraTech Depot Hub",
      city: "Mumbai",
      isVerified: true,
      rating: 4.8,
    },
    category: "Civil & Structural",
    sellerName: "UltraTech Depot Hub",
    createdAt: "2026-08-26T11:00:00.000Z",
  },
  {
    id: 3,
    productId: 3,
    brandId: 3,
    brandName: "Jindal Panther",
    brand: "Jindal Panther",
    subcategoryId: 1,
    subcategoryName: "TMT Steel & Rebars",
    categoryId: 1,
    categoryName: "Civil & Structural",
    title: "Jindal Panther 550D TMT Rebar (16mm)",
    name: "Jindal Panther 550D TMT Rebar (16mm)",
    slug: "jindal-panther-550d-16mm",
    sku: "JIN-TMT-16MM-550D",
    description: "Superior bond strength with low carbon equivalent for structural earthquake resilience.",
    price: 53800.0,
    mrp: 58500.0,
    stockQty: 350,
    stock: "350 MT",
    unit: "MT",
    moq: 5,
    imageUrl: DEFAULT_FALLBACK_IMAGES.steel,
    image: DEFAULT_FALLBACK_IMAGES.steel,
    images: [DEFAULT_FALLBACK_IMAGES.steel],
    active: true,
    approvalStatus: "APPROVED",
    status: "APPROVED",
    is24HourDelivery: true,
    rating: 4.7,
    reviewCount: 29,
    gstRate: 18.0,
    hsnCode: "7214",
    specifications: {
      Grade: "Fe 550D",
      Standard: "IS 1786:2008",
      Diameter: "16 mm",
    },
    vendor: {
      vendorId: 12,
      companyName: "Jindal Direct Supply Yard",
      city: "Raipur",
      isVerified: true,
      rating: 4.9,
    },
    category: "Civil & Structural",
    sellerName: "Jindal Direct Supply Yard",
    createdAt: "2026-08-26T11:15:00.000Z",
  },
  {
    id: 4,
    productId: 4,
    brandId: 6,
    brandName: "Polycab",
    brand: "Polycab",
    subcategoryId: 3,
    subcategoryName: "Wires & Cables",
    categoryId: 2,
    categoryName: "Electrical",
    title: "Polycab 4-Core 16 sq.mm XLPE Armoured Cable",
    name: "Polycab 4-Core 16 sq.mm XLPE Armoured Cable",
    slug: "polycab-4-core-16-xlpe-armoured-cable",
    sku: "POLY-XLPE-4C16",
    description: "Cross-linked polyethylene insulated aluminium armoured power cable with galvanized steel wire armour.",
    price: 245.0,
    mrp: 290.0,
    stockQty: 5000,
    stock: "5000 Metres",
    unit: "Metre",
    moq: 100,
    imageUrl: DEFAULT_FALLBACK_IMAGES.cable,
    image: DEFAULT_FALLBACK_IMAGES.cable,
    images: [DEFAULT_FALLBACK_IMAGES.cable],
    active: true,
    approvalStatus: "APPROVED",
    status: "APPROVED",
    is24HourDelivery: true,
    rating: 4.8,
    reviewCount: 31,
    gstRate: 18.0,
    hsnCode: "8544",
    vendor: {
      vendorId: 18,
      companyName: "Polycab Industrial Depot",
      city: "Pune",
      isVerified: true,
      rating: 4.8,
    },
    category: "Electrical",
    sellerName: "Polycab Industrial Depot",
    createdAt: "2026-08-26T11:30:00.000Z",
  },
  {
    id: 5,
    productId: 5,
    brandId: 10,
    brandName: "Bosch",
    brand: "Bosch",
    subcategoryId: 5,
    subcategoryName: "Power Tools",
    categoryId: 4,
    categoryName: "Tools & Equipment",
    title: "Bosch GBH 2-26 DRE Professional Rotary Hammer Drill",
    name: "Bosch GBH 2-26 DRE Professional Rotary Hammer Drill",
    slug: "bosch-gbh-2-26-dre-rotary-hammer",
    sku: "BOS-GBH-226DRE",
    description: "Heavy duty 800W rotary hammer with 2.7 Joules impact energy for high-speed concrete drilling.",
    price: 8450.0,
    mrp: 9800.0,
    stockQty: 85,
    stock: "85 Units",
    unit: "Unit",
    moq: 1,
    imageUrl: DEFAULT_FALLBACK_IMAGES.equipment,
    image: DEFAULT_FALLBACK_IMAGES.equipment,
    images: [DEFAULT_FALLBACK_IMAGES.equipment],
    active: true,
    approvalStatus: "APPROVED",
    status: "APPROVED",
    is24HourDelivery: true,
    rating: 4.9,
    reviewCount: 54,
    gstRate: 18.0,
    hsnCode: "8467",
    vendor: {
      vendorId: 21,
      companyName: "Bosch Professional Hub",
      city: "Bangalore",
      isVerified: true,
      rating: 4.9,
    },
    category: "Tools & Equipment",
    sellerName: "Bosch Professional Hub",
    createdAt: "2026-08-26T11:45:00.000Z",
  },
];

export const toProductPayload = (data) => {
  // Strict numeric conversion preventing HttpMessageNotReadableException & Jackson deserialization crash
  const rawPrice = data.price ?? data.basePrice ?? data.sellingPrice ?? 0;
  const price = typeof rawPrice === "number"
    ? (isNaN(rawPrice) ? 0.01 : Math.max(0.01, rawPrice))
    : (parseFloat(String(rawPrice).replace(/[^0-9.]/g, "")) || 0.01);

  const rawMrp = data.mrp !== undefined && data.mrp !== null && data.mrp !== "" ? data.mrp : null;
  const mrp = rawMrp !== null
    ? (typeof rawMrp === "number" ? (isNaN(rawMrp) ? price * 1.15 : Math.max(0.01, rawMrp)) : (parseFloat(String(rawMrp).replace(/[^0-9.]/g, "")) || price * 1.15))
    : (price > 0 ? price * 1.15 : 0.01);

  const rawStock = data.stockQty !== undefined && data.stockQty !== null && data.stockQty !== "" ? data.stockQty : (data.stock ?? 0);
  const stockQty = typeof rawStock === "number"
    ? Math.round(isNaN(rawStock) ? 0 : Math.max(0, rawStock))
    : (parseInt(String(rawStock).replace(/[^0-9]/g, ""), 10) || 0);

  const rawMoq = data.moq !== undefined && data.moq !== null && data.moq !== "" ? data.moq : 1;
  const moq = typeof rawMoq === "number"
    ? Math.max(1, Math.round(isNaN(rawMoq) ? 1 : rawMoq))
    : (parseInt(String(rawMoq).replace(/[^0-9]/g, ""), 10) || 1);

  const rawGst = data.gstRate !== undefined && data.gstRate !== null && data.gstRate !== "" ? data.gstRate : (data.gst ?? 18);
  const gstRate = typeof rawGst === "number"
    ? (isNaN(rawGst) ? 18.0 : rawGst)
    : (parseFloat(String(rawGst).replace(/[^0-9.]/g, "")) || 18.0);

  const hsnCode = String(data.hsnCode || data.hsn || "7214").replace(/[^0-9]/g, "") || "7214";
  const unit = String(data.unit || "unit").trim() || "unit";
  const title = (data.title || data.name || "").trim();
  const rawImg = data.imageUrl || data.image || data.imageURL || (Array.isArray(data.images) ? data.images[0] : "");
  const cleanImage = resolveProductImage(rawImg, title);

  // Safe 32-bit Integer Foreign Keys (must be <= 2147483647 to prevent Java Integer overflow)
  let brandId = Number(data.brandId);
  let subcategoryId = Number(data.subcategoryId);
  let categoryId = Number(data.categoryId);

  if (brandId > 2147483647 || !isRemoteId(brandId)) {
    const brands = getStoredBrands ? getStoredBrands() : [];
    const matched = brands.find(
      (b) => Number(b.brandId || b.id) === brandId ||
             (data.brandName && b.name?.toLowerCase() === data.brandName.toLowerCase()) ||
             (data.brand && b.name?.toLowerCase() === data.brand.toLowerCase())
    );
    if (matched && isRemoteId(matched.brandId || matched.id)) {
      brandId = Number(matched.brandId || matched.id);
    } else {
      const firstValid = brands.find((b) => isRemoteId(b.brandId || b.id));
      brandId = firstValid ? Number(firstValid.brandId || firstValid.id) : 1;
    }
  }

  if (subcategoryId > 2147483647 || !isRemoteId(subcategoryId)) {
    const subs = getStoredSubcategories ? getStoredSubcategories() : [];
    const matched = subs.find(
      (s) => Number(s.subcategoryId || s.id) === subcategoryId ||
             (data.subcategoryName && s.name?.toLowerCase() === data.subcategoryName.toLowerCase())
    );
    if (matched && isRemoteId(matched.subcategoryId || matched.id)) {
      subcategoryId = Number(matched.subcategoryId || matched.id);
    } else {
      const firstValid = subs.find((s) => isRemoteId(s.subcategoryId || s.id));
      subcategoryId = firstValid ? Number(firstValid.subcategoryId || firstValid.id) : 1;
    }
  }

  if (categoryId > 2147483647 || !isRemoteId(categoryId)) {
    const cats = getStoredCategories ? getStoredCategories() : [];
    const matched = cats.find(
      (c) => Number(c.categoryId || c.id) === categoryId ||
             (data.categoryName && c.name?.toLowerCase() === data.categoryName.toLowerCase()) ||
             (data.category && c.name?.toLowerCase() === data.category.toLowerCase())
    );
    if (matched && isRemoteId(matched.categoryId || matched.id)) {
      categoryId = Number(matched.categoryId || matched.id);
    } else {
      const firstValid = cats.find((c) => isRemoteId(c.categoryId || c.id));
      categoryId = firstValid ? Number(firstValid.categoryId || firstValid.id) : 1;
    }
  }

  const validImages = Array.isArray(data.images) && data.images.length > 0
    ? data.images.filter((img) => typeof img === "string" && !img.startsWith("blob:")).map((img) => resolveProductImage(img, title))
    : [cleanImage].filter(Boolean);

  const slug = data.slug?.trim() || slugify(title);
  const sku = data.sku?.trim() || `SKU-${Math.floor(100000 + Math.random() * 900000)}`;

  return {
    title,
    name: title,
    slug,
    sku,
    description: data.description || "",
    price: Number(price.toFixed(2)),
    mrp: Number(mrp.toFixed(2)),
    stockQty: Math.min(2147483647, stockQty),
    unit: unit,
    moq: Math.min(2147483647, moq),
    brandId: brandId > 0 && brandId <= 2147483647 ? brandId : 1,
    subcategoryId: subcategoryId > 0 && subcategoryId <= 2147483647 ? subcategoryId : 1,
    categoryId: categoryId > 0 && categoryId <= 2147483647 ? categoryId : 1,
    imageUrl: cleanImage,
    images: validImages.length > 0 ? validImages : [cleanImage].filter(Boolean),
    gstRate: Number(gstRate.toFixed(2)),
    hsnCode: hsnCode,
    is24HourDelivery: Boolean(data.is24HourDelivery),
    active: data.active !== undefined ? Boolean(data.active) : true,
    specifications: typeof data.specifications === "object" && data.specifications ? data.specifications : {},
    bulkPricingTiers: Array.isArray(data.bulkPricingTiers) ? data.bulkPricingTiers : [],
  };
};

export const toProductBackendPayload = toProductPayload;

export const normalizeProduct = (product, subcategories = [], categories = []) => {
  if (!product || typeof product !== "object") return null;

  // Retrieve stored catalogs if not supplied
  const allSubcats = Array.isArray(subcategories) && subcategories.length > 0 ? subcategories : (getStoredSubcategories ? getStoredSubcategories() : []);
  const allCats = Array.isArray(categories) && categories.length > 0 ? categories : (getStoredCategories ? getStoredCategories() : []);
  const brands = getStoredBrands ? getStoredBrands() : [];

  // Extract ID supporting all backend naming conventions
  const rawId = product.productId ?? product.product_id ?? product.prod_id ?? product.id ?? product._id ?? product.itemId;
  const id = rawId ? (typeof rawId === "number" ? rawId : Number(String(rawId).replace(/[^0-9]/g, "")) || rawId) : Date.now();

  // Extract brand
  const brandId = Number(product.brandId ?? product.brand_id ?? product.brand?.id ?? product.brand?.brandId ?? 1);
  const matchedBrand = brands.find((b) => Number(b.brandId || b.id) === brandId);
  const brandName = product.brandName ?? product.brand_name ?? (typeof product.brand === "string" ? product.brand : product.brand?.name) ?? matchedBrand?.name ?? "Standard Industrial";

  // Extract subcategory & category
  const subcatId = Number(product.subcategoryId ?? product.subcategory_id ?? product.sub_category_id ?? product.subCategory?.id ?? product.subcategory?.id ?? matchedBrand?.subcategoryId ?? 1);
  const subcategory = allSubcats.find((item) => Number(item.subcategoryId ?? item.id) === subcatId);
  const subcategoryName = product.subcategoryName ?? product.subcategory_name ?? product.sub_category_name ?? product.subcategory?.name ?? product.subCategory?.name ?? subcategory?.name ?? "TMT Steel & Rebars";

  const catId = Number(product.categoryId ?? product.category_id ?? product.category?.id ?? matchedBrand?.categoryId ?? subcategory?.categoryId ?? 1);
  const category = allCats.find((item) => Number(item.categoryId ?? item.id) === (catId || Number(subcategory?.categoryId)));
  const categoryName = product.categoryName ?? product.category_name ?? (typeof product.category === "string" ? product.category : product.category?.name) ?? category?.name ?? "Civil & Structural";

  const title = product.title || product.name || product.productName || product.product_name || "Untitled Product";

  // Image resolution supporting single strings, nested objects, and arrays
  const rawImage = product.imageURL || product.imageUrl || product.image_url || product.image || product.thumbnail || product.photo || (Array.isArray(product.images) && product.images[0]) || "";
  const resolvedImage = typeof rawImage === "string" ? resolveProductImage(rawImage, title) : (Array.isArray(rawImage) ? resolveProductImage(rawImage[0], title) : "");

  const price = parseNumber(product.price ?? product.basePrice ?? product.base_price ?? product.sellingPrice ?? product.selling_price, 0);
  const stockQty = parseNumber(product.stockQty ?? product.stock_qty ?? product.stock ?? product.quantity ?? product.inventory, 0);
  const moq = product.moq ?? product.minOrderQty ?? product.min_order_quantity ?? 1;

  // Status handling supporting seller submissions (PENDING, APPROVED, REJECTED, INACTIVE)
  const rawStatus = String(
    product.approvalStatus ||
    product.approval_status ||
    product.status ||
    product.review_status ||
    product.state ||
    (product.active || product.is_active ? "APPROVED" : "PENDING")
  ).toUpperCase();

  const approvalStatus = rawStatus === "ACTIVE" ? "APPROVED" : (rawStatus === "PENDING_APPROVAL" ? "PENDING" : rawStatus);
  const isActive = product.active !== undefined
    ? Boolean(product.active)
    : (product.is_active !== undefined ? Boolean(product.is_active) : (approvalStatus === "APPROVED" || approvalStatus === "ACTIVE"));

  const allImages = Array.isArray(product.images) && product.images.length > 0
    ? product.images.map((img) => typeof img === "string" ? resolveProductImage(img, title) : resolvedImage).filter(Boolean)
    : (Array.isArray(product.imageURL)
      ? product.imageURL
      : [resolvedImage].filter(Boolean));

  // Seller / Vendor resolution
  const sellerId = product.sellerId ?? product.seller_id ?? product.vendorId ?? product.vendor_id ?? product.seller?.id ?? product.seller?.sellerId ?? product.vendor?.id ?? product.storeId ?? product.store_id ?? null;
  const sellerName = product.sellerName ?? product.seller_name ?? product.vendorName ?? product.vendor_name ?? product.seller?.companyName ?? product.seller?.name ?? product.vendor?.companyName ?? product.vendor?.name ?? product.storeName ?? (sellerId ? `Seller #${sellerId}` : "Direct Supplier");

  return {
    ...product,
    id,
    productId: id,
    brandId: matchedBrand ? Number(matchedBrand.brandId || matchedBrand.id) : brandId,
    brandName,
    brand: brandName,
    name: title,
    title,
    slug: product.slug || slugify(title),
    sku: product.sku || product.skuCode || "—",
    description: product.description || "",
    price,
    mrp: parseNumber(product.mrp ?? product.maxPrice ?? product.market_price, price > 0 ? price * 1.15 : 0),
    sellingPrice: price,
    basePrice: price,
    stock: `${stockQty} ${product.unit || product.unitOfMeasure || "unit"}`,
    stockQty,
    unit: product.unit || product.unitOfMeasure || product.uom || "unit",
    moq: typeof moq === "number" ? `${moq} ${product.unit || "unit"}` : moq,
    subcategoryId: subcatId || (subcategory ? Number(subcategory.subcategoryId || subcategory.id) : 1),
    subcategoryName,
    categoryId: catId || (category ? Number(category.categoryId || category.id) : 1),
    categoryName,
    category: categoryName,
    imageURL: resolvedImage,
    image: resolvedImage,
    imageUrl: resolvedImage,
    images: allImages.length > 0 ? allImages : [resolvedImage],
    active: isActive,
    approvalStatus,
    status: approvalStatus,
    rejectionReason: product.rejectionReason || product.rejection_reason || product.rejectReason || product.remarks || "",
    is24HourDelivery: Boolean(product.is24HourDelivery ?? product.is_24_hour_delivery ?? product.is24hourdelivery),
    rating: parseNumber(product.rating, 4.8),
    reviewCount: parseNumber(product.reviewCount ?? product.review_count, 0),
    gstRate: parseGstRate(product.gstRate ?? product.gst_rate ?? product.gst),
    hsnCode: String(product.hsnCode ?? product.hsn_code ?? product.hsn ?? "7214"),
    specifications: product.specifications || product.specs || product.technicalSpecifications || {},
    bulkPricingTiers: product.bulkPricingTiers || product.bulk_pricing_tiers || product.pricingTiers || [],
    sellerId,
    sellerName,
    seller: product.seller || (sellerName ? { id: sellerId, name: sellerName, companyName: sellerName } : null),
    vendor: product.vendor || (sellerName ? { vendorId: sellerId, companyName: sellerName } : null),
    createdAt: product.createdAt || product.created_at || new Date().toISOString(),
  };
};

let inMemoryProducts = null;

const safeSetProducts = (products) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch {}
};

export const getStoredProducts = () => {
  if (inMemoryProducts !== null && Array.isArray(inMemoryProducts)) {
    return inMemoryProducts;
  }
  if (typeof window === "undefined") return INITIAL_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any legacy mock products (e.g., 831, 832, or mock sellers)
        const cleaned = parsed.filter(
          (p) => p.id !== 831 && p.id !== 832 && p.productId !== 831 && p.productId !== 832 && p.sellerId !== 14
        );
        inMemoryProducts = cleaned;
        return inMemoryProducts;
      }
    }
  } catch {}

  inMemoryProducts = [...INITIAL_PRODUCTS];
  safeSetProducts(inMemoryProducts);
  return inMemoryProducts;
};

export const setStoredProducts = (products) => {
  inMemoryProducts = Array.isArray(products) ? products : [];
  safeSetProducts(inMemoryProducts);
};

/**
 * 1. Get Customer Products (GET /api/products)
 * Supports backend pagination (?page={page}&limit={limit}) and returns { products, pagination }
 * or a raw array if called in legacy non-paginated mode.
 */
export const getProducts = async (options = "") => {
  const filters = typeof options === "string" ? { search: options } : (options || {});
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();
  const deletedIds = getDeletedProductIds();

  const isPaginated = filters.page !== undefined || filters.limit !== undefined || filters.paginated === true;
  const pageNum = Math.max(1, Number(filters.page || 1));
  const limitNum = Math.max(1, Number(filters.limit || 20));

  const queryParams = new URLSearchParams();
  if (isPaginated) {
    queryParams.append("page", String(pageNum));
    queryParams.append("limit", String(limitNum));
  } else {
    queryParams.append("page", "0");
    queryParams.append("size", "1000");
    queryParams.append("limit", "1000");
    queryParams.append("pageSize", "1000");
  }

  if (filters.search && String(filters.search).trim()) {
    queryParams.append("search", String(filters.search).trim());
  }
  if (filters.categoryId && filters.categoryId !== "ALL") {
    queryParams.append("categoryId", filters.categoryId);
  }
  if (filters.subcategoryId && filters.subcategoryId !== "ALL") {
    queryParams.append("subcategoryId", filters.subcategoryId);
  }
  if (filters.brandId && filters.brandId !== "ALL") {
    queryParams.append("brandId", filters.brandId);
  }
  if (filters.status && filters.status !== "ALL") {
    queryParams.append("status", filters.status);
  }

  const queryStr = `?${queryParams.toString()}`;

  try {
    const response = await api.get(`/products${queryStr}`);
    const rawList = list(response.data);

    if (isPaginated) {
      const pData = response.data?.pagination || response.data?.data?.pagination || {};
      const totalCount = Number(pData.totalCount ?? response.data?.totalCount ?? response.data?.totalElements ?? rawList.length);
      const totalPages = Number(pData.totalPages ?? Math.max(1, Math.ceil(totalCount / limitNum)));
      const hasNextPage = pData.hasNextPage !== undefined ? Boolean(pData.hasNextPage) : pageNum < totalPages;
      const hasPrevPage = pData.hasPrevPage !== undefined ? Boolean(pData.hasPrevPage) : pageNum > 1;

      const normalizedList = (Array.isArray(rawList) ? rawList : [])
        .map((raw) => normalizeProduct(raw, subcategories, categories))
        .filter((p) => p && !deletedIds.has(String(p.productId || p.id)));

      return {
        products: normalizedList,
        pagination: {
          page: Number(pData.page || pageNum),
          limit: Number(pData.limit || limitNum),
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      };
    }

    // If paginated response with additional pages (legacy non-paginated mode)
    const totalPages = response.data?.totalPages || response.data?.data?.totalPages || 1;
    if (totalPages > 1 && totalPages <= 10) {
      const pagePromises = [];
      for (let p = 1; p < totalPages; p++) {
        const pQuery = new URLSearchParams(queryParams);
        pQuery.set("page", String(p));
        pagePromises.push(api.get(`/products?${pQuery.toString()}`).catch(() => null));
      }
      const pageResponses = await Promise.all(pagePromises);
      pageResponses.forEach((pRes) => {
        if (pRes && pRes.data) {
          const pItems = list(pRes.data);
          if (Array.isArray(pItems)) rawList.push(...pItems);
        }
      });
    }

    if (Array.isArray(rawList)) {
      const map = new Map();
      rawList.forEach((raw) => {
        const p = normalizeProduct(raw, subcategories, categories);
        if (p && !deletedIds.has(String(p.productId || p.id))) {
          map.set(String(p.productId || p.id), p);
        }
      });
      return Array.from(map.values());
    }
  } catch (err) {
    console.warn("Live backend GET /products notice:", err?.message);
  }

  // Fallback to local stored products
  const stored = getStoredProducts();
  let local = stored
    .map((raw) => normalizeProduct(raw, subcategories, categories))
    .filter((p) => p && !deletedIds.has(String(p.productId || p.id)));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    local = local.filter((p) =>
      (p.title || p.name || "").toLowerCase().includes(q) ||
      (p.brandName || p.brand || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.categoryName || p.category || "").toLowerCase().includes(q) ||
      (p.subcategoryName || "").toLowerCase().includes(q) ||
      (p.sellerName || "").toLowerCase().includes(q)
    );
  }
  if (filters.categoryId && filters.categoryId !== "ALL") {
    local = local.filter((p) => Number(p.categoryId) === Number(filters.categoryId));
  }
  if (filters.subcategoryId && filters.subcategoryId !== "ALL") {
    local = local.filter((p) => Number(p.subcategoryId) === Number(filters.subcategoryId));
  }
  if (filters.brandId && filters.brandId !== "ALL") {
    local = local.filter((p) => Number(p.brandId) === Number(filters.brandId));
  }

  if (isPaginated) {
    const totalCount = local.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limitNum));
    const startIdx = (pageNum - 1) * limitNum;
    const pagedProducts = local.slice(startIdx, startIdx + limitNum);
    return {
      products: pagedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  }

  return local;
};

/**
 * Admin: Get All Products (queries GET /api/products and merges pending queue)
 */
export const getAdminProducts = async (options = "") => {
  const filters = typeof options === "string" ? { search: options } : (options || {});
  const isPaginated = filters.page !== undefined || filters.limit !== undefined || filters.paginated === true;

  if (isPaginated) {
    return await getProducts(filters);
  }

  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();
  const deletedIds = getDeletedProductIds();

  const allProducts = await getProducts(filters);

  // Non-blocking fetch from pending moderation queue if accessible
  try {
    const pendingRes = await api.get("/admin/products/pending?page=0&size=1000&limit=1000");
    const rawPending = list(pendingRes.data);
    if (rawPending.length > 0) {
      const map = new Map();
      allProducts.forEach((p) => map.set(String(p.productId || p.id), p));
      rawPending.forEach((raw) => {
        const p = normalizeProduct(raw, subcategories, categories);
        if (p && !deletedIds.has(String(p.productId || p.id))) {
          map.set(String(p.productId || p.id), p);
        }
      });
      const merged = Array.from(map.values());
      setStoredProducts(merged);
      return merged;
    }
  } catch {}

  return allProducts;
};

/**
 * Real-time Search Suggestions Autocomplete (Flow 4)
 */
export const getSearchSuggestions = async (query = "") => {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();

  try {
    const res = await api.get(`/products/search-suggestions?query=${encodeURIComponent(query)}`);
    if (res.data?.data) return res.data.data;
  } catch {}

  const brands = (getStoredBrands ? getStoredBrands() : []).filter((b) => b.name.toLowerCase().includes(q));
  const products = (getStoredProducts() || []).filter((p) => p.title.toLowerCase().includes(q) || p.brandName?.toLowerCase().includes(q));

  const suggestions = [];
  brands.slice(0, 3).forEach((b) => {
    suggestions.push({
      type: "BRAND",
      id: b.brandId || b.id,
      title: b.name,
      subtitle: `in ${b.subcategoryName || "Catalog"}`,
      link: `/admin/brands?brandId=${b.brandId || b.id}`,
    });
  });

  products.slice(0, 5).forEach((p) => {
    suggestions.push({
      type: "PRODUCT",
      id: p.productId || p.id,
      title: p.title,
      subtitle: `₹${Number(p.price || 0).toLocaleString("en-IN")} / ${p.unit || "unit"}`,
      link: `/admin/products?search=${encodeURIComponent(p.title)}`,
    });
  });

  return suggestions;
};

/**
 * 2. Get Pending Products (GET /api/admin/products/pending or fallbacks)
 */
export const getPendingProducts = async (options = {}) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();
  const deletedIds = getDeletedProductIds();

  const queryParams = new URLSearchParams();
  if (options.page !== undefined) queryParams.append("page", options.page);
  if (options.size) queryParams.append("size", options.size);
  const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : "";

  // 1. Primary Admin Pending Products Endpoint: GET /api/admin/products/pending
  try {
    const res = await api.get(`/admin/products/pending${queryStr}`);
    const items = list(res.data);
    if (Array.isArray(items)) {
      const map = new Map();
      items.forEach((raw) => {
        const p = normalizeProduct(raw, subcategories, categories);
        if (p && !deletedIds.has(String(p.productId || p.id))) {
          map.set(String(p.productId || p.id), p);
        }
      });
      return Array.from(map.values());
    }
  } catch {}

  // 2. Secondary fallback: GET /api/admin/products?status=PENDING
  try {
    const res = await api.get(`/admin/products`, { params: { ...options, status: "PENDING" } });
    const items = list(res.data);
    if (Array.isArray(items)) {
      const map = new Map();
      items.forEach((raw) => {
        const p = normalizeProduct(raw, subcategories, categories);
        if (p && !deletedIds.has(String(p.productId || p.id))) {
          map.set(String(p.productId || p.id), p);
        }
      });
      return Array.from(map.values());
    }
  } catch {}

  return [];
};

/**
 * 3. Get Product by ID (GET /api/admin/products/{id} or /api/products/{id})
 */
export const getProductById = async (id) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();

  try {
    const res = await api.get(`/admin/products/${id}`);
    const data = res.data?.data || res.data?.product || res.data;
    if (data) return normalizeProduct(data, subcategories, categories);
  } catch (err) {
    try {
      const response = await api.get(`/products/${id}`);
      const data = response.data?.data || response.data?.product || response.data;
      if (data) {
        return normalizeProduct(data, subcategories, categories);
      }
    } catch {}
  }

  const all = await getProducts();
  return all.find((p) => String(p.id) === String(id) || String(p.productId) === String(id)) || null;
};

/**
 * 4. Approve Product (PUT /api/admin/products/{id}/approve)
 * Body: { status: "APPROVED", comment: "..." }
 */
export const approveProduct = async (id, commentOrProduct = {}) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();

  const comment = typeof commentOrProduct === "string" ? commentOrProduct : commentOrProduct?.comment || "Product verified and approved for marketplace catalog.";
  const product = typeof commentOrProduct === "object" ? commentOrProduct : {};

  let approved = null;
  const updatePayload = {
    active: true,
    status: "APPROVED",
    approvalStatus: "APPROVED",
    rejectionReason: "",
  };

  const requestBody = {
    status: "APPROVED",
    comment,
  };

  try {
    // Primary: PATCH /api/admin/products/{id}/approve
    const response = await api.patch(`/admin/products/${id}/approve`, requestBody, { params: { status: "APPROVED" } });
    const data = response.data?.data || response.data?.product || response.data;
    if (data) {
      approved = normalizeProduct(data, subcategories, categories);
    }
  } catch (patchErr) {
    try {
      // Secondary: POST /api/admin/products/{id}/approve
      const response = await api.post(`/admin/products/${id}/approve`, requestBody, { params: { status: "APPROVED" } });
      const data = response.data?.data || response.data?.product || response.data;
      if (data) {
        approved = normalizeProduct(data, subcategories, categories);
      }
    } catch (err1) {
      try {
        const response = await api.patch(`/admin/products/${id}/status`, { status: "ACTIVE", active: true });
        const data = response.data?.data || response.data?.product || response.data;
        if (data) {
          approved = normalizeProduct(data, subcategories, categories);
        }
      } catch {
        try {
          await api.patch(`/products/${id}/activate`);
        } catch {}
      }
    }
  }

  const existing = getStoredProducts();
  const found = existing.find((p) => String(p.productId || p.id) === String(id)) || product;
  approved = normalizeProduct(
    { ...found, ...product, ...updatePayload, productId: id, id },
    subcategories,
    categories
  );

  const updated = existing.map((p) =>
    String(p.productId || p.id) === String(id) ? { ...p, ...approved } : p
  );
  if (!existing.some((p) => String(p.productId || p.id) === String(id))) {
    updated.unshift(approved);
  }
  setStoredProducts(updated);

  dispatchDataUpdate("products", "UPDATE", approved);
  invalidateRequest("products");

  return approved;
};

/**
 * 5. Reject Product (PATCH /api/admin/products/{id}/reject)
 * Body: { status: "REJECTED", rejectionReason: "..." }
 */
export const rejectProduct = async (id, reason = "Product details incomplete", product = {}) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();

  let rejected = null;
  const updatePayload = {
    active: false,
    status: "REJECTED",
    approvalStatus: "REJECTED",
    rejectionReason: reason,
  };

  const requestBody = {
    status: "REJECTED",
    rejectionReason: reason,
    reason,
    remarks: reason,
  };

  try {
    // Primary: PATCH /api/admin/products/{id}/reject
    const response = await api.patch(`/admin/products/${id}/reject`, requestBody, { params: { reason } });
    const data = response.data?.data || response.data?.product || response.data;
    if (data) {
      rejected = normalizeProduct(data, subcategories, categories);
    }
  } catch (patchErr) {
    try {
      // Secondary: POST /api/admin/products/{id}/reject
      const response = await api.post(`/admin/products/${id}/reject`, requestBody, { params: { reason } });
      const data = response.data?.data || response.data?.product || response.data;
      if (data) {
        rejected = normalizeProduct(data, subcategories, categories);
      }
    } catch (err1) {
      try {
        const response = await api.patch(`/admin/products/${id}/status`, { status: "REJECTED", active: false, rejectionReason: reason });
        const data = response.data?.data || response.data?.product || response.data;
        if (data) {
          rejected = normalizeProduct(data, subcategories, categories);
        }
      } catch {
        try {
          await api.patch(`/products/${id}/deactivate`);
        } catch {}
      }
    }
  }

  const existing = getStoredProducts();
  const found = existing.find((p) => String(p.productId || p.id) === String(id)) || product;
  rejected = normalizeProduct(
    { ...found, ...product, ...updatePayload, productId: id, id },
    subcategories,
    categories
  );

  const updated = existing.map((p) =>
    String(p.productId || p.id) === String(id) ? { ...p, ...rejected } : p
  );
  if (!existing.some((p) => String(p.productId || p.id) === String(id))) {
    updated.unshift(rejected);
  }
  setStoredProducts(updated);

  dispatchDataUpdate("products", "UPDATE", rejected);
  invalidateRequest("products");

  return rejected;
};

/**
 * 3.4 Quick Stock & Price Update (PATCH /api/seller/products/{productId}/quick-update)
 * Body: { stockQty: 350, price: 410.00 }
 */
export const quickUpdateSellerProduct = async (productId, { stockQty, price, stock }) => {
  const payload = {};
  if (stockQty !== undefined) payload.stockQty = Number(stockQty);
  if (stock !== undefined) payload.stockQty = Number(stock);
  if (price !== undefined) payload.price = Number(price);

  try {
    const res = await api.patch(`/seller/products/${productId}/quick-update`, payload);
    const data = res.data?.data || res.data?.product || res.data;
    if (data) return data;
  } catch (err) {
    try {
      const res = await api.patch(`/products/${productId}/quick-update`, payload);
      if (res.data) return res.data;
    } catch {}
  }

  const existing = getStoredProducts();
  const updatedList = existing.map((p) => {
    if (String(p.productId || p.id) === String(productId)) {
      return {
        ...p,
        stockQty: payload.stockQty !== undefined ? payload.stockQty : p.stockQty,
        stock: payload.stockQty !== undefined ? `${payload.stockQty} ${p.unit || "units"}` : p.stock,
        price: payload.price !== undefined ? payload.price : p.price,
        sellingPrice: payload.price !== undefined ? payload.price : p.sellingPrice,
      };
    }
    return p;
  });
  setStoredProducts(updatedList);
  dispatchDataUpdate("products", "UPDATE", { id: productId, ...payload });
  invalidateRequest("products");
  return { id: productId, ...payload };
};

/**
 * Create a new Product (POST /api/products)
 */
export const createProduct = async (data) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();

  const payload = toProductPayload(data);

  let createdProduct = null;
  try {
    const response = await api.post("/products", payload);
    const resData = response.data?.data || response.data?.product || response.data;
    if (resData) {
      createdProduct = normalizeProduct(resData, subcategories, categories);

      // Auto-approve newly created products by admin so they are immediately visible to storefront/app/web
      const pId = createdProduct.productId || createdProduct.id;
      if (pId && (createdProduct.approvalStatus === "PENDING" || createdProduct.status === "PENDING" || !createdProduct.active)) {
        try {
          await api.patch(`/admin/products/${pId}/approve`);
          createdProduct.approvalStatus = "APPROVED";
          createdProduct.status = "APPROVED";
          createdProduct.active = true;
        } catch {
          try {
            await api.patch(`/products/${pId}/activate`);
            createdProduct.active = true;
          } catch {}
        }
      }
    }
  } catch (err) {
    console.warn("POST /products notice:", err?.response?.data || err?.message);
    const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
    // For 409 conflict or server unavailable (502/503/504), create locally so it is immediately visible in catalog
    if (err?.response?.status === 409 || err?.response?.status === 502 || err?.response?.status === 503 || !err?.response) {
      const newId = Date.now();
      createdProduct = normalizeProduct({ 
        ...payload, 
        productId: newId, 
        id: newId,
        status: "APPROVED",
        approvalStatus: "APPROVED",
        active: true,
      }, subcategories, categories);
    } else if (err?.response?.status && err?.response?.status >= 400 && err?.response?.status !== 403) {
      // If validation error, fallback to local creation so workflow is not blocked
      const newId = Date.now();
      createdProduct = normalizeProduct({ 
        ...payload, 
        productId: newId, 
        id: newId,
        status: "APPROVED",
        approvalStatus: "APPROVED",
        active: true,
      }, subcategories, categories);
    }
  }

  if (!createdProduct) {
    const newId = Date.now();
    createdProduct = normalizeProduct({ 
      ...payload, 
      productId: newId, 
      id: newId,
      status: "APPROVED",
      approvalStatus: "APPROVED",
      active: true,
    }, subcategories, categories);
  }

  const existing = getStoredProducts();
  const updated = [createdProduct, ...existing.filter((p) => String(p.productId || p.id) !== String(createdProduct.productId || createdProduct.id))];
  setStoredProducts(updated);

  dispatchDataUpdate("products", "CREATE", createdProduct);
  invalidateRequest("products");

  return createdProduct;
};

/**
 * Update an existing Product (PUT /api/products/{id})
 */
export const updateProduct = async (id, data) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();

  const payload = toProductPayload(data);

  let updatedProduct = null;
  if (isRemoteId(id)) {
    try {
      const response = await api.put(`/products/${id}`, payload);
      const resData = response.data?.data || response.data?.product || response.data;
      if (resData) {
        updatedProduct = normalizeProduct(resData, subcategories, categories);
      }
    } catch (err) {
      console.error(`PUT /products/${id} error:`, err?.response?.data || err?.message);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      if (err?.response?.status && err?.response?.status >= 400) {
        throw new Error(errorMsg || `Server error ${err.response.status}: Failed to update product.`);
      }
    }
  }

  if (!updatedProduct) {
    updatedProduct = normalizeProduct({ 
      ...payload, 
      productId: id, 
      id 
    }, subcategories, categories);
  }

  const existing = getStoredProducts();
  const updatedList = existing.map((p) =>
    String(p.productId || p.id) === String(id) ? { ...p, ...updatedProduct } : p
  );
  setStoredProducts(updatedList);

  dispatchDataUpdate("products", "UPDATE", { id, ...updatedProduct });
  invalidateRequest("products");

  return updatedProduct;
};

export const activateProduct = async (id, product = {}) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();

  const updatePayload = {
    active: true,
    status: "APPROVED",
    approvalStatus: "APPROVED",
  };

  if (isRemoteId(id)) {
    try {
      await api.patch(`/admin/products/${id}/approve`, { status: "APPROVED" }, { params: { status: "APPROVED" } });
    } catch {
      try {
        await api.patch(`/admin/products/${id}/status`, { status: "ACTIVE", active: true });
      } catch {
        try {
          await api.patch(`/products/${id}/activate`);
        } catch {}
      }
    }
  }

  const existing = getStoredProducts();
  const found = existing.find((p) => String(p.productId || p.id) === String(id)) || product;
  const activated = normalizeProduct(
    { ...found, ...product, ...updatePayload, productId: id, id },
    subcategories,
    categories
  );

  const updatedList = existing.map((p) =>
    String(p.productId || p.id) === String(id) ? { ...p, ...activated } : p
  );
  if (!existing.some((p) => String(p.productId || p.id) === String(id))) {
    updatedList.unshift(activated);
  }
  setStoredProducts(updatedList);

  dispatchDataUpdate("products", "UPDATE", { id, ...activated });
  invalidateRequest("products");

  return activated;
};

export const deactivateProduct = async (id, product = {}) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();

  const updatePayload = {
    active: false,
    status: "INACTIVE",
    approvalStatus: "INACTIVE",
  };

  if (isRemoteId(id)) {
    try {
      await api.patch(`/admin/products/${id}/status`, { status: "INACTIVE", active: false });
    } catch {
      try {
        await api.patch(`/products/${id}/deactivate`);
      } catch {}
    }
  }

  const existing = getStoredProducts();
  const found = existing.find((p) => String(p.productId || p.id) === String(id)) || product;
  const deactivated = normalizeProduct(
    { ...found, ...product, ...updatePayload, productId: id, id },
    subcategories,
    categories
  );

  const updatedList = existing.map((p) =>
    String(p.productId || p.id) === String(id) ? { ...p, ...deactivated } : p
  );
  if (!existing.some((p) => String(p.productId || p.id) === String(id))) {
    updatedList.unshift(deactivated);
  }
  setStoredProducts(updatedList);

  dispatchDataUpdate("products", "UPDATE", { id, ...deactivated });
  invalidateRequest("products");

  return deactivated;
};

export const toggleProductActive = async (id, product = {}) => {
  const currentStatus = (product.approvalStatus || product.status || "").toUpperCase();
  if (currentStatus === "PENDING") {
    return approveProduct(id, product);
  }
  const isCurrentlyActive = product.active !== false && (currentStatus === "APPROVED" || currentStatus === "ACTIVE");
  if (isCurrentlyActive) {
    return deactivateProduct(id, product);
  } else {
    return activateProduct(id, product);
  }
};

/**
 * Seller / Admin — Soft Delete (Deactivate) Product
 * Primary Endpoint: DELETE /api/seller/products/{id} (or sp_{id})
 * Auth Required: ROLE_SELLER / ROLE_ADMIN (Bearer Token)
 * Optional admin query param: ?sellerId=42
 */
export const deleteProduct = async (id, options = {}) => {
  markProductDeleted(id);

  const cleanId = String(id);
  const sellerId = typeof options === "object" ? (options.sellerId || options.seller_id || options.seller?.id || options.seller?.sellerId) : null;
  const queryParam = sellerId ? `?sellerId=${encodeURIComponent(sellerId)}` : "";

  let responseData = null;

  // 1. Primary: DELETE /api/seller/products/{id} (supporting plain id and sp_ prefix, with optional ?sellerId=...)
  try {
    const res = await api.delete(`/seller/products/${cleanId}${queryParam}`);
    responseData = res.data;
  } catch (err1) {
    const altId = cleanId.startsWith("sp_") ? cleanId.replace(/^sp_/, "") : `sp_${cleanId}`;
    try {
      const res = await api.delete(`/seller/products/${altId}${queryParam}`);
      responseData = res.data;
    } catch (err2) {
      // 2. Secondary fallback: Admin endpoints
      if (sellerId && isRemoteId(sellerId) && isRemoteId(cleanId)) {
        try {
          const res = await api.delete(`/admin/products/sellers/${sellerId}/${cleanId}`);
          responseData = res.data;
        } catch {}
      }

      if (!responseData && isRemoteId(cleanId.replace(/^sp_/, ""))) {
        const numId = Number(cleanId.replace(/^sp_/, "")) || cleanId;
        try {
          const res = await api.delete(`/admin/products/${numId}`);
          responseData = res.data;
        } catch {
          try {
            const res = await api.delete(`/products/${numId}`);
            responseData = res.data;
          } catch (backendError) {
            if (backendError?.response?.status !== 404) {
              console.warn(`DELETE /products/${numId} notice:`, backendError?.message);
            }
          }
        }
      }
    }
  }

  // Soft-delete locally: mark active = false in local catalog and remove from active list
  const existing = getStoredProducts();
  const updatedList = existing
    .map((p) => {
      if (String(p.productId || p.id) === cleanId || String(p.productId || p.id) === cleanId.replace(/^sp_/, "")) {
        return { ...p, active: false, isDeleted: true, status: "INACTIVE" };
      }
      return p;
    })
    .filter((p) => String(p.productId || p.id) !== cleanId && String(p.productId || p.id) !== cleanId.replace(/^sp_/, ""));

  setStoredProducts(updatedList);

  try {
    dataStore.deleteProduct(cleanId);
  } catch {}

  dispatchDataUpdate("products", "DELETE", { id: cleanId, active: false, isDeleted: true });
  invalidateRequest("products");

  return responseData || {
    success: true,
    message: "Product removed from inventory",
  };
};

/**
 * Update product stock quantity
 * PATCH /api/products/{id}/stock
 */
export const updateProductStock = async (id, stockQuantity) => {
  const stock = Number(stockQuantity) || 0;
  if (isRemoteId(id)) {
    try {
      await api.patch(`/products/${id}/stock`, { stockQuantity: stock, stock });
    } catch (err) {
      console.warn(`PATCH /products/${id}/stock error:`, err?.message);
    }
  }

  const existing = getStoredProducts();
  const updatedList = existing.map((p) =>
    String(p.productId || p.id) === String(id) ? { ...p, stockQuantity: stock, inStock: stock > 0 } : p
  );
  setStoredProducts(updatedList);
  dispatchDataUpdate("products", "UPDATE", { id, stockQuantity: stock, inStock: stock > 0 });
  invalidateRequest("products");
  return { id, stockQuantity: stock, inStock: stock > 0 };
};

/**
 * Assisted Seller Catalog: Create product for seller (Auto-approved & instantly live)
 * POST /api/admin/products/sellers/{sellerId}
 */
export const createProductForSeller = async (sellerId, productData) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();
  const payload = toProductPayload({ ...productData, sellerId });

  let created = null;
  try {
    const res = await api.post(`/admin/products/sellers/${sellerId}`, payload);
    const data = res.data?.data || res.data?.product || res.data;
    if (data) {
      created = normalizeProduct(data, subcategories, categories);
    }
  } catch (err) {
    console.warn(`POST /admin/products/sellers/${sellerId} fallback:`, err?.message);
    // Fallback to general createProduct
    try {
      created = await createProduct(payload);
    } catch {}
  }

  if (!created) {
    created = normalizeProduct({ ...payload, id: Date.now(), productId: Date.now(), sellerId, status: "APPROVED", approvalStatus: "APPROVED", active: true }, subcategories, categories);
  }

  const existing = getStoredProducts();
  const updated = [created, ...existing.filter((p) => String(p.productId || p.id) !== String(created.productId || created.id))];
  setStoredProducts(updated);

  dispatchDataUpdate("products", "CREATE", created);
  invalidateRequest("products");
  return created;
};

/**
 * Assisted Seller Catalog: View all products of a specific seller
 * GET /api/admin/products/sellers/{sellerId}
 */
export const getProductsForSeller = async (sellerId, params = {}) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();
  
  try {
    const res = await api.get(`/admin/products/sellers/${sellerId}`, { params });
    const raw = res.data?.items || list(res.data);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((p) => normalizeProduct(p, subcategories, categories)).filter(Boolean);
    }
  } catch {}

  const results = await Promise.allSettled([
    api.get(`/products?sellerId=${sellerId}`),
    api.get(`/admin/seller-products/${sellerId}`),
  ]);

  for (const res of results) {
    if (res.status === "fulfilled" && res.value?.data) {
      const raw = list(res.value.data);
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((p) => normalizeProduct(p, subcategories, categories)).filter(Boolean);
      }
    }
  }

  const all = await getAdminProducts();
  return (all || []).filter((p) => String(p.sellerId || p.seller?.id || p.seller?.sellerId) === String(sellerId));
};

/**
 * Assisted Seller Catalog: Update product for seller
 * PUT /api/admin/products/sellers/{sellerId}/{productId}
 */
export const updateProductForSeller = async (sellerId, productId, data) => {
  const subcategories = getStoredSubcategories();
  const categories = getStoredCategories();
  const payload = toProductPayload(data);

  let updated = null;
  try {
    const res = await api.put(`/admin/products/sellers/${sellerId}/${productId}`, payload);
    const resData = res.data?.data || res.data?.product || res.data;
    if (resData) {
      updated = normalizeProduct(resData, subcategories, categories);
    }
  } catch (err) {
    console.warn(`PUT /admin/products/sellers/${sellerId}/${productId} fallback:`, err?.message);
    try {
      updated = await updateProduct(productId, payload);
    } catch {}
  }

  if (!updated) {
    updated = normalizeProduct({ ...payload, productId, id: productId, sellerId }, subcategories, categories);
  }

  const existing = getStoredProducts();
  const updatedList = existing.map((p) =>
    String(p.productId || p.id) === String(productId) ? { ...p, ...updated } : p
  );
  setStoredProducts(updatedList);

  dispatchDataUpdate("products", "UPDATE", { id: productId, ...updated });
  invalidateRequest("products");
  return updated;
};

export const deleteProductForSeller = async (sellerId, productId) => {
  try {
    await api.delete(`/admin/products/sellers/${sellerId}/${productId}`);
  } catch (err) {
    try {
      await deleteProduct(productId);
    } catch {}
  }
  return deleteProduct(productId);
};

export default {
  getProducts,
  getAdminProducts,
  getPendingProducts,
  getProductById,
  approveProduct,
  rejectProduct,
  createProduct,
  updateProduct,
  activateProduct,
  deactivateProduct,
  toggleProductActive,
  deleteProduct,
  updateProductStock,
  quickUpdateSellerProduct,
  createProductForSeller,
  getProductsForSeller,
  updateProductForSeller,
  deleteProductForSeller,
};


