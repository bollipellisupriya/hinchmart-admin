import api from "./axios";
import { invalidateRequest } from "./requestCache";
import { dispatchDataUpdate } from "./dataStore";

const STORAGE_KEY_BANNERS = "hinchmart_banners_data_v4";

const list = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.banners)) return payload.banners;
  if (Array.isArray(payload?.data?.banners)) return payload.data.banners;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const formatStartDate = (value) => {
  if (!value) return `${new Date().toISOString().slice(0, 10)}T00:00:00`;
  if (value.length === 10) return `${value}T00:00:00`;
  return value;
};

const formatEndDate = (value) => {
  if (!value) return `${new Date().getFullYear() + 1}-12-31T23:59:59`;
  if (value.length === 10) return `${value}T23:59:59`;
  return value;
};

export const POSITION_MAP = {
  HOME_VIDEO: "Home Video Banner",
  HOME_HERO: "Homepage hero",
  HOME_TOP: "Home Top Banner",
  CATEGORY_SPOTLIGHT: "Category spotlight",
  DEALS_CAROUSEL: "Deals carousel",
  BUYER_DASHBOARD: "Buyer dashboard",
  "Home Video Banner": "HOME_VIDEO",
  "Homepage hero": "HOME_HERO",
  "Home Top Banner": "HOME_TOP",
  "Category spotlight": "CATEGORY_SPOTLIGHT",
  "Deals carousel": "DEALS_CAROUSEL",
  "Buyer dashboard": "BUYER_DASHBOARD",
};

export const normalizeBanner = (banner) => {
  if (!banner) return null;
  const id = banner.bannerId ?? banner.id ?? banner._id;
  const image = banner.imageUrl || banner.imageURL || banner.image || banner.posterUrl || "";
  const isLive = banner.active !== false && banner.isActive !== false && banner.status !== "PAUSED" && banner.status !== "DRAFT";

  const rawPosition = banner.position || banner.placement || "HOME_HERO";
  const displayPlacement = POSITION_MAP[rawPosition] || (rawPosition === "HOME_HERO" ? "Homepage hero" : rawPosition);
  const backendPosition = POSITION_MAP[displayPlacement] || rawPosition || "HOME_HERO";

  const cleanVideoUrl = typeof banner.videoUrl === "string" ? banner.videoUrl.trim() : "";

  return {
    ...banner,
    id: id ? (typeof id === "number" ? id : id) : Date.now(),
    bannerId: id ? (typeof id === "number" ? id : Number(String(id).replace(/[^0-9]/g, "")) || id) : Date.now(),
    title: banner.title || "Banner",
    subtitle: banner.subtitle || "",
    badge: banner.badge || "",
    ctaText: banner.ctaText || "Explore now",
    link: banner.link || banner.linkValue || "",
    linkType: banner.linkType || "SCREEN",
    linkValue: banner.linkValue || banner.link || "",
    placement: displayPlacement,
    position: backendPosition,
    imageUrl: image,
    imageURL: image,
    image,
    videoUrl: cleanVideoUrl,
    posterUrl: banner.posterUrl || image || "",
    thumbnailUrl: banner.thumbnailUrl || banner.posterUrl || image || "",
    status: isLive ? "LIVE" : "PAUSED",
    active: isLive,
    isActive: isLive,
    sortOrder: Number(banner.sortOrder || 1),
    startDate: banner.startDate ? banner.startDate.slice(0, 10) : "",
    endDate: banner.endDate ? banner.endDate.slice(0, 10) : "",
  };
};

export const toBannerBackendPayload = (data) => {
  const isLive = data.active !== false && data.isActive !== false && data.status !== "PAUSED";
  
  let pos = data.position;
  if (!pos || pos.includes(" ")) {
    pos = POSITION_MAP[data.placement || data.position] || data.position || "HOME_HERO";
  }

  // Ensure image URL is clean and valid
  let imgUrl = (data.imageUrl || data.imageURL || data.image || data.posterUrl || "").trim();
  if (imgUrl.startsWith("data:image/")) {
    imgUrl = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80";
  }

  let videoUrl = (data.videoUrl || "").trim();
  if (videoUrl.startsWith("blob:") || data.mediaType === "IMAGE") {
    videoUrl = "";
  }

  let posterUrl = (data.posterUrl || imgUrl).trim();

  return {
    title: (data.title || "").trim(),
    subtitle: (data.subtitle || "").trim(),
    imageUrl: imgUrl,
    videoUrl: videoUrl || null,
    posterUrl: posterUrl || imgUrl || null,
    badge: (data.badge || "").trim(),
    ctaText: (data.ctaText || "Explore now").trim(),
    linkType: data.linkType || "SCREEN",
    linkValue: (data.linkValue || data.link || "").trim(),
    position: pos,
    sortOrder: Number(data.sortOrder || 1),
    active: isLive,
    startDate: formatStartDate(data.startDate),
    endDate: formatEndDate(data.endDate),
  };
};

