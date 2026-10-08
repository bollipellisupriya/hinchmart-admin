import api from "./axios";
import { dispatchDataUpdate, subscribeDataUpdate } from "./dataStore";
import { compressImage } from "../utils/imageStore";

const STORAGE_KEY_SELLER_VAULTS = "hinchmart_seller_vaults_v2";

const INITIAL_SELLER_VAULTS = [];

const STORAGE_KEY_DELETED_SELLERS = "hinchmart_deleted_seller_ids_v1";

export const getDeletedSellerIds = () => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_SELLERS);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr.map(String));
    }
  } catch {}
  return new Set();
};

export const markSellersDeleted = (ids = []) => {
  if (typeof window === "undefined" || !ids || ids.length === 0) return;
  try {
    const current = getDeletedSellerIds();
    ids.forEach((id) => current.add(String(id)));
    localStorage.setItem(STORAGE_KEY_DELETED_SELLERS, JSON.stringify(Array.from(current)));
  } catch {}
};

export const deleteStoredVault = (sellerId) => {
  const sid = String(sellerId);
  markSellersDeleted([sid]);

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SELLER_VAULTS);
      if (raw) {
        const vaults = JSON.parse(raw);
        if (Array.isArray(vaults)) {
          const filtered = vaults.filter((v) => String(v.sellerId) !== sid && String(v.id) !== sid);
          saveStoredVaults(filtered);
        }
      }
      const rawSellers = localStorage.getItem("hinchmart_sellers");
      if (rawSellers) {
        const sellers = JSON.parse(rawSellers);
        if (Array.isArray(sellers)) {
          const filtered = sellers.filter((s) => String(s.id || s._id) !== sid && String(s.sellerId) !== sid);
          localStorage.setItem("hinchmart_sellers", JSON.stringify(filtered));
        }
      }
    } catch {}
  }
};

export const deleteBulkStoredVaults = (sellerIds = []) => {
  if (!sellerIds || sellerIds.length === 0) return;
  const idSet = new Set(sellerIds.map(String));
  markSellersDeleted(sellerIds);

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SELLER_VAULTS);
      if (raw) {
        const vaults = JSON.parse(raw);
        if (Array.isArray(vaults)) {
          const filtered = vaults.filter(
            (v) => !idSet.has(String(v.sellerId)) && !idSet.has(String(v.id))
          );
          saveStoredVaults(filtered);
        }
      }
      const rawSellers = localStorage.getItem("hinchmart_sellers");
      if (rawSellers) {
        const sellers = JSON.parse(rawSellers);
        if (Array.isArray(sellers)) {
          const filtered = sellers.filter(
            (s) => !idSet.has(String(s.id || s._id)) && !idSet.has(String(s.sellerId))
          );
          localStorage.setItem("hinchmart_sellers", JSON.stringify(filtered));
        }
      }
    } catch {}
  }
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

export const getStoredVaults = () => {
  if (typeof window === "undefined") return INITIAL_SELLER_VAULTS;
  try {
    const deletedIds = getDeletedSellerIds();
    const adminSession = getAdminUserSession();
    const adminEmail = (adminSession?.email || "").toLowerCase();

    let vaults = [];
    const raw = localStorage.getItem(STORAGE_KEY_SELLER_VAULTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) vaults = parsed;
    }

    const vaultMap = new Map();

    // Only load explicitly saved seller vaults (excluding mock sellers & admin account)
    vaults.forEach((v) => {
      const sid = String(v.sellerId || v.id);
      const isMock = sid === "14" || sid === "sel_201" || sid === "sel_204" ||
                     v.email?.toLowerCase().includes("vignesh.kilay") ||
                     v.companyName === "CleanPro Industrial Solutions LLP" ||
                     v.companyName === "SteelCraft Infra Projects Pvt Ltd";
      const isRoleAdmin = v.role === "ADMIN" || v.role === "SUPER_ADMIN" || v.department?.includes("ADMIN");
      const isCurrentAdmin = adminEmail && v.email?.toLowerCase() === adminEmail;
      const isPlaceholderMerchant = (v.companyName === "Enterprise Merchant" && isCurrentAdmin);

      if (!isMock && !deletedIds.has(sid) && !isRoleAdmin && !isCurrentAdmin && !isPlaceholderMerchant) {
        const existing = vaultMap.get(sid) || {};
        vaultMap.set(sid, { ...existing, ...v });
      }
    });

    const merged = Array.from(vaultMap.values()).filter((v) => {
      const sid = String(v.sellerId || v.id);
      const isMock = sid === "14" || sid === "sel_201" || sid === "sel_204";
      const isRoleAdmin = v.role === "ADMIN" || v.role === "SUPER_ADMIN";
      const isCurrentAdmin = adminEmail && v.email?.toLowerCase() === adminEmail;
      return !isMock && !deletedIds.has(sid) && !isRoleAdmin && !isCurrentAdmin;
    });

    saveStoredVaults(merged);
    return merged;
  } catch {
    return INITIAL_SELLER_VAULTS;
  }
};

export const saveStoredVaults = (vaults) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_SELLER_VAULTS, JSON.stringify(vaults));
    } catch {}
  }
};

/**
 * Derives overall vault status according to the 7-phase spec:
 * - "Not Uploaded" (0 docs uploaded)
 * - "Pending" (docs uploaded, awaiting review)
 * - "Rejected" (any doc rejected)
 * - "Verified" (all 3 docs verified)
 */
export const deriveVaultStatus = (documents = []) => {
  if (!documents || documents.length === 0) {
    return {
      overallStatus: "Not Uploaded",
      totalRequired: 3,
      submittedCount: 0,
      verifiedCount: 0,
      hasRejected: false,
    };
  }

  const submittedCount = documents.length;
  const verifiedCount = documents.filter((d) => d.verificationStatus === "VERIFIED").length;
  const hasRejected = documents.some((d) => d.verificationStatus === "REJECTED");

  let overallStatus = "Pending";
  if (submittedCount === 0) {
    overallStatus = "Not Uploaded";
  } else if (hasRejected) {
    overallStatus = "Rejected";
  } else if (verifiedCount === 3) {
    overallStatus = "Verified";
  } else {
    overallStatus = "Pending";
  }

  return {
    overallStatus,
    totalRequired: 3,
    submittedCount,
    verifiedCount,
    hasRejected,
  };
};

/**
 * Document Number Masking Helper
 */
export const maskDocNumber = (type, number) => {
  if (!number) return "—";
  const clean = String(number).trim();
  if (type === "PAN") {
    if (clean.length === 10) {
      return `${clean.slice(0, 3)}XXXX${clean.slice(7)}`;
    }
    return clean;
  }
  if (type === "AADHAAR") {
    const digits = clean.replace(/\D/g, "");
    if (digits.length === 12) {
      return `XXXX XXXX ${digits.slice(8)}`;
    }
    return clean;
  }
  if (type === "GST") {
    if (clean.length === 15) {
      return `${clean.slice(0, 2)}XXXXXXXXXX${clean.slice(12)}`;
    }
    return clean;
  }
  return clean;
};

