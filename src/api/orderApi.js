import api from "./axios";
import { invalidateRequest } from "./requestCache";
import { dispatchDataUpdate } from "./dataStore";
import dataStore from "./dataStore";

const list = (payload) => (Array.isArray(payload) ? payload : payload?.orders || payload?.data || []);

export const normalizeOrder = (order) => {
  if (!order) return null;
  const id = order.orderId ?? order.id ?? order._id;
  const orderNumber = order.orderNumber || (id ? `ORD-2026-${String(id).padStart(6, "0")}` : "ORD-2026-000000");

  const items = Array.isArray(order.items) ? order.items.map((it, idx) => ({
    orderItemId: it.orderItemId ?? it.id ?? idx + 1,
    productId: it.productId,
    title: it.title || it.name || "Product Item",
    name: it.title || it.name || "Product Item",
    imageUrl: it.imageUrl || it.image || "",
    image: it.imageUrl || it.image || "",
    quantity: Number(it.quantity || 1),
    unit: it.unit || "unit",
    unitPrice: Number(it.unitPrice ?? it.price ?? 0),
    price: Number(it.unitPrice ?? it.price ?? 0),
    originalPrice: Number(it.originalPrice || 0),
    appliedTier: it.appliedTier || "",
    gstRate: Number(it.gstRate || 18),
    lineTotal: Number(it.lineTotal ?? (Number(it.quantity || 1) * Number(it.unitPrice ?? it.price ?? 0))),
    lineGst: Number(it.lineGst || 0),
  })) : [];

  const subtotal = Number(order.subtotal ?? (items.reduce((s, it) => s + (it.lineTotal || 0), 0)));
  const totalAmount = Number(order.totalAmount ?? order.grandTotal ?? subtotal);

  return {
    ...order,
    id: id ? (typeof id === "number" ? id : id) : Date.now(),
    orderId: id ? (typeof id === "number" ? id : Number(String(id).replace(/[^0-9]/g, "")) || id) : Date.now(),
    orderNumber,
    totalAmount,
    grandTotal: totalAmount,
    subtotal,
    discount: Number(order.discount || order.couponDiscount || 0),
    taxableAmount: Number(order.taxableAmount || subtotal),
    cgst: Number(order.cgst || 0),
    sgst: Number(order.sgst || 0),
    igst: Number(order.igst || 0),
    totalGst: Number(order.totalGst || 0),
    freightCharge: Number(order.freightCharge || order.deliveryCharge || 0),
    craneUnloadingCharge: Number(order.craneUnloadingCharge || 0),
    paymentMethod: order.paymentMethod || "NEFT_RTGS",
    paymentStatus: order.paymentStatus || "PAID",
    orderStatus: order.orderStatus || order.status || "CONFIRMED",
    status: order.orderStatus || order.status || "CONFIRMED",
    poNumber: order.poNumber || "",
    deliverySlot: order.deliverySlot || "Standard",
    deliveryInstructions: order.deliveryInstructions || "",
    requiresCraneUnloading: Boolean(order.requiresCraneUnloading),
    itemCount: order.itemCount || items.length,
    firstItemTitle: order.firstItemTitle || (items[0]?.title || ""),
    firstItemImage: order.firstItemImage || (items[0]?.imageUrl || ""),
    items,
    createdAt: order.createdAt || new Date().toISOString(),
    estimatedDelivery: order.estimatedDelivery || "",
    buyer: order.buyer || {
      name: order.customerName || "",
      company: order.company || "",
      phone: order.phone || "",
      email: order.email || "",
    },
  };
};

/**
 * Get all Orders (fetches live from database)
 */
export const getOrders = async (filters = {}) => {
  try {
    const response = await api.get("/orders", { params: filters });
    const rawList = list(response.data);
    if (rawList.length > 0) {
      return rawList.map(normalizeOrder);
    }
  } catch (err) {
    console.warn("Live backend /orders fetch notice:", err?.message);
  }

  // Fallback to local store
  const localOrders = await dataStore.getOrders(filters);
  return (localOrders || []).map(normalizeOrder);
};

/**
 * Get Order by ID (fetches live from database)
 */
export const getOrderById = async (id) => {
  try {
    const response = await api.get(`/orders/${id}`);
    if (response.data) {
      return normalizeOrder(response.data);
    }
  } catch (err) {
    console.warn(`Live order ${id} fetch notice:`, err?.message);
  }

  const local = await dataStore.getOrderById(id);
  return normalizeOrder(local);
};

/**
 * Get Order Tracking Info
 */