export const SEED_BANNERS = [
  {
    bannerId: 25,
    id: 25,
    title: "Need Materials Urgently on Site?",
    subtitle: "Order essential building, electrical & plumbing materials before 4 PM for guaranteed next-day delivery.",
    imageUrl: "https://hinchmart-storage-191481838776-ap-south-2-an.s3.ap-south-2.amazonaws.com/banners/poster_thumb.jpg",
    videoUrl: "https://hinchmart-storage-191481838776-ap-south-2-an.s3.ap-south-2.amazonaws.com/banners/hinchmart_promo_24h.mp4",
    posterUrl: "https://hinchmart-storage-191481838776-ap-south-2-an.s3.ap-south-2.amazonaws.com/banners/poster_thumb.jpg",
    thumbnailUrl: "https://hinchmart-storage-191481838776-ap-south-2-an.s3.ap-south-2.amazonaws.com/banners/poster_thumb.jpg",
    badge: "24-HOUR DISPATCH",
    ctaText: "Explore 24H Catalog",
    linkType: "SCREEN",
    linkValue: "TwentyFourHourDelivery",
    position: "HOME_VIDEO",
    sortOrder: 1,
    active: true,
    startDate: "2026-10-01T00:00:00",
    endDate: "2027-12-31T23:59:59",
  },
  {
    bannerId: 26,
    id: 26,
    title: "Build better, source smarter",
    subtitle: "Verified industrial supply for every ambitious project with live tracking.",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&auto=format&fit=crop&q=85",
    videoUrl: "",
    posterUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&auto=format&fit=crop&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&auto=format&fit=crop&q=85",
    badge: "PREMIUM SELECTION",
    ctaText: "Explore Marketplace",
    linkType: "CATEGORY",
    linkValue: "civil-structural",
    position: "HOME_HERO",
    sortOrder: 2,
    active: true,
    startDate: "2026-08-01T00:00:00",
    endDate: "2027-12-31T23:59:59",
  },
  {
    bannerId: 27,
    id: 27,
    title: "The tools that keep work moving",
    subtitle: "Precision hardware and power tools from trusted B2B sellers with fast doorstep delivery.",
    imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1400&auto=format&fit=crop&q=85",
    videoUrl: "",
    posterUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1400&auto=format&fit=crop&q=85",
    thumbnailUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1400&auto=format&fit=crop&q=85",
    badge: "PRO HARDWARE",
    ctaText: "Shop Tools Now",
    linkType: "CATEGORY",
    linkValue: "equipment-scaffolding-tools",
    position: "CATEGORY_SPOTLIGHT",
    sortOrder: 3,
    active: true,
    startDate: "2026-09-01T00:00:00",
    endDate: "2027-12-31T23:59:59",
  },
];

let inMemoryBanners = null;

const safeSetBanners = (banners) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_BANNERS, JSON.stringify(banners));
  } catch { }
};

export const getStoredBanners = () => {
  if (inMemoryBanners && inMemoryBanners.length > 0) {
    return inMemoryBanners;
  }
  if (typeof window === "undefined") return SEED_BANNERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BANNERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryBanners = parsed;
        return inMemoryBanners;
      }
    }
  } catch { }
  inMemoryBanners = SEED_BANNERS;
  safeSetBanners(SEED_BANNERS);
  return SEED_BANNERS;
};

export const setStoredBanners = (banners) => {
  inMemoryBanners = banners;
  safeSetBanners(banners);
};

/**
 * 3. Admin: Upload Video File to S3
 * POST /api/banners/{bannerId}/video (or /api/banners/{bannerId}/media)
 * Content-Type: multipart/form-data
 * Form Data Field: file: <video.mp4 or video.webm> (up to 50MB)
 */