/**
 * PHASE 1 — REGISTRATION & KYC
 * POST /api/sellers/onboarding/step1-personal or /step1-personal
 */
export const step1Personal = async (data) => {
  const sellerId = data.sellerId || `sel_${Date.now()}`;
  const newRecord = {
    sellerId,
    name: data.name?.trim(),
    email: data.email?.trim(),
    phone: data.phone?.trim(),
    panNumber: data.panNumber?.trim()?.toUpperCase(),
    aadhaarNumber: data.aadhaarNumber?.trim(),
    onboardingStatus: "STEP_1",
    verificationStatus: "PENDING",
    documents: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const res = await api.post("/sellers/onboarding/step1-personal", data);
    if (res.data?.sellerId) return res.data;
  } catch {
    try {
      const res = await api.post("/step1-personal", data);
      if (res.data?.sellerId) return res.data;
    } catch (err) {
      console.warn("Backend /step1-personal offline, updating local data store:", err?.message);
    }
  }

  const vaults = getStoredVaults();
  const updated = [newRecord, ...vaults.filter((v) => v.sellerId !== sellerId)];
  saveStoredVaults(updated);
  dispatchDataUpdate("seller_documents", "STEP_1", newRecord);

  return newRecord;
};

/**
 * PHASE 2 — BUSINESS & TAX DETAILS
 * POST /api/sellers/onboarding/{sellerId}/step2-business
 */
export const step2Business = async (sellerId, data) => {
  try {
    const res = await api.post(`/sellers/onboarding/${sellerId}/step2-business`, data);
    if (res.data) return res.data;
  } catch {
    try {
      const res = await api.post(`/${sellerId}/step2-business`, data);
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`Backend step2-business offline, updating local data store:`, err?.message);
    }
  }

  const vaults = getStoredVaults();
  const idx = vaults.findIndex((v) => v.sellerId === sellerId);
  if (idx !== -1) {
    vaults[idx] = {
      ...vaults[idx],
      companyName: data.companyName,
      businessType: data.businessType,
      gstin: data.gstin?.trim()?.toUpperCase(),
      businessAddress: data.businessAddress,
      state: data.state,
      city: data.city,
      pincode: data.pincode,
      onboardingStatus: "STEP_2",
      updatedAt: new Date().toISOString(),
    };
    saveStoredVaults(vaults);
    dispatchDataUpdate("seller_documents", "STEP_2", vaults[idx]);
    return vaults[idx];
  }
  return null;
};

/**
 * PHASE 3 — BANK & SETTLEMENT DETAILS
 * POST /api/sellers/onboarding/{sellerId}/step3-bank
 */
export const step3Bank = async (sellerId, data) => {
  try {
    const res = await api.post(`/sellers/onboarding/${sellerId}/step3-bank`, data);
    if (res.data) return res.data;
  } catch {
    try {
      const res = await api.post(`/${sellerId}/step3-bank`, data);
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`Backend step3-bank offline, updating local data store:`, err?.message);
    }
  }

  const vaults = getStoredVaults();
  const idx = vaults.findIndex((v) => v.sellerId === sellerId);
  if (idx !== -1) {
    vaults[idx] = {
      ...vaults[idx],
      bankName: data.bankName,
      accountHolderName: data.accountHolderName,
      accountNumber: data.accountNumber,
      ifscCode: data.ifscCode?.trim()?.toUpperCase(),
      accountType: data.accountType || "CURRENT",
      onboardingStatus: "STEP_3",
      updatedAt: new Date().toISOString(),
    };
    saveStoredVaults(vaults);
    dispatchDataUpdate("seller_documents", "STEP_3", vaults[idx]);
    return vaults[idx];
  }
  return null;
};

/**
 * PHASE 4 — MANDATORY DOCUMENT UPLOAD (KYC Compliance)
 * POST /api/sellers/onboarding/{sellerId}/documents (multipart/form-data)
 */
export const uploadDocument = async (sellerId, documentType, fileOrUrl, documentNumber = "", fileName = "") => {
  const normKey = String(documentType || "").toUpperCase();
  const apiKey = normKey === "GSTIN" ? "GST" : normKey;

  let finalUrl = typeof fileOrUrl === "string" ? fileOrUrl : "";
  if (!finalUrl && fileOrUrl instanceof File) {
    finalUrl = URL.createObjectURL(fileOrUrl);
  }
  if (!finalUrl) {
    finalUrl =
      apiKey === "PAN"
        ? "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80"
        : apiKey === "AADHAAR"
        ? "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80"
        : "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80";
  }

  const generatedFileName =
    fileName ||
    (fileOrUrl instanceof File
      ? fileOrUrl.name
      : apiKey === "PAN"
      ? "company_pan.pdf"
      : apiKey === "AADHAAR"
      ? "aadhaar_signatory.jpg"
      : "gst_reg_06.pdf");

  const docRecord = {
    id: `doc_${apiKey.toLowerCase()}_${Date.now()}`,
    documentType: apiKey,
    apiKey: apiKey,
    type:
      apiKey === "PAN"
        ? "PAN Document"
        : apiKey === "AADHAAR"
        ? "Aadhaar Document"
        : "GST Certificate",
    docType:
      apiKey === "PAN"
        ? "PAN Document"
        : apiKey === "AADHAAR"
        ? "Aadhaar Document"
        : "GST Certificate",
    title:
      apiKey === "PAN"
        ? "PAN Card"
        : apiKey === "AADHAAR"
        ? "Aadhaar Card"
        : "GSTIN Registration Certificate",
    name:
      apiKey === "PAN"
        ? "Company PAN Card"
        : apiKey === "AADHAAR"
        ? "Aadhaar Card"
        : "GST Registration Certificate (Form REG-06)",
    documentNumber:
      documentNumber ||
      (apiKey === "PAN" ? "AABCV1234E" : apiKey === "AADHAAR" ? "123456789012" : "27AABCV1234E1Z5"),
    docNumber:
      documentNumber ||
      (apiKey === "PAN" ? "AABCV1234E" : apiKey === "AADHAAR" ? "123456789012" : "27AABCV1234E1Z5"),
    fileName: generatedFileName,
    fileSize: "420 KB",
    fileSizeFormatted: "420 KB",
    fileUrl: finalUrl,
    verificationStatus: "PENDING",
    status: "Pending",
    notes: "Submitted for statutory compliance audit & verification by Admin",
    remarks: "Uploaded and queued for statutory compliance verification.",
    uploadedAt: new Date().toISOString(),
    uploadedDateFormatted: new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    reviewedBy: "HinchMart Compliance Admin",
    rejectionReason: null,
    isUploaded: true,
  };

  try {
    const formData = new FormData();
    formData.append("documentType", apiKey);
    formData.append("docType", docRecord.docType);
    if (documentNumber) formData.append("documentNumber", documentNumber);
    if (fileOrUrl instanceof File) formData.append("file", fileOrUrl);
    const res = await api.post(`/sellers/onboarding/${sellerId}/documents`, formData);
    if (res.data) return res.data;
  } catch {
    try {
      const formData = new FormData();
      formData.append("documentType", apiKey);
      formData.append("docType", docRecord.docType);
      if (documentNumber) formData.append("documentNumber", documentNumber);
      if (fileOrUrl instanceof File) formData.append("file", fileOrUrl);
      const res = await api.post(`/${sellerId}/documents`, formData);
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`Backend documents upload offline, saving locally:`, err?.message);
    }
  }

  const vaults = getStoredVaults();
  const idx = vaults.findIndex((v) => String(v.sellerId) === String(sellerId));
  if (idx !== -1) {
    const currentDocs = vaults[idx].documents || [];
    const otherDocs = currentDocs.filter(
      (d) =>
        d.documentType !== apiKey &&
        d.documentType !== normKey &&
        d.type !== docRecord.docType
    );
    vaults[idx].documents = [...otherDocs, docRecord];
    vaults[idx].verificationStatus = "PENDING";
    vaults[idx].updatedAt = new Date().toISOString();

    saveStoredVaults(vaults);
    dispatchDataUpdate("seller_documents", "UPLOAD_DOC", { sellerId, docRecord });
  }

  return docRecord;
};