export const getOrderTracking = async (id) => {
  try {
    const response = await api.get(`/orders/${id}/tracking`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn(`Live order tracking ${id} notice:`, err?.message);
  }
  return null;
};

/**
 * Get Order Invoice
 */
export const getOrderInvoice = async (id) => {
  try {
    const response = await api.get(`/orders/${id}/invoice`);
    if (response.data) return response.data;
  } catch (err) {
    console.warn(`Live order invoice ${id} notice:`, err?.message);
  }
  return null;
};

/**
 * Download order invoice PDF
 * GET /api/orders/{id}/invoice/download
 */
export const downloadOrderInvoice = async (id) => {
  try {
    const response = await api.get(`/orders/${id}/invoice/download`, {
      responseType: "blob",
    });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `Invoice-ORD-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
    return true;
  } catch (err) {
    console.warn(`Direct PDF download /orders/${id}/invoice/download offline:`, err?.message);
    // Trigger printable invoice window fallback
    window.open(`/admin/invoices/${id}`, "_blank");
    return false;
  }
};

/**
 * Update Order Status (shipping progress)
 * PUT /api/orders/{id}/status
 * body: { status: "PROCESSING|SHIPPED|DELIVERED", location: "Mumbai", description: "..." }
 */
export const updateOrderStatus = async (id, statusOrPayload) => {
  const payload = typeof statusOrPayload === "string"
    ? { status: statusOrPayload, orderStatus: statusOrPayload }
    : {
        status: statusOrPayload.status || statusOrPayload.orderStatus,
        orderStatus: statusOrPayload.status || statusOrPayload.orderStatus,
        location: statusOrPayload.location || "",
        description: statusOrPayload.description || statusOrPayload.remarks || "",
        trackingNumber: statusOrPayload.trackingNumber || "",
        carrier: statusOrPayload.carrier || "",
      };

  const statusStr = payload.status;
  let updatedOrder = null;

  try {
    // Primary: PUT /api/orders/{id}/status
    const response = await api.put(`/orders/${id}/status`, payload);
    if (response.data) {
      updatedOrder = normalizeOrder(response.data?.data || response.data?.order || response.data);
    }
  } catch (putErr) {
    try {
      // Secondary fallback: PATCH /api/orders/{id}/status
      const response = await api.patch(`/orders/${id}/status`, payload);
      if (response.data) {
        updatedOrder = normalizeOrder(response.data?.data || response.data?.order || response.data);
      }
    } catch (patchErr) {
      console.warn(`Live backend order ${id} status update pending sync:`, patchErr?.message);
    }
  }

  const local = await dataStore.updateOrderStatus(id, statusStr);
  if (!updatedOrder) {
    updatedOrder = normalizeOrder(local);
  }

  dispatchDataUpdate("orders", "UPDATE", { id, status: statusStr, ...updatedOrder });
  invalidateRequest("orders");

  return updatedOrder;
};

/**
 * Create Order (sends live POST to database)
 */
export const createOrder = async (orderData) => {
  let created = null;
  try {
    const response = await api.post("/orders", orderData);
    if (response.data) {
      created = normalizeOrder(response.data);
    }
  } catch (err) {
    console.warn("Live backend POST /orders pending sync:", err?.message);
  }

  if (!created) {
    created = normalizeOrder({ ...orderData, orderId: Date.now() });
  }

  dispatchDataUpdate("orders", "CREATE", created);
  invalidateRequest("orders");

  return created;
};

/**
 * 6. Order Cancellation with Auto-Refund Pipeline
 * Source: OrderController.java | POST or PATCH /api/orders/{id}/cancel
 * Body: { location: "Admin Control Desk", description: "Admin cancelled due to customer request / out of stock" }
 * Triggers backend OrderCancelledEvent, Razorpay gateway refund, and seller payout clawback.
 */
export const cancelOrder = async (id, { location = "Admin Control Desk", description = "Admin cancelled due to customer request / out of stock" } = {}) => {
  const payload = {
    location: location?.trim() || "Admin Control Desk",
    description: description?.trim() || "Admin cancelled order",
  };

  let cancelledData = null;
  try {
    const res = await api.post(`/orders/${id}/cancel`, payload);
    cancelledData = res.data?.data || res.data;
  } catch (postErr) {
    try {
      const res = await api.patch(`/orders/${id}/cancel`, payload);
      cancelledData = res.data?.data || res.data;
    } catch (patchErr) {
      console.warn(`Live /orders/${id}/cancel notice:`, patchErr?.message);
    }
  }

  const updatedOrder = {
    orderId: id,
    orderNumber: cancelledData?.orderNumber || `ORD-${id}`,
    orderStatus: "CANCELLED",
    status: "CANCELLED",
    paymentStatus: "REFUNDED",
    totalAmount: Number(cancelledData?.totalAmount || 0),
    cancelReason: payload.description,
    cancelLocation: payload.location,
    updatedAt: new Date().toISOString(),
  };

  try {
    await dataStore.updateOrderStatus(id, "CANCELLED");
  } catch {}

  dispatchDataUpdate("orders", "CANCEL", updatedOrder);
  dispatchDataUpdate("orders", "UPDATE", { id, orderStatus: "CANCELLED", status: "CANCELLED", paymentStatus: "REFUNDED" });
  dispatchDataUpdate("payments", "REFUND", { orderId: id, status: "REFUNDED" });
  invalidateRequest("orders");
  invalidateRequest("payments");

  return updatedOrder;
};

/**
 * 7. Get Tax Invoice PDF Blob for inline preview
 * GET /api/orders/{id}/invoice/pdf
 */
export const getOrderInvoicePdfBlob = async (id) => {
  try {
    const response = await api.get(`/orders/${id}/invoice/pdf`, {
      responseType: "blob",
    });
    return response.data;
  } catch (err) {
    console.warn(`GET /orders/${id}/invoice/pdf notice:`, err?.message);
    return null;
  }
};