export const uploadBannerVideo = async (bannerId, file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post(`/banners/${bannerId}/video`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const videoUrl =
      res.data?.data?.videoUrl ||
      res.data?.videoUrl ||
      res.data?.data?.url ||
      res.data?.url;

    if (videoUrl) {
      // Update local storage representation
      const existing = getStoredBanners();
      const updated = existing.map((b) =>
        String(b.bannerId || b.id) === String(bannerId) ? { ...b, videoUrl } : b
      );
      setStoredBanners(updated);
      dispatchDataUpdate("banners", "UPDATE_VIDEO", { bannerId, videoUrl });
    }
    return videoUrl;
  } catch (err) {
    try {
      const fallbackRes = await api.post(`/banners/${bannerId}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const videoUrl =
        fallbackRes.data?.data?.videoUrl ||
        fallbackRes.data?.videoUrl ||
        fallbackRes.data?.data?.url ||
        fallbackRes.data?.url;

      if (videoUrl) {
        const existing = getStoredBanners();
        const updated = existing.map((b) =>
          String(b.bannerId || b.id) === String(bannerId) ? { ...b, videoUrl } : b
        );
        setStoredBanners(updated);
        dispatchDataUpdate("banners", "UPDATE_VIDEO", { bannerId, videoUrl });
      }
      return videoUrl;
    } catch (fallbackErr) {
      console.warn("Banner video upload failed:", fallbackErr?.message || err?.message);
      throw fallbackErr || err;
    }
  }
};

/**
 * Get all Banners (fetches live from backend database)
 */
export const getBanners = async () => {
  try {
    const response = await api.get("/banners");
    const rawList = list(response.data);
    if (Array.isArray(rawList) && rawList.length > 0) {
      const normalized = rawList.map(normalizeBanner);
      setStoredBanners(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn("Live backend /banners fetch notice:", err?.message);
  }

  const stored = getStoredBanners();
  if (stored && stored.length > 0) {
    return stored.map(normalizeBanner);
  }
  return SEED_BANNERS.map(normalizeBanner);
};

/**
 * 4. Admin: Create Video / Standard Banner
 * POST /api/banners
 */
export const createBanner = async (data) => {
  const payload = toBannerBackendPayload(data);

  const response = await api.post("/banners", payload);
  const serverBanner = response.data?.data || response.data;
  const savedBanner = normalizeBanner(serverBanner || payload);

  const existing = getStoredBanners();
  const updated = [
    savedBanner,
    ...existing.filter((b) => String(b.bannerId || b.id) !== String(savedBanner.bannerId || savedBanner.id)),
  ];
  setStoredBanners(updated);

  dispatchDataUpdate("banners", "CREATE", savedBanner);
  invalidateRequest("banners");

  return savedBanner;
};

/**
 * 5. Admin: Update Video / Standard Banner (Supports Partial Update)
 * PUT /api/banners/{bannerId}
 */
export const updateBanner = async (id, data) => {
  // If partial update (e.g. { active: false }), send keys directly
  let payload;
  const isPartial = typeof data === "object" && Object.keys(data).length <= 3 && !data.title;
  if (isPartial) {
    payload = data;
  } else {
    payload = toBannerBackendPayload(data);
  }

  const response = await api.put(`/banners/${id}`, payload);
  const serverBanner = response.data?.data || response.data;
  const updatedBanner = normalizeBanner(serverBanner || { ...payload, bannerId: id, id });

  const existing = getStoredBanners();
  const updatedList = existing.map((b) =>
    String(b.bannerId || b.id) === String(id) ? { ...b, ...updatedBanner } : b
  );
  setStoredBanners(updatedList);

  dispatchDataUpdate("banners", "UPDATE", { id, ...updatedBanner });
  invalidateRequest("banners");

  return updatedBanner;
};

/**
 * Partial update helper for active toggle
 */
export const toggleBannerActive = async (id, banner) => {
  const currentActive = banner.active !== false && banner.isActive !== false && banner.status !== "PAUSED";
  const newActive = !currentActive;
  return updateBanner(id, {
    active: newActive,
  });
};

/**
 * 6. Admin: Delete Banner
 * DELETE /api/banners/{bannerId}
 */
export const deleteBanner = async (id) => {
  await api.delete(`/banners/${id}`);

  const existing = getStoredBanners();
  const filtered = existing.filter((b) => String(b.bannerId || b.id) !== String(id));
  setStoredBanners(filtered);

  dispatchDataUpdate("banners", "DELETE", { id });
  invalidateRequest("banners");

  return { success: true, id };
};