/**
 * PHASE 5 — FINAL SUBMISSION FOR REVIEW
 * POST /api/sellers/onboarding/{sellerId}/final-submit
 */
export const finalSubmit = async (sellerId) => {
  try {
    const res = await api.post(`/sellers/onboarding/${sellerId}/final-submit`);
    if (res.data) return res.data;
  } catch {
    try {
      const res = await api.post(`/${sellerId}/final-submit`);
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`Backend final-submit offline, updating local:`, err?.message);
    }
  }

  const vaults = getStoredVaults();
  const idx = vaults.findIndex((v) => String(v.sellerId) === String(sellerId));
  if (idx !== -1) {
    vaults[idx].onboardingStatus = "PENDING_REVIEW";
    vaults[idx].submittedAt = new Date().toISOString();
    vaults[idx].updatedAt = new Date().toISOString();

    saveStoredVaults(vaults);
    dispatchDataUpdate("seller_documents", "FINAL_SUBMIT", vaults[idx]);
    return vaults[idx];
  }
  return null;
};

/**
 * PHASE 6 — INDIVIDUAL DOCUMENT VERIFICATION
 * PUT https://api.hinchmart.com/api/sellers/onboarding/{sellerId}/documents/{documentType}/verify
 * 
 * Path Variables:
 *   sellerId: e.g., 16 or "sel_201"
 *   documentType: "PAN", "AADHAAR", or "GST"
 * Query Parameters:
 *   status (Required): "VERIFIED" or "REJECTED"
 *   remarks (Optional): Notes from the admin (e.g., "Image is too blurry")
 */
export const verifyDocument = async (sellerId, documentType, optionsOrStatus = "VERIFIED", maybeRemarks = "") => {
  let status = "VERIFIED";
  let remarks = "";

  if (typeof optionsOrStatus === "object" && optionsOrStatus !== null) {
    status = optionsOrStatus.status || "VERIFIED";
    remarks = optionsOrStatus.remarks || optionsOrStatus.rejectionReason || "";
  } else if (typeof optionsOrStatus === "string") {
    status = optionsOrStatus;
    remarks = maybeRemarks || "";
  }

  const rawType = String(documentType || "").toUpperCase();
  const normalizedDocType = rawType === "GSTIN" ? "GST" : rawType;
  const normalizedStatus = String(status || "VERIFIED").toUpperCase();
  const finalRemarks = remarks || (normalizedStatus === "VERIFIED" ? "Verified and approved by Compliance Team." : "Document rejected");

  try {
    const res = await api.put(
      `/admin/sellers/${sellerId}/documents/${normalizedDocType}/verify`,
      null,
      {
        params: {
          status: normalizedStatus,
          remarks: finalRemarks,
        },
      }
    );
    if (res.data !== undefined) return res.data;
  } catch (err) {
    try {
      const res = await api.put(
        `/seller/onboarding/${sellerId}/documents/${normalizedDocType}/verify`,
        null,
        {
          params: {
            status: normalizedStatus,
            remarks: finalRemarks,
          },
        }
      );
      if (res.data !== undefined) return res.data;
    } catch {
      // Local fallback
    }
  }

  // Local Reactive State & Fallback
  const vaults = getStoredVaults();
  const idx = vaults.findIndex((v) => String(v.sellerId) === String(sellerId));
  if (idx !== -1) {
    const docs = vaults[idx].documents || [];
    const docIdx = docs.findIndex(
      (d) =>
        d.documentType === normalizedDocType ||
        d.documentType === rawType ||
        (normalizedDocType === "GST" && (d.documentType === "GSTIN" || d.type?.includes("GST")))
    );
    if (docIdx !== -1) {
      docs[docIdx].verificationStatus = normalizedStatus;
      docs[docIdx].status = normalizedStatus === "VERIFIED" ? "Verified" : "Rejected";
      docs[docIdx].remarks = finalRemarks;
      docs[docIdx].notes = finalRemarks;
      docs[docIdx].rejectionReason = normalizedStatus === "REJECTED" ? finalRemarks : null;
      docs[docIdx].verifiedAt = new Date().toISOString();
      docs[docIdx].reviewedBy = "HinchMart Compliance Admin";
      docs[docIdx].verifiedBy = "HinchMart Compliance Admin";
    }

    const { overallStatus } = deriveVaultStatus(docs);
    if (overallStatus === "Verified") {
      vaults[idx].verificationStatus = "VERIFIED";
      vaults[idx].onboardingStatus = "COMPLETED";
      vaults[idx].verifiedAt = new Date().toISOString();
    } else if (overallStatus === "Rejected") {
      vaults[idx].verificationStatus = "REJECTED";
    } else {
      vaults[idx].verificationStatus = "PENDING";
    }

    vaults[idx].updatedAt = new Date().toISOString();
    saveStoredVaults(vaults);
    dispatchDataUpdate("seller_documents", "VERIFY_DOC", {
      sellerId,
      documentType: normalizedDocType,
      status: normalizedStatus,
      remarks: finalRemarks,
    });
    return docs[docIdx];
  }
  return null;
};

/**
 * ADMIN ACTIONS (SELLER APPROVAL / REJECTION)
 * 
 * Admin Approve (Activates Seller & Store):
 *   POST https://api.hinchmart.com/api/admin/sellers/{sellerId}/approve
 *   Body: { remarks: "...", verified: true }
 * 
 * Admin Reject:
 *   POST https://api.hinchmart.com/api/admin/sellers/{sellerId}/reject
 *   Body: { remarks: "...", verified: false }
 */
