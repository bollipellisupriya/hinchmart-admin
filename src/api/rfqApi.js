import api from "./axios";
import { invalidateRequest } from "./requestCache";
import { dispatchDataUpdate } from "./dataStore";
import dataStore from "./dataStore";

const list = (payload) => (Array.isArray(payload) ? payload : payload?.rfqs || payload?.data || []);

export const normalizeRFQ = (rfq) => {
  if (!rfq) return null;
  const id = rfq.rfqId ?? rfq.id ?? rfq._id;
  const rfqNumber = rfq.rfqNumber || (id ? `RFQ-2026-${String(id).padStart(6, "0")}` : "RFQ-2026-000000");

  return {
    ...rfq,
    id: id ? (typeof id === "number" ? id : id) : Date.now(),
    rfqId: id ? (typeof id === "number" ? id : Number(String(id).replace(/[^0-9]/g, "")) || id) : Date.now(),
    rfqNumber,
    title: rfq.title || "Bulk Procurement",
    category: rfq.category || "Civil & Structural",
    productMaterial: rfq.productMaterial || rfq.title || "",
    quantity: Number(rfq.quantity || 1),
    unit: rfq.unit || "MT",
    technicalGrade: rfq.technicalGrade || "",
    mtcRequired: Boolean(rfq.mtcRequired),
    deliveryLocation: rfq.deliveryLocation || "",
    requiredByDate: rfq.requiredByDate || "",
    siteAccess: rfq.siteAccess || "Heavy Trailer Access Available",
    craneRequired: Boolean(rfq.craneRequired),
    targetBudget: Number(rfq.targetBudget || 0),
    paymentTerms: rfq.paymentTerms || "LETTER_OF_CREDIT",
    specifications: rfq.specifications || "",
    boqAttachmentUrl: rfq.boqAttachmentUrl || "",
    status: rfq.status || "OPEN",
    quotesCount: Number(rfq.quotesCount ?? (Array.isArray(rfq.quotes) ? rfq.quotes.length : 0)),
    createdAt: rfq.createdAt || new Date().toISOString(),
  };
};

/**
 * Get all RFQs (fetches live from database)
 */
export const getRFQs = async (filters = {}) => {
  try {
    const response = await api.get("/rfqs", { params: filters });
    const rawList = list(response.data);
    if (rawList.length > 0) {
      return rawList.map(normalizeRFQ);
    }
  } catch (err) {
    console.warn("Live backend /rfqs fetch notice:", err?.message);
  }

  const localRFQs = await dataStore.getRFQs(filters);
  return (localRFQs || []).map(normalizeRFQ);
};

/**
 * Get RFQ by ID (fetches live from database)
 */
export const getRFQById = async (id) => {
  try {
    const response = await api.get(`/rfqs/${id}`);
    if (response.data) {
      return normalizeRFQ(response.data);
    }
  } catch (err) {
    console.warn(`Live rfq ${id} fetch notice:`, err?.message);
  }

  const all = await getRFQs();
  return all.find((r) => String(r.rfqId || r.id) === String(id)) || null;
};

/**
 * Create a new RFQ (sends live POST to database)
 */
export const createRFQ = async (data) => {
  let created = null;
  try {
    const response = await api.post("/rfqs", data);
    if (response.data) {
      created = normalizeRFQ(response.data);
    }
  } catch (err) {
    console.warn("Live backend POST /rfqs pending sync:", err?.message);
  }

  if (!created) {
    const newId = Date.now();
    created = normalizeRFQ({ ...data, rfqId: newId, id: newId });
  }

  dispatchDataUpdate("rfqs", "CREATE", created);
  invalidateRequest("rfqs");

  return created;
};

/**
 * Close or Update RFQ status
 */
export const closeRFQ = async (id) => {
  let updated = null;
  try {
    const response = await api.put(`/rfqs/${id}`, { status: "CLOSED" });
    if (response.data) {
      updated = normalizeRFQ(response.data);
    }
  } catch (err) {
    console.warn(`Live backend close RFQ ${id} pending sync:`, err?.message);
  }

  const local = await dataStore.closeRFQ(id);
  if (!updated) {
    updated = normalizeRFQ(local);
  }

  dispatchDataUpdate("rfqs", "UPDATE", { id, status: "CLOSED", ...updated });
  invalidateRequest("rfqs");

  return updated;
};

/**
 * Get RFQ Quotations
 */
export const getRFQQuotations = async (rfqId) => {
  try {
    const response = await api.get(`/rfqs/${rfqId}/quotations`);
    return response.data;
  } catch (err) {
    console.warn(`Live RFQ quotations ${rfqId} notice:`, err?.message);
  }
  return [];
};

/**
 * Submit Quotation for RFQ
 */
export const submitRFQQuotation = async (rfqId, quoteData) => {
  try {
    const response = await api.post(`/rfqs/${rfqId}/quotations`, quoteData);
    invalidateRequest("rfqs");
    return response.data;
  } catch (err) {
    console.warn(`Live submit RFQ quotation ${rfqId} notice:`, err?.message);
    throw err;
  }
};

/**
 * Accept RFQ Quote
 */
export const acceptRFQQuote = async (quoteId) => {
  try {
    const response = await api.post(`/rfqs/quotes/${quoteId}/accept`);
    invalidateRequest("rfqs");
    return response.data;
  } catch (err) {
    console.warn(`Live accept RFQ quote ${quoteId} notice:`, err?.message);
    throw err;
  }
};
