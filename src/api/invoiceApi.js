import api from "./axios";

const STORAGE_KEY_INVOICES = "hinchmart_tax_invoices_v2";

export const normalizeInvoice = (raw) => {
  if (!raw) return null;
  const orderId = raw.orderId ?? raw.order_id ?? null;
  const invoiceNumber = raw.invoiceNumber || (orderId ? `INV-${String(orderId).padStart(6, "0")}` : "INV-UNKNOWN");
  const subtotal = Number(raw.subtotal || raw.taxableAmount || 0);
  const cgst = Number(raw.cgst || (subtotal * 0.09));
  const sgst = Number(raw.sgst || (subtotal * 0.09));
  const gst = Number(raw.gst || (cgst + sgst));
  const total = Number(raw.totalAmount || raw.total || (subtotal + gst));

  return {
    ...raw,
    invoiceNumber,
    id: invoiceNumber,
    orderId,
    orderNumber: raw.orderNumber || (orderId ? `ORD-${orderId}` : "—"),
    invoiceDate: raw.invoiceDate || raw.date || new Date().toISOString().slice(0, 10),
    date: raw.invoiceDate || raw.date || new Date().toISOString().slice(0, 10),
    sellerGstin: raw.sellerGstin || "",
    customerGstin: raw.customerGstin || "",
    subtotal,
    taxableAmount: subtotal,
    cgst,
    sgst,
    gst,
    totalAmount: total,
    total,
    paymentMethod: raw.paymentMethod || "UPI",
    paymentStatus: raw.paymentStatus || "PAID",
    status: raw.status || (raw.paymentStatus === "REFUNDED" ? "Cancelled" : "Generated"),
    buyer: raw.buyer || {
      name: raw.customerName || "",
      company: raw.company || "",
      gstin: raw.customerGstin || "",
    },
    seller: raw.seller || {
      name: raw.sellerName || "",
      company: raw.sellerCompany || raw.sellerName || "",
      gstin: raw.sellerGstin || "",
    },
  };
};

/**
 * Local storage persistence helper
 */
export const getStoredInvoices = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INVOICES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(normalizeInvoice).filter(Boolean);
    }
  } catch {}
  return [];
};

export const setStoredInvoices = (invoices) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
  } catch {}
};

/**
 * 7. Tax Invoice Metadata
 * GET /api/orders/{orderId}/invoice
 */
export const getOrderInvoiceMetadata = async (orderId) => {
  try {
    const res = await api.get(`/orders/${orderId}/invoice`);
    const data = res.data?.data || res.data;
    if (data) return normalizeInvoice(data);
  } catch (err) {
    console.warn(`GET /orders/${orderId}/invoice notice:`, err?.message);
  }

  const all = getStoredInvoices();
  return all.find((inv) => String(inv.orderId) === String(orderId)) || null;
};

/**
 * Download Tax Invoice PDF Attachment
 * GET /api/orders/{orderId}/invoice/download
 */
export const downloadOrderInvoicePdf = async (orderId) => {
  try {
    const response = await api.get(`/orders/${orderId}/invoice/download`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `TaxInvoice-ORD-${orderId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  } catch (err) {
    console.warn(`Direct PDF download /orders/${orderId}/invoice/download notice:`, err?.message);
    window.open(`/admin/invoices/${orderId}`, "_blank");
    return false;
  }
};

/**
 * Preview Tax Invoice PDF (Inline)
 * GET /api/orders/{orderId}/invoice/pdf
 */
export const previewOrderInvoicePdf = async (orderId) => {
  try {
    const response = await api.get(`/orders/${orderId}/invoice/pdf`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const fileUrl = window.URL.createObjectURL(blob);
    window.open(fileUrl, "_blank");
    return true;
  } catch (err) {
    console.warn(`Preview PDF /orders/${orderId}/invoice/pdf notice:`, err?.message);
    window.open(`/admin/invoices/${orderId}`, "_blank");
    return false;
  }
};

/**
 * Get all Tax Invoices
 */
export const getInvoices = async (filters = {}) => {
  try {
    const response = await api.get("/invoices", { params: filters });
    const data = response.data?.data || response.data?.invoices || response.data;
    if (Array.isArray(data)) {
      const normalized = data.map(normalizeInvoice).filter(Boolean);
      setStoredInvoices(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn("Live backend /invoices notice:", err?.message);
  }

  let list = getStoredInvoices();
  if (filters.status && filters.status !== "ALL") {
    list = list.filter((inv) => (inv.status || "").toUpperCase() === filters.status.toUpperCase());
  }
  return list;
};

/**
 * Get single Tax Invoice by ID or Order ID
 */
export const getInvoiceById = async (id) => {
  try {
    const response = await api.get(`/invoices/${id}`);
    const data = response.data?.data || response.data;
    if (data) {
      return normalizeInvoice(data);
    }
  } catch (err) {
    console.warn(`Live backend /invoices/${id} notice:`, err?.message);
  }

  // Fallback to local stored list
  const list = getStoredInvoices();
  const found = list.find((inv) => String(inv.id) === String(id) || String(inv.orderId) === String(id) || String(inv.invoiceNumber) === String(id));
  return found || null;
};


export default {
  getOrderInvoiceMetadata,
  downloadOrderInvoicePdf,
  previewOrderInvoicePdf,
  getInvoices,
};