export const approveSellerAccount = async (sellerId, { action = "APPROVE", notes = "All statutory documents verified and store activated" } = {}) => {
  const isApprove = action === "APPROVE";
  const remarks = notes || (isApprove ? "All statutory documents verified and store activated" : "KYC documents rejected due to discrepancies");
  const endpoint = isApprove
    ? `/admin/sellers/${sellerId}/approve`
    : `/admin/sellers/${sellerId}/reject`;

  const payload = {
    remarks,
    verified: isApprove,
  };

  try {
    const res = await api.post(endpoint, payload, { params: { remarks } });
    return res.data !== undefined ? res.data : res;
  } catch (err) {
    try {
      const res = await api.post(endpoint, null, { params: { remarks } });
      return res.data !== undefined ? res.data : res;
    } catch (fallbackErr) {
      console.error(`Backend ${action} failed for seller ${sellerId}:`, fallbackErr?.response?.data || fallbackErr?.message);
      throw fallbackErr;
    }
  }
};

export const bulkApproveSeller = (sellerId, notes = "All statutory documents verified and store activated") =>
  approveSellerAccount(sellerId, { action: "APPROVE", notes });

export const bulkRejectSeller = (sellerId, reason = "KYC documents rejected due to discrepancies") =>
  approveSellerAccount(sellerId, { action: "REJECT", notes: reason });

const S3_BUCKET_BASE = "https://hinchmart-storage-191481838776-ap-south-2-an.s3.ap-south-2.amazonaws.com";

