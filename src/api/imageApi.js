import api from "./axios";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../firebase/firebaseConfig";

const UPLOAD_TIMEOUT = 6000; // Fast 6s timeout for network & AWS S3 image uploads

/**
 * Extracts clean file URL from various backend response formats (prioritizing imageURL)
 */
const extractFileUrl = (response) => {
  if (!response) return "";
  const data = response.data !== undefined ? response.data : response;
  if (typeof data === "string") return data;

  const url =
    data.imageURL ||
    data.data?.imageURL ||
    data.imageUrl ||
    data.url ||
    data.Location ||
    data.location ||
    data.image ||
    data.secure_url ||
    data.path ||
    data.data?.imageUrl ||
    data.data?.url ||
    data.data?.Location ||
    data.data?.location ||
    data.data?.image ||
    data.data?.secure_url ||
    data.fileUrl ||
    data.data?.fileUrl ||
    (typeof data.data === "string" ? data.data : "");

  return typeof url === "string" ? url : "";
};

/**
 * Extracts multiple file URLs from backend response formats
 */
const extractMultipleFileUrls = (response) => {
  if (!response) return [];
  const data = response.data !== undefined ? response.data : response;
  if (Array.isArray(data)) {
    return data.map((item) => (typeof item === "string" ? item : extractFileUrl(item))).filter(Boolean);
  }
  if (Array.isArray(data.imageURL)) return data.imageURL;
  if (Array.isArray(data.data?.imageURL)) return data.data.imageURL;
  if (Array.isArray(data.imageUrls)) return data.imageUrls;
  if (Array.isArray(data.urls)) return data.urls;
  if (Array.isArray(data.images)) {
    return data.images.map((item) => (typeof item === "string" ? item : extractFileUrl(item))).filter(Boolean);
  }
  if (Array.isArray(data.files)) {
    return data.files.map((item) => (typeof item === "string" ? item : extractFileUrl(item))).filter(Boolean);
  }
  if (Array.isArray(data.data)) {
    return data.data.map((item) => (typeof item === "string" ? item : extractFileUrl(item))).filter(Boolean);
  }
  const single = extractFileUrl(response);
  return single ? [single] : [];
};

/**
 * Helper to upload to Firebase Storage with strict 5-second timeout
 */