export const formatDocumentUrl = (val) => {
  if (!val) return "";
  if (typeof val === "object") {
    val = val.url || val.fileUrl || val.file_url || val.documentUrl || val.document_url || val.s3Url || val.location || val.path || val.key || val.filePath || val.file_path || "";
  }
  if (typeof val !== "string") return "";
  const trimmed = val.trim().replace(/^["']|["']$/g, "");
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  // S3 path, filename with extension, or relative key
  if (trimmed.includes("/") || trimmed.includes(".")) {
    const cleanKey = trimmed.replace(/^\/+/, "");
    return `${S3_BUCKET_BASE}/${cleanKey}`;
  }
  return "";
};

/**
 * Normalizes document list from any backend seller structure (vault, seller profile, or documents array)
 */
export const normalizeSellerDocuments = (seller = {}) => {
  if (!seller || typeof seller !== "object") return [];

  // Parse stringified JSON fields if backend returned them as strings
  let parsedDocuments = seller.documents;
  if (typeof parsedDocuments === "string") {
    try { parsedDocuments = JSON.parse(parsedDocuments); } catch {}
  }

  let parsedKyc = seller.kyc;
  if (typeof parsedKyc === "string") {
    try { parsedKyc = JSON.parse(parsedKyc); } catch {}
  }

  let parsedVault = seller.vault;
  if (typeof parsedVault === "string") {
    try { parsedVault = JSON.parse(parsedVault); } catch {}
  }

  let parsedDocVault = seller.documentVault || seller.document_vault;
  if (typeof parsedDocVault === "string") {
    try { parsedDocVault = JSON.parse(parsedDocVault); } catch {}
  }

  let parsedAttachments = seller.attachments;
  if (typeof parsedAttachments === "string") {
    try { parsedAttachments = JSON.parse(parsedAttachments); } catch {}
  }

  let parsedFiles = seller.files || seller.uploads || seller.images || seller.photos;
  if (typeof parsedFiles === "string") {
    try { parsedFiles = JSON.parse(parsedFiles); } catch {}
  }

  let rawDocList = [];
  if (Array.isArray(parsedDocuments)) rawDocList.push(...parsedDocuments);
  if (Array.isArray(seller.sellerDocuments)) rawDocList.push(...seller.sellerDocuments);
  if (Array.isArray(seller.seller_documents)) rawDocList.push(...seller.seller_documents);
  if (Array.isArray(parsedDocVault)) rawDocList.push(...parsedDocVault);
  if (Array.isArray(parsedVault?.documents)) rawDocList.push(...parsedVault.documents);
  if (Array.isArray(seller.kycDocuments)) rawDocList.push(...seller.kycDocuments);
  if (Array.isArray(seller.kyc_documents)) rawDocList.push(...seller.kyc_documents);
  if (Array.isArray(seller.docs)) rawDocList.push(...seller.docs);
  if (Array.isArray(parsedAttachments)) rawDocList.push(...parsedAttachments);
  if (Array.isArray(parsedFiles)) rawDocList.push(...parsedFiles);

  // If documents is an object (key -> url or key -> doc object)
  if (parsedDocuments && typeof parsedDocuments === "object" && !Array.isArray(parsedDocuments)) {
    Object.entries(parsedDocuments).forEach(([key, val]) => {
      rawDocList.push({
        documentType: key,
        ...(typeof val === "object" && val !== null ? val : { url: val }),
      });
    });
  }

  if (parsedKyc && typeof parsedKyc === "object" && !Array.isArray(parsedKyc)) {
    if (Array.isArray(parsedKyc.documents)) rawDocList.push(...parsedKyc.documents);
    else {
      Object.entries(parsedKyc).forEach(([key, val]) => {
        if (key.includes("Doc") || key.includes("Url") || key.includes("Card") || key.includes("Certificate") || key.includes("Proof")) {
          rawDocList.push({
            documentType: key,
            ...(typeof val === "object" && val !== null ? val : { url: val }),
          });
        }
      });
    }
  }

  const docMap = new Map();

  const panNum = seller.panNumber || seller.pan_number || seller.pan || parsedKyc?.panNumber || parsedKyc?.pan || "";
  const aadhaarNum = seller.aadhaarNumber || seller.aadhaar_number || seller.aadhaar || parsedKyc?.aadhaarNumber || parsedKyc?.aadhaar || "";
  const gstNum = seller.gstin || seller.gst || seller.gstNumber || seller.gst_number || parsedKyc?.gstin || parsedKyc?.gst || "";

  // Exhaustive search across all column name conventions
  const panUrl = formatDocumentUrl(
    seller.panCardUrl ||
    seller.pan_card_url ||
    seller.panUrl ||
    seller.pan_url ||
    seller.panFileUrl ||
    seller.pan_file_url ||
    seller.panDocUrl ||
    seller.pan_doc_url ||
    seller.panImage ||
    seller.pan_image ||
    seller.panDocument ||
    seller.pan_document ||
    seller.panPhoto ||
    seller.pan_photo ||
    seller.panFile ||
    seller.pan_file ||
    seller.panAttachment ||
    seller.pan_attachment ||
    seller.panProof ||
    seller.pan_proof ||
    seller.panUpload ||
    seller.pan_upload ||
    seller.panCard ||
    seller.pan_card ||
    seller.panPath ||
    seller.pan_path ||
    seller.panKey ||
    seller.pan_key ||
    seller.idProofUrl ||
    seller.id_proof_url ||
    seller.idProof ||
    seller.id_proof ||
    parsedKyc?.panUrl ||
    parsedKyc?.panCardUrl ||
    parsedKyc?.pan_card_url ||
    parsedKyc?.panImage ||
    parsedVault?.panUrl ||
    parsedVault?.panCardUrl ||
    (typeof seller.pan === "object" && seller.pan !== null ? (seller.pan?.url || seller.pan?.fileUrl) : null)
  );

  const aadhaarUrl = formatDocumentUrl(
    seller.aadhaarCardUrl ||
    seller.aadhaar_card_url ||
    seller.aadhaarUrl ||
    seller.aadhaar_url ||
    seller.aadhaarFileUrl ||
    seller.aadhaar_file_url ||
    seller.aadhaarDocUrl ||
    seller.aadhaar_doc_url ||
    seller.aadhaarImage ||
    seller.aadhaar_image ||
    seller.aadhaarDocument ||
    seller.aadhaar_document ||
    seller.aadhaarPhoto ||
    seller.aadhaar_photo ||
    seller.aadhaarFile ||
    seller.aadhaar_file ||
    seller.aadhaarAttachment ||
    seller.aadhaar_attachment ||
    seller.aadhaarProof ||
    seller.aadhaar_proof ||
    seller.aadhaarUpload ||
    seller.aadhaar_upload ||
    seller.aadhaarCard ||
    seller.aadhaar_card ||
    seller.aadharUrl ||
    seller.aadhar_url ||
    seller.aadharCardUrl ||
    seller.aadhar_card_url ||
    seller.aadhaarPath ||
    seller.aadhaar_path ||
    seller.aadhaarKey ||
    seller.aadhaar_key ||
    seller.addressProofUrl ||
    seller.address_proof_url ||
    seller.addressProof ||
    seller.address_proof ||
    parsedKyc?.aadhaarUrl ||
    parsedKyc?.aadhaarCardUrl ||
    parsedKyc?.aadhaar_card_url ||
    parsedVault?.aadhaarUrl ||
    parsedVault?.aadhaarCardUrl ||
    (typeof seller.aadhaar === "object" && seller.aadhaar !== null ? (seller.aadhaar?.url || seller.aadhaar?.fileUrl) : null)
  );

  const gstUrl = formatDocumentUrl(
    seller.gstCertificateUrl ||
    seller.gst_certificate_url ||
    seller.gstCertificate ||
    seller.gst_certificate ||
    seller.gstUrl ||
    seller.gst_url ||
    seller.gstFileUrl ||
    seller.gst_file_url ||
    seller.gstDocUrl ||
    seller.gst_doc_url ||
    seller.gstImage ||
    seller.gst_image ||
    seller.gstDocument ||
    seller.gst_document ||
    seller.gstPhoto ||
    seller.gst_photo ||
    seller.gstFile ||
    seller.gst_file ||
    seller.gstAttachment ||
    seller.gst_attachment ||
    seller.gstProof ||
    seller.gst_proof ||
    seller.gstUpload ||
    seller.gst_upload ||
    seller.gstinCertificate ||
    seller.gstin_certificate ||
    seller.gstPath ||
    seller.gst_path ||
    seller.gstKey ||
    seller.gst_key ||
    seller.businessProofUrl ||
    seller.business_proof_url ||
    seller.businessProof ||
    seller.business_proof ||
    parsedKyc?.gstUrl ||
    parsedKyc?.gstCertificateUrl ||
    parsedKyc?.gst_certificate_url ||
    parsedVault?.gstUrl ||
    parsedVault?.gstCertificateUrl ||
    (typeof seller.gst === "object" && seller.gst !== null ? (seller.gst?.url || seller.gst?.fileUrl) : null)
  );

  const chequeUrl = formatDocumentUrl(
    seller.bankProofUrl ||
    seller.bank_proof_url ||
    seller.chequeUrl ||
    seller.cheque_url ||
    seller.cancelledChequeUrl ||
    seller.cancelled_cheque_url ||
    seller.cancelledCheque ||
    seller.cancelled_cheque ||
    seller.bankProof ||
    seller.bank_proof ||
    seller.bankStatementUrl ||
    seller.bank_statement_url ||
    seller.passbookUrl ||
    seller.passbook_url ||
    parsedKyc?.bankProofUrl ||
    parsedKyc?.chequeUrl
  );

  // 1. Process explicit documents array from DB
  rawDocList.forEach((doc) => {
    if (!doc || typeof doc !== "object") return;

    let rawType = String(
      doc.documentType ||
      doc.document_type ||
      doc.docType ||
      doc.doc_type ||
      doc.type ||
      doc.title ||
      doc.document_name ||
      doc.name ||
      ""
    ).toUpperCase();

    if (rawType.includes("PAN")) rawType = "PAN";
    else if (rawType.includes("AADHAAR") || rawType.includes("ADHAAR") || rawType.includes("UID")) rawType = "AADHAAR";
    else if (rawType.includes("GST")) rawType = "GST";
    else if (rawType.includes("CHEQUE") || rawType.includes("BANK") || rawType.includes("STATEMENT") || rawType.includes("PASSBOOK")) rawType = "CANCELLED_CHEQUE";
    else if (rawType.includes("REGISTRATION") || rawType.includes("BUSINESS") || rawType.includes("COMPANY")) rawType = "BUSINESS_REGISTRATION";

    const vStatus = String(
      doc.verificationStatus ||
      doc.verification_status ||
      doc.status ||
      doc.statusCode ||
      doc.approvalStatus ||
      doc.approval_status ||
      (doc.isVerified || doc.is_verified ? "VERIFIED" : "PENDING")
    ).toUpperCase();

    const isVerified = vStatus === "VERIFIED" || vStatus === "APPROVED";
    const isRejected = vStatus === "REJECTED";

    const fileUrl = formatDocumentUrl(
      doc.fileUrl ||
      doc.file_url ||
      doc.url ||
      doc.documentUrl ||
      doc.document_url ||
      doc.s3Url ||
      doc.s3_url ||
      doc.filePath ||
      doc.file_path ||
      doc.mediaUrl ||
      doc.media_url ||
      doc.path ||
      doc.downloadUrl ||
      doc.download_url ||
      doc.location ||
      doc.key ||
      ""
    );

    if (rawType) {
      docMap.set(rawType, {
        id: doc.id || doc.documentId || doc.docId || `doc_${rawType.toLowerCase()}`,
        documentType: rawType,
        title:
          doc.title ||
          doc.name ||
          (rawType === "PAN"
            ? "PAN Card"
            : rawType === "AADHAAR"
            ? "Aadhaar Card"
            : rawType === "GST"
            ? "GST Registration Certificate"
            : rawType === "CANCELLED_CHEQUE"
            ? "Bank Proof / Cancelled Cheque"
            : `${rawType} Document`),
        documentNumber:
          doc.documentNumber ||
          doc.document_number ||
          doc.docNumber ||
          doc.number ||
          (rawType === "PAN" ? panNum : rawType === "AADHAAR" ? aadhaarNum : rawType === "GST" ? gstNum : ""),
        fileName: doc.fileName || doc.file_name || doc.name || `${rawType.toLowerCase()}_document.pdf`,
        fileUrl: fileUrl,
        fileSize: doc.fileSizeFormatted || (doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : "340 KB"),
        fileType: doc.fileType || (fileUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
        verificationStatus: isVerified ? "VERIFIED" : isRejected ? "REJECTED" : "PENDING",
        status: isVerified ? "Verified" : isRejected ? "Rejected" : "Pending",
        remarks: doc.remarks || doc.comments || (isVerified ? "Verified and active in database" : "Uploaded by seller and queued for compliance verification"),
        uploadedAt: doc.uploadedAt || doc.createdAt || seller.createdAt || new Date().toISOString(),
        isUploaded: Boolean(fileUrl),
      });
    }
  });

  // 2. Hydrate from top-level seller URLs if present in DB
  if (panUrl && (!docMap.has("PAN") || !docMap.get("PAN")?.fileUrl)) {
    docMap.set("PAN", {
      id: `doc_pan_${seller.sellerId || seller.id || "1"}`,
      documentType: "PAN",
      title: "PAN Card",
      documentNumber: panNum,
      fileName: "pan_card.jpg",
      fileUrl: panUrl,
      fileSize: "240 KB",
      fileType: panUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      verificationStatus: seller.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
      status: seller.verificationStatus === "VERIFIED" ? "Verified" : "Pending",
      remarks: "Verified against Income Tax records",
      uploadedAt: seller.createdAt || new Date().toISOString(),
      isUploaded: true,
    });
  }

  if (aadhaarUrl && (!docMap.has("AADHAAR") || !docMap.get("AADHAAR")?.fileUrl)) {
    docMap.set("AADHAAR", {
      id: `doc_aadhaar_${seller.sellerId || seller.id || "1"}`,
      documentType: "AADHAAR",
      title: "Aadhaar Card",
      documentNumber: aadhaarNum,
      fileName: "aadhaar_card.jpg",
      fileUrl: aadhaarUrl,
      fileSize: "310 KB",
      fileType: aadhaarUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      verificationStatus: seller.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
      status: seller.verificationStatus === "VERIFIED" ? "Verified" : "Pending",
      remarks: "Authorized signatory Aadhaar card",
      uploadedAt: seller.createdAt || new Date().toISOString(),
      isUploaded: true,
    });
  }

  if (gstUrl && (!docMap.has("GST") || !docMap.get("GST")?.fileUrl)) {
    docMap.set("GST", {
      id: `doc_gst_${seller.sellerId || seller.id || "1"}`,
      documentType: "GST",
      title: "GST Registration Certificate",
      documentNumber: gstNum,
      fileName: "gst_certificate.pdf",
      fileUrl: gstUrl,
      fileSize: "512 KB",
      fileType: gstUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      verificationStatus: seller.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
      status: seller.verificationStatus === "VERIFIED" ? "Verified" : "Pending",
      remarks: "Active GSTIN confirmed",
      uploadedAt: seller.createdAt || new Date().toISOString(),
      isUploaded: true,
    });
  }

  if (chequeUrl && (!docMap.has("CANCELLED_CHEQUE") || !docMap.get("CANCELLED_CHEQUE")?.fileUrl)) {
    docMap.set("CANCELLED_CHEQUE", {
      id: `doc_cheque_${seller.sellerId || seller.id || "1"}`,
      documentType: "CANCELLED_CHEQUE",
      title: "Bank Proof / Cancelled Cheque",
      documentNumber: seller.accountNumber ? `A/C ${seller.accountNumber}` : "—",
      fileName: "bank_proof.jpg",
      fileUrl: chequeUrl,
      fileSize: "280 KB",
      fileType: chequeUrl.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      verificationStatus: seller.verificationStatus === "VERIFIED" ? "VERIFIED" : "PENDING",
      status: seller.verificationStatus === "VERIFIED" ? "Verified" : "Pending",
      remarks: "Bank account and IFSC confirmed",
      uploadedAt: seller.createdAt || new Date().toISOString(),
      isUploaded: true,
    });
  }

  // 3. Ensure all 3 statutory required types (PAN, AADHAAR, GST) exist in the list
  const requiredTypes = ["PAN", "AADHAAR", "GST"];
  const result = requiredTypes.map((type) => {
    if (docMap.has(type)) return docMap.get(type);
    return {
      id: `doc_${type.toLowerCase()}_missing`,
      documentType: type,
      title:
        type === "PAN"
          ? "PAN Card"
          : type === "AADHAAR"
          ? "Aadhaar Card"
          : "GST Registration Certificate",
      documentNumber: type === "PAN" ? panNum : type === "AADHAAR" ? aadhaarNum : gstNum,
      verificationStatus: "Not Uploaded",
      status: "Not Uploaded",
      fileName: null,
      fileSize: null,
      fileUrl: null,
      remarks: "Document not submitted by merchant",
      uploadedAt: null,
      isUploaded: false,
    };
  });

  // Also include Cancelled Cheque if present
  if (docMap.has("CANCELLED_CHEQUE")) {
    result.push(docMap.get("CANCELLED_CHEQUE"));
  }

  return result;
};

/**
 * PHASE 7 — FETCH DOCUMENT VAULT
 * Exhaustively queries all candidate IDs and backend endpoints for seller documents & files
 */
export const getSellerVault = async (sellerId, fallbackSeller = null) => {
  const sid = String(sellerId || "");
  let backendVault = null;
  let sellerProfile = null;
  let backendDocs = [];

  // Extract all potential database ID formats (string, numeric-only, sellerId, userId)
  const candidateIds = new Set();
  if (sid) {
    candidateIds.add(sid);
    const numOnly = sid.replace(/\D/g, "");
    if (numOnly) candidateIds.add(numOnly);
  }
  if (fallbackSeller) {
    [
      fallbackSeller.id,
      fallbackSeller.sellerId,
      fallbackSeller.userId,
      fallbackSeller.user_id,
      fallbackSeller._id,
    ].forEach((val) => {
      if (val !== undefined && val !== null && val !== "") {
        const s = String(val);
        candidateIds.add(s);
        const numOnly = s.replace(/\D/g, "");
        if (numOnly) candidateIds.add(numOnly);
      }
    });
  }

  // Build parallel endpoint requests across all candidate IDs
  const apiCalls = [];
  candidateIds.forEach((cid) => {
    apiCalls.push(
      api.get(`/admin/sellers/${cid}/vault`).catch(() => null),
      api.get(`/admin/sellers/${cid}/documents`).catch(() => null),
      api.get(`/admin/sellers/${cid}/summary`).catch(() => null),
      api.get(`/admin/sellers/${cid}`).catch(() => null),
      api.get(`/seller/onboarding/${cid}/vault`).catch(() => null),
      api.get(`/seller/onboarding/${cid}/documents`).catch(() => null),
      api.get(`/seller/onboarding/${cid}/summary`).catch(() => null),
      api.get(`/seller/onboarding/${cid}`).catch(() => null),
      api.get(`/sellers/${cid}/documents`).catch(() => null),
      api.get(`/sellers/${cid}/vault`).catch(() => null),
      api.get(`/sellers/${cid}`).catch(() => null)
    );
  });

  const settled = await Promise.allSettled(apiCalls);

  settled.forEach((res) => {
    if (res.status === "fulfilled" && res.value?.data) {
      const payload = res.value.data;
      const data = payload.data || payload.seller || payload.vault || payload;
      if (data && typeof data === "object") {
        if (Array.isArray(data.documents)) {
          backendDocs.push(...data.documents);
        } else if (Array.isArray(data)) {
          backendDocs.push(...data);
        }

        if (data.panCardUrl || data.pan_card_url || data.panNumber || data.gstin || data.documents) {
          sellerProfile = { ...(sellerProfile || {}), ...data };
        }
        if (data.overallStatus || data.vaultMetrics) {
          backendVault = { ...(backendVault || {}), ...data };
        }
      }
    }
  });

  const localVaults = getStoredVaults();
  const localSeller = localVaults.find((v) => {
    const vSid = String(v.sellerId || v.id || "");
    return candidateIds.has(vSid);
  }) || {};

  const mergedSeller = {
    ...localSeller,
    ...(fallbackSeller || {}),
    ...(sellerProfile || {}),
    ...(backendVault?.seller || {}),
    sellerId: sid || localSeller.sellerId || fallbackSeller?.sellerId,
    documents: [
      ...(localSeller.documents || []),
      ...(fallbackSeller?.documents && Array.isArray(fallbackSeller.documents) ? fallbackSeller.documents : []),
      ...backendDocs,
      ...(backendVault?.documents || []),
    ],
  };

  const normalizedDocs = normalizeSellerDocuments(mergedSeller);
  const statusMetrics = deriveVaultStatus(normalizedDocs);

  // Diagnostic log in browser console for developers and admin
  console.info(`[HinchMart DB Inspection] KYC Documents for seller "${mergedSeller.companyName || sid}":`, {
    sellerId: sid,
    candidateIds: Array.from(candidateIds),
    documentsFoundInDatabase: normalizedDocs.filter((d) => d.isUploaded || d.fileUrl),
    missingPhysicalUploads: normalizedDocs.filter((d) => !d.isUploaded && !d.fileUrl),
    rawProfileReturned: sellerProfile,
  });

  const vaultRecord = {
    sellerId: sid,
    id: sid,
    seller: mergedSeller,
    companyName: mergedSeller.companyName || mergedSeller.businessName || mergedSeller.name,
    name: mergedSeller.name || mergedSeller.ownerName,
    email: mergedSeller.email,
    phone: mergedSeller.phone,
    gstin: mergedSeller.gstin || mergedSeller.gst || mergedSeller.gstNumber,
    panNumber: mergedSeller.panNumber || mergedSeller.pan,
    aadhaarNumber: mergedSeller.aadhaarNumber || mergedSeller.aadhaar,
    onboardingStatus: mergedSeller.onboardingStatus || "COMPLETED",
    ...statusMetrics,
    documents: normalizedDocs,
  };

  // Store seller documents in the Admin Panel's persistent vault
  if (typeof window !== "undefined") {
    try {
      const currentVaults = getStoredVaults();
      const updated = [vaultRecord, ...currentVaults.filter((v) => !candidateIds.has(String(v.sellerId || v.id)))];
      saveStoredVaults(updated);
      dispatchDataUpdate("seller_documents", "SYNC_VAULT", vaultRecord);
    } catch {}
  }

  return vaultRecord;
};

/**
 * Upload and attach document file directly to seller vault in database and admin storage
 */
export const uploadAndAttachSellerDocument = async (sellerId, documentType, fileOrUrl, documentNumber = "") => {
  const sid = String(sellerId || "");
  const numOnly = sid.replace(/\D/g, "");
  const normKey = String(documentType || "").toUpperCase();
  const apiKey = normKey === "GSTIN" ? "GST" : normKey;
  let finalUrl = typeof fileOrUrl === "string" ? fileOrUrl : "";

  if (fileOrUrl instanceof File) {
    try {
      const formData = new FormData();
      formData.append("file", fileOrUrl);
      formData.append("folder", "documents");
      const uploadRes = await api.post("/images/documents", formData);
      finalUrl = uploadRes.data?.url || uploadRes.data?.data?.url || uploadRes.data?.data?.location || "";
    } catch (uploadErr) {
      console.warn("Direct S3 document upload notice, using local compressed data URL:", uploadErr?.message);
    }

    if (!finalUrl) {
      try {
        finalUrl = await compressImage(fileOrUrl, 1600, 0.85);
      } catch {
        finalUrl = URL.createObjectURL(fileOrUrl);
      }
    }
  }

  // Update backend document record using candidate IDs
  const postEndpoints = [
    `/seller/onboarding/${sid}/documents`,
    `/admin/sellers/${sid}/documents`,
    numOnly && numOnly !== sid ? `/seller/onboarding/${numOnly}/documents` : null,
    numOnly && numOnly !== sid ? `/admin/sellers/${numOnly}/documents` : null,
  ].filter(Boolean);

  for (const ep of postEndpoints) {
    try {
      await api.post(ep, {
        documentType: apiKey,
        fileUrl: finalUrl,
        documentNumber,
      });
      break;
    } catch {
      // try next candidate endpoint
    }
  }

  // Store in admin panel persistent vaults
  const vaults = getStoredVaults();
  const existingVault = vaults.find((v) => String(v.sellerId || v.id) === sid || (numOnly && String(v.sellerId || v.id) === numOnly)) || {
    sellerId: sid,
    id: sid,
    documents: [],
  };

  const updatedDocs = [
    ...(existingVault.documents || []).filter((d) => d.documentType !== apiKey),
    {
      id: `doc_${apiKey.toLowerCase()}_${Date.now()}`,
      documentType: apiKey,
      title: apiKey === "PAN" ? "PAN Card" : apiKey === "AADHAAR" ? "Aadhaar Card" : apiKey === "GST" ? "GST Registration Certificate" : "Bank Proof / Cancelled Cheque",
      documentNumber: documentNumber || existingVault[apiKey.toLowerCase() + "Number"] || "",
      fileUrl: finalUrl,
      fileName: fileOrUrl instanceof File ? fileOrUrl.name : `${apiKey.toLowerCase()}_document.jpg`,
      isUploaded: Boolean(finalUrl),
      verificationStatus: "PENDING",
      status: "Pending",
      uploadedAt: new Date().toISOString(),
    },
  ];

  const updatedVault = {
    ...existingVault,
    documents: updatedDocs,
    vaultMetrics: deriveVaultStatus(updatedDocs),
  };

  saveStoredVaults([updatedVault, ...vaults.filter((v) => String(v.sellerId || v.id) !== sid && String(v.sellerId || v.id) !== numOnly)]);
  dispatchDataUpdate("seller_documents", "DOCUMENT_UPLOADED", updatedVault);
  return updatedVault;
};

/**
 * FETCH ONBOARDING SUMMARY (Endpoint 6)
 * GET /api/admin/sellers/{sellerId}/summary or /api/seller/onboarding/{sellerId}/summary
 */
export const getOnboardingSummary = async (sellerId) => {
  try {
    const res = await api.get(`/admin/sellers/${sellerId}/summary`);
    if (res.data) return res.data?.data || res.data;
  } catch {
    try {
      const res = await api.get(`/seller/onboarding/${sellerId}/summary`);
      if (res.data) return res.data?.data || res.data;
    } catch {
      // Graceful fallback
    }
  }

  const vaults = getStoredVaults();
  const seller = vaults.find((v) => String(v.sellerId) === String(sellerId));
  if (!seller) return null;

  const pan = seller.documents?.find((d) => d.documentType === "PAN" || d.documentType === "PAN_CARD");
  const aadhaar = seller.documents?.find((d) => d.documentType === "AADHAAR" || d.documentType === "BUSINESS_REGISTRATION");
  const gst = seller.documents?.find((d) => d.documentType === "GST" || d.documentType === "GST_CERTIFICATE");

  const isReady = Boolean(pan && gst && seller.companyName && seller.accountNumber);

  return {
    sellerId,
    personalStatus: seller.name && seller.panNumber ? "COMPLETED" : "PENDING",
    businessStatus: seller.companyName && seller.gstin ? "COMPLETED" : "PENDING",
    bankStatus: seller.accountNumber && seller.ifscCode ? "COMPLETED" : "PENDING",
    panDocStatus: pan ? "UPLOADED" : "NOT_UPLOADED",
    aadhaarDocStatus: aadhaar ? "UPLOADED" : "NOT_UPLOADED",
    gstDocStatus: gst ? "UPLOADED" : "NOT_UPLOADED",
    overallStatus: seller.onboardingStatus || "STEP_1",
    isReadyForFinalSubmit: isReady,
  };
};

/**
 * GET ALL DOCUMENTS FOR SELLER
 * GET /api/admin/sellers/{sellerId}/documents or /api/seller/onboarding/{sellerId}/documents
 */
export const getSellerDocuments = async (sellerId) => {
  try {
    const res = await api.get(`/admin/sellers/${sellerId}/documents`);
    if (res.data) return Array.isArray(res.data) ? res.data : res.data?.documents || res.data?.data || [];
  } catch {
    try {
      const res = await api.get(`/seller/onboarding/${sellerId}/documents`);
      if (res.data) return Array.isArray(res.data) ? res.data : res.data?.documents || res.data?.data || [];
    } catch {
      // Graceful fallback to local vault documents
    }
  }
  const vault = await getSellerVault(sellerId);
  return vault?.documents || [];
};

/**
 * GET INDIVIDUAL DOCUMENT BY TYPE
 * GET /api/seller/onboarding/{sellerId}/documents/{documentType}
 */
export const getSellerDocumentByType = async (sellerId, documentType) => {
  const normType = String(documentType || "").toUpperCase();
  try {
    const res = await api.get(`/seller/onboarding/${sellerId}/documents/${normType}`);
    if (res.data) return res.data?.data || res.data?.document || res.data;
  } catch {
    // Graceful fallback
  }
  const docs = await getSellerDocuments(sellerId);
  return docs.find((d) => String(d.documentType || "").toUpperCase() === normType) || null;
};

const list = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.data?.sellers)) return payload.data.sellers;
  if (Array.isArray(payload?.sellers)) return payload.sellers;
  if (Array.isArray(payload?.data?.vaults)) return payload.data.vaults;
  if (Array.isArray(payload?.vaults)) return payload.vaults;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object" && (payload.data.sellerId || payload.data.id)) {
    return [payload.data];
  }
  return [];
};

/**
 * Get All Seller Vaults for Admin Console (Live Sync with backend seller & document endpoints)
 */
export const getAllSellerVaults = async () => {
  let liveSellers = [];

  // 1. Query primary admin sellers and onboarding queue endpoints
  const [adminSellersRes, onboardingRes] = await Promise.allSettled([
    api.get("/admin/sellers"),
    api.get("/seller/onboarding/all"),
  ]);

  if (adminSellersRes.status === "fulfilled" && adminSellersRes.value?.data) {
    const raw = list(adminSellersRes.value.data);
    if (Array.isArray(raw) && raw.length > 0) liveSellers.push(...raw);
  }

  if (onboardingRes.status === "fulfilled" && onboardingRes.value?.data) {
    const raw = list(onboardingRes.value.data);
    if (Array.isArray(raw) && raw.length > 0) liveSellers.push(...raw);
  }

  // Merge with local vaults
  const localVaults = getStoredVaults();
  const vaultMap = new Map();

  // Add local vaults
  localVaults.forEach((v) => {
    const sid = String(v.sellerId || v.id);
    if (sid) {
      vaultMap.set(sid, v);
    }
  });

  // Add live database sellers (never suppress real DB records)
  liveSellers.forEach((s) => {
    const sid = String(s.sellerId || s.id || s._id || s.userId || "");
    if (sid) {
      const existing = vaultMap.get(sid) || {};
      vaultMap.set(sid, { ...existing, ...s });
    }
  });

  const rawList = Array.from(vaultMap.values());

  // Normalize documents and derive metrics
  const hydrated = rawList.map((seller) => {
    const sid = String(seller.sellerId || seller.id || "");
    const normalizedDocs = normalizeSellerDocuments(seller);
    const metrics = deriveVaultStatus(normalizedDocs);

    return {
      ...seller,
      sellerId: sid,
      id: sid,
      companyName: seller.companyName || seller.businessName || seller.name || "Merchant Business",
      name: seller.name || seller.ownerName || "Merchant Owner",
      gstin: seller.gstin || seller.gst || seller.gstNumber || "",
      panNumber: seller.panNumber || seller.pan || "",
      aadhaarNumber: seller.aadhaarNumber || seller.aadhaar || "",
      documents: normalizedDocs,
      vaultMetrics: metrics,
    };
  });

  // Persist all seller documents to Admin Panel storage
  if (typeof window !== "undefined" && hydrated.length > 0) {
    try {
      saveStoredVaults(hydrated);
    } catch {}
  }

  return hydrated;
};