const uploadToFirebaseStorage = async (file, folder = "uploads", timeoutMs = 5000) => {
  try {
    const uploadTask = (async () => {
      const storage = getStorage(app);
      const cleanName = (file.name || "image.jpg").replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${folder}/${Date.now()}_${cleanName}`;
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firebase storage timeout")), timeoutMs)
    );

    return await Promise.race([uploadTask, timeoutPromise]);
  } catch (err) {
    console.warn("Firebase Storage direct upload notice:", err?.message || err);
    return "";
  }
};

const uploadWithFallback = async (primaryEndpoint, file, options = {}) => {
  if (!file) return "";

  const formData = new FormData();
  formData.append("file", file);
  if (options.folder) {
    formData.append("folder", options.folder);
  }

  // Support external AbortController for cancellable uploads
  const abortController = options.abortController || new AbortController();
  const effectiveTimeout = options.timeout || UPLOAD_TIMEOUT;

  const requestConfig = {
    timeout: effectiveTimeout,
    signal: abortController.signal,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };

  const endpoints = [
    primaryEndpoint,
    `/images/upload`,
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await api.post(endpoint, formData, requestConfig);
      const url = extractFileUrl(response);
      if (url) {
        return url;
      }
    } catch (err) {
      if (err?.name === "CanceledError" || abortController.signal.aborted) {
        throw err;
      }
      lastError = err;

      // Fast-fail if timeout, network offline, or server error
      const isServerDown =
        err.code === "ECONNABORTED" ||
        err.message?.includes("timeout") ||
        err.message?.includes("ENOTFOUND") ||
        err.message?.includes("ECONNREFUSED") ||
        err.message?.includes("Network Error") ||
        err?.response?.status === 502 ||
        err?.response?.status === 503 ||
        err?.response?.status === 504 ||
        !err.response;

      if (isServerDown) {
        break;
      }

      // 4xx errors (except 404) are client-side validation failures — do not retry
      if (err?.response?.status >= 400 && err?.response?.status < 500 && err?.response?.status !== 404) {
        break;
      }
    }
  }

  // Fast fallback to Firebase Storage if backend S3 is unavailable
  if (!options.skipFirebase) {
    try {
      const folder = options.folder || "subcategories";
      const fbUrl = await uploadToFirebaseStorage(file, folder, 4000);
      if (fbUrl) {
        return fbUrl;
      }
    } catch (fbErr) {
      console.warn("Firebase storage upload fallback notice:", fbErr?.message);
    }
  }

  if (lastError) {
    throw lastError;
  }
  return "";
};

/**
 * 1. Upload single Product Image
 * POST /api/images/products (Key: file)
 * Returns { imageURL, imageUrl, fileUrl, imageKey }
 */
export const uploadProductImage = async (file) => {
  if (!file) return { imageURL: "", imageUrl: "", fileUrl: "", imageKey: "" };

  const url = await uploadWithFallback("/images/products", file, { folder: "products" });

  return {
    imageURL: url,
    imageUrl: url,
    fileUrl: url,
    imageKey: url.split("/").pop() || "",
    toString: () => url,
  };
};

/**
 * 2. Upload multiple Product Images
 * POST /api/images/multiple?folder=products (Key: files)
 */
export const uploadMultipleProductImages = async (files) => {
  if (!files || files.length === 0) return [];
  const formData = new FormData();
  Array.from(files).forEach((file) => {
    formData.append("files", file);
    formData.append("file", file);
  });

  const requestConfig = {
    timeout: UPLOAD_TIMEOUT,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  };

  try {
    const response = await api.post("/images/multiple?folder=products", formData, requestConfig);
    return extractMultipleFileUrls(response);
  } catch (err) {
    const results = await Promise.allSettled(
      Array.from(files).map((file) => uploadProductImage(file))
    );
    return results
      .filter((r) => r.status === "fulfilled" && (r.value?.imageURL || r.value?.imageUrl))
      .map((r) => r.value.imageURL || r.value.imageUrl);
  }
};

/**
 * 3. Upload Category Image
 * POST /api/images/categories (Key: file)
 */
export const uploadCategoryImage = async (file, options = {}) => {
  return await uploadWithFallback("/images/categories", file, { folder: "categories", ...options });
};

/**
 * 4. Upload Subcategory Image
 * POST /api/images/subcategories (Key: file)
 */
export const uploadSubcategoryImage = async (file, options = {}) => {
  return await uploadWithFallback("/images/subcategories", file, { folder: "subcategories", ...options });
};

/**
 * 5. Upload Banner Image
 * POST /api/images/banners (Key: file)
 */
export const uploadBannerImage = async (file) => {
  return await uploadWithFallback("/images/banners", file, { folder: "banners" });
};

/**
 * Upload Brand Image / Logo
 * POST /api/images/brands (Key: file)
 */
export const uploadBrandImage = async (file) => {
  return await uploadWithFallback("/images/brands", file, { folder: "brands" });
};

/**
 * 6. Upload Document / PDF (KYC)
 * POST /api/images/documents (Key: file)
 */
export const uploadDocument = async (file) => {
  return await uploadWithFallback("/images/documents", file, { folder: "documents" });
};

/**
 * 7. Download / View Image from S3 by Key
 * GET /api/images/download?key={key}
 */
export const getImageDownloadUrl = async (key) => {
  if (!key) return "";
  try {
    const response = await api.get(`/images/download?key=${encodeURIComponent(key)}`);
    return extractFileUrl(response);
  } catch (err) {
    console.warn(`Failed to get download URL for key ${key}:`, err?.message);
    return "";
  }
};

/**
 * 8. Delete Image from S3
 * DELETE /api/images?key={key}
 */
export const deleteImage = async (key) => {
  if (!key) return null;
  const response = await api.delete(`/images?key=${encodeURIComponent(key)}`);
  return response.data;
};

export default {
  uploadProductImage,
  uploadMultipleProductImages,
  uploadCategoryImage,
  uploadSubcategoryImage,
  uploadBannerImage,
  uploadBrandImage,
  uploadDocument,
  getImageDownloadUrl,
  deleteImage,
};