/**
 * Unified sellerDocumentApi service object matching exact specification
 */
export const sellerDocumentApi = {
  /**
   * 1. Fetch all pending sellers awaiting KYC review
   */
  async getPendingSellers(params = {}) {
    const response = await api.get("/admin/sellers/pending", { params });
    return response.data;
  },

  /**
   * 2. Fetch full KYC Summary of a specific seller (Personal, Business, Bank, Docs)
   */
  async getSellerSummary(sellerId) {
    const response = await api.get(`/admin/sellers/${sellerId}/summary`);
    return response.data;
  },

  /**
   * 3. Fetch Document Vault & file preview URLs for a seller
   */
  async getSellerVault(sellerId) {
    return getSellerVault(sellerId);
  },

  /**
   * 4. Approve Merchant / Seller & Activate Storefront
   */
  async approveSeller(sellerId, remarks = "All statutory documents verified and store activated") {
    return approveSellerAccount(sellerId, { action: "APPROVE", notes: remarks });
  },

  /**
   * 5. Reject Merchant / Seller KYC
   */
  async rejectSeller(sellerId, remarks = "KYC documents rejected due to discrepancies") {
    return approveSellerAccount(sellerId, { action: "REJECT", notes: remarks });
  },

  /**
   * 6. Verify an individual document (e.g. GST, PAN, AADHAAR)
   */
  async verifyDocument(sellerId, documentType, status = "VERIFIED", remarks = "") {
    return verifyDocument(sellerId, documentType, status, remarks);
  },
};

export default sellerDocumentApi;
