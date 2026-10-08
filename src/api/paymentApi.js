import api from "./axios";
import { invalidateRequest } from "./requestCache";
import { dispatchDataUpdate } from "./dataStore";
import { getOrders, getOrderById } from "./orderApi";

const STORAGE_KEY_PAYMENTS = "hinchmart_admin_payments_v2";
const STORAGE_KEY_PAYOUT_LEDGER = "hinchmart_seller_payout_ledger_v2";

/**
 * Normalizes payment transaction payload across both legacy and gateway fields
 */
export const normalizePayment = (raw) => {
  if (!raw) return null;
  const paymentId = raw.paymentId ?? raw.id ?? raw._id ?? null;
  const orderId = raw.orderId ?? raw.order_id ?? null;
  const customerId = raw.customerId ?? raw.buyerId ?? raw.userId ?? null;
  const status = (raw.status || raw.paymentStatus || "PENDING").toUpperCase();
  const method = (raw.paymentMethod || raw.method || "UPI").toUpperCase();

  const buyerName = raw.customerName || raw.buyer?.name || raw.buyerName || "";
  const buyerPhone = raw.customerPhone || raw.buyer?.phone || raw.phone || "";
  const sellerName = raw.sellerName || raw.seller?.name || "";

  return {
    ...raw,
    paymentId,
    id: paymentId,
    customerId,
    customerName: buyerName,
    customerPhone: buyerPhone,
    buyerName,
    buyerPhone,
    buyer: {
      name: buyerName,
      phone: buyerPhone,
      email: raw.buyer?.email || raw.email || "",
      company: raw.buyer?.company || raw.company || "",
    },
    sellerName,
    seller: {
      name: sellerName,
      company: raw.seller?.company || sellerName,
      email: raw.seller?.email || "",
      phone: raw.seller?.phone || "",
    },
    orderId,
    orderNumber: raw.orderNumber || (orderId ? `ORD-${orderId}` : "—"),
    razorpayPaymentId: raw.razorpayPaymentId || raw.gatewayRef || "",
    razorpayOrderId: raw.razorpayOrderId || "",
    status,
    paymentStatus: status,
    amount: Number(raw.amount || 0),
    currency: raw.currency || "INR",
    purpose: raw.purpose || (orderId ? "CHECKOUT" : "WALLET_TOPUP"),
    paymentMethod: method,
    method,
    vpa: raw.vpa || null,
    bank: raw.bank || null,
    cardNetwork: raw.cardNetwork || null,
    cardLast4: raw.cardLast4 || null,
    errorCode: raw.errorCode || null,
    errorDescription: raw.errorDescription || null,
    createdAt: raw.createdAt || raw.date || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    date: raw.createdAt ? new Date(raw.createdAt).toLocaleDateString("en-IN") : "",
  };
};

/**
 * Local storage persistence helper
 */
export const getStoredPayments = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizePayment).filter(Boolean);
      }
    }
  } catch {}
  return [];
};

export const setStoredPayments = (payments) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
  } catch {}
};

/**
 * 1. Trigger Order Refund
 * POST /api/payments/order/{orderId}/refund
 * Response: PaymentStatusResponse
 */
export const refundOrderPayment = async (orderId) => {
  const response = await api.post(`/payments/order/${orderId}/refund`);
  const data = response.data?.data || response.data;
  const normalized = normalizePayment({ ...data, status: "REFUNDED", paymentStatus: "REFUNDED" });

  // Update stored payments
  const existing = getStoredPayments();
  const updated = existing.map((p) =>
    String(p.orderId) === String(orderId) || String(p.paymentId) === String(normalized.paymentId)
      ? { ...p, ...normalized, status: "REFUNDED", paymentStatus: "REFUNDED" }
      : p
  );
  setStoredPayments(updated);

  // Claw back seller payout ledger
  reverseSellerPayout(orderId, "Refund processed via Razorpay API");

  dispatchDataUpdate("payments", "REFUND", { orderId, payment: normalized });
  dispatchDataUpdate("orders", "UPDATE", { id: orderId, paymentStatus: "REFUNDED" });
  invalidateRequest("payments");

  return normalized;
};

/**
 * 2. Get All Payment Records for a Specific Customer
 * GET /api/payments/customer/{customerId}
 */
export const getCustomerPayments = async (customerId) => {
  try {
    const response = await api.get(`/payments/customer/${customerId}`);
    const data = response.data?.data || response.data;
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizePayment).filter(Boolean);
    }
  } catch (err) {
    console.warn(`GET /payments/customer/${customerId} notice:`, err?.message);
  }

  // Fallback to filtering local stored payments by customerId
  const stored = getStoredPayments();
  return stored.filter((p) => String(p.customerId) === String(customerId));
};

/**
 * 3. Real-time Gateway Lookup by Razorpay Payment ID or numeric ID
 * GET /api/payments/{paymentId}/status
 */
export const getPaymentGatewayStatus = async (paymentIdOrRazorpayId) => {
  try {
    const response = await api.get(`/payments/${paymentIdOrRazorpayId}/status`);
    const data = response.data?.data || response.data;
    if (data) return data;
  } catch (err) {
    console.warn(`GET /payments/${paymentIdOrRazorpayId}/status notice:`, err?.message);
  }

  // Fallback to locally stored payment
  const all = getStoredPayments();
  const found = all.find(
    (p) =>
      String(p.paymentId) === String(paymentIdOrRazorpayId) ||
      String(p.razorpayPaymentId) === String(paymentIdOrRazorpayId)
  );

  if (found) {
    return {
      paymentId: found.paymentId,
      razorpayPaymentId: found.razorpayPaymentId,
      razorpayOrderId: found.razorpayOrderId,
      status: found.status,
      amount: found.amount,
      currency: found.currency,
      paymentMethod: found.paymentMethod,
      email: found.buyer?.email || "",
      contact: found.customerPhone || "",
      bank: found.bank || "",
      cardNetwork: found.cardNetwork || "",
      cardLast4: found.cardLast4 || "",
      errorCode: found.errorCode || null,
      errorDescription: found.errorDescription || null,
      verifiedAt: new Date().toISOString(),
    };
  }

  throw new Error(`Payment transaction ${paymentIdOrRazorpayId} status unavailable from gateway`);
};

/**
 * 4. Get Latest Payment Status for an Order
 * GET /api/payments/order/{orderId}/status
 */
export const getOrderPaymentStatus = async (orderId) => {
  try {
    const response = await api.get(`/payments/order/${orderId}/status`);
    const data = response.data?.data || response.data;
    if (data) return data;
  } catch (err) {
    console.warn(`GET /payments/order/${orderId}/status notice:`, err?.message);
  }

  const all = getStoredPayments();
  const found = all.find((p) => String(p.orderId) === String(orderId));
  if (found) {
    return {
      orderId: found.orderId,
      orderNumber: found.orderNumber,
      status: found.status,
      paymentMethod: found.paymentMethod,
      amount: found.amount,
    };
  }

  throw new Error(`Order #${orderId} payment status unavailable`);
};

/**
 * Get all Payments with optional filters
 * In this backend, financial payment transactions are linked to Orders.
 * Sourcing directly from live orders ensures real-time accuracy and prevents 404 errors.
 */
export const getPayments = async (filters = {}) => {
  let orderPayments = [];
  try {
    const orders = await getOrders();
    if (Array.isArray(orders) && orders.length > 0) {
      orderPayments = orders.map((ord) => {
        const orderId = ord.orderId ?? ord.id;
        const status = (ord.paymentStatus || (ord.orderStatus === "CANCELLED" ? "REFUNDED" : "COMPLETED")).toUpperCase();
        return normalizePayment({
          paymentId: ord.paymentId || (orderId ? `PAY-${orderId}` : null),
          orderId,
          orderNumber: ord.orderNumber,
          customerId: ord.buyer?.id || ord.customerId,
          customerName: ord.buyer?.name || ord.customerName || "Customer",
          customerPhone: ord.buyer?.phone || ord.phone || "",
          buyer: ord.buyer,
          sellerName: ord.sellerName || ord.seller?.name || "Marketplace Seller",
          seller: ord.seller,
          amount: Number(ord.totalAmount || ord.grandTotal || 0),
          currency: "INR",
          status,
          paymentStatus: status,
          paymentMethod: (ord.paymentMethod || "UPI").toUpperCase(),
          purpose: "CHECKOUT",
          createdAt: ord.createdAt,
          updatedAt: ord.updatedAt || ord.createdAt,
          rawOrder: ord,
        });
      }).filter(Boolean);
    }
  } catch (err) {
    console.warn("Notice: Unable to aggregate payments from orders:", err?.message);
  }

  // Merge with any locally recorded transactions (such as wallet top-ups or admin refunds)
  const stored = getStoredPayments();
  const map = new Map();
  orderPayments.forEach((p) => {
    const key = String(p.orderId || p.paymentId);
    if (key) map.set(key, p);
  });
  stored.forEach((p) => {
    const key = String(p.orderId || p.paymentId);
    if (key) {
      const existing = map.get(key);
      map.set(key, existing ? { ...existing, ...p } : p);
    } else {
      map.set(String(p.id || Math.random()), p);
    }
  });

  let list = Array.from(map.values());
  if (filters.status && filters.status !== "ALL") {
    list = list.filter((p) => (p.status || "").toUpperCase() === filters.status.toUpperCase());
  }
  if (filters.method && filters.method !== "ALL") {
    list = list.filter((p) => (p.paymentMethod || "").toUpperCase() === filters.method.toUpperCase());
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        String(p.paymentId || "").toLowerCase().includes(q) ||
        String(p.orderNumber || "").toLowerCase().includes(q) ||
        String(p.customerName || "").toLowerCase().includes(q)
    );
  }
  return list;
};

/**
 * Get Payment by ID
 */
export const getPaymentById = async (id) => {
  const stored = getStoredPayments();
  const found = stored.find(
    (p) =>
      String(p.paymentId) === String(id) ||
      String(p.id) === String(id) ||
      String(p.orderId) === String(id) ||
      String(p.razorpayPaymentId) === String(id)
  );
  if (found) return found;

  try {
    const order = await getOrderById(id);
    if (order) {
      const orderId = order.orderId ?? order.id;
      return normalizePayment({
        paymentId: order.paymentId || (orderId ? `PAY-${orderId}` : null),
        orderId,
        orderNumber: order.orderNumber,
        customerId: order.buyer?.id || order.customerId,
        customerName: order.buyer?.name || order.customerName || "Customer",
        customerPhone: order.buyer?.phone || order.phone || "",
        buyer: order.buyer,
        sellerName: order.sellerName || order.seller?.name || "Marketplace Seller",
        seller: order.seller,
        amount: Number(order.totalAmount || order.grandTotal || 0),
        currency: "INR",
        status: (order.paymentStatus || (order.orderStatus === "CANCELLED" ? "REFUNDED" : "COMPLETED")).toUpperCase(),
        paymentMethod: (order.paymentMethod || "UPI").toUpperCase(),
        purpose: "CHECKOUT",
        createdAt: order.createdAt,
      });
    }
  } catch (err) {
    console.warn(`Payment lookup by order ${id} notice:`, err?.message);
  }

  return null;
};

/* ==========================================================================
   SELLER PAYOUT LEDGER & SETTLEMENT CALCULATION
   Formula: Net Seller Payout = Gross Amount - Platform Fee (10%) - 1% TCS
   ========================================================================== */

export const computeSellerPayout = (grossAmount, platformFeeRate = 0.1, tcsRate = 0.01) => {
  const gross = Number(grossAmount || 0);
  const platformFee = Math.round(gross * platformFeeRate * 100) / 100;
  const tcs = Math.round(gross * tcsRate * 100) / 100;
  const netPayout = Math.round((gross - platformFee - tcs) * 100) / 100;

  return {
    grossAmount: gross,
    platformFee,
    platformCommission: platformFee,
    tcsAmount: tcs,
    netPayout,
  };
};

/**
 * Get all Seller Payout Ledgers
 */
export const getSellerPayoutLedgers = async () => {
  try {
    const response = await api.get("/seller-payouts");
    const data = response.data?.data || response.data;
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (err) {
    // optional live endpoint
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAYOUT_LEDGER);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
  }

  // Derive ledgers from actual recorded payments
  const payments = getStoredPayments();
  const ledgers = payments
    .filter((p) => p.purpose === "CHECKOUT" && p.orderId)
    .map((p, idx) => {
      const { grossAmount, platformFee, platformCommission, tcsAmount, netPayout } = computeSellerPayout(p.amount);
      const isRefunded = p.status === "REFUNDED";
      const id = p.payoutId || p.ledgerId || (500 + idx + 1);

      return {
        payoutId: id,
        ledgerId: id,
        id,
        orderId: p.orderId,
        orderNumber: p.orderNumber,
        sellerId: p.sellerId || null,
        sellerName: p.sellerName || "",
        grossAmount,
        platformFee,
        platformCommission,
        tcsAmount,
        netPayout,
        currency: "INR",
        status: isRefunded ? "REVERSED" : (p.status === "DELIVERED" ? "PAID" : "PENDING"),
        clawbackReason: isRefunded ? "Order refunded to customer via Razorpay" : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_PAYOUT_LEDGER, JSON.stringify(ledgers));
    } catch {}
  }
  return ledgers;
};

/**
 * Reverses a seller payout upon order cancellation or refund (clawback)
 */
export const reverseSellerPayout = (orderId, clawbackReason = "Order cancelled / refund issued") => {
  const ledgers = getStoredPayments(); // Read current ledgers
  let currentLedgers = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAYOUT_LEDGER);
      if (raw) currentLedgers = JSON.parse(raw) || [];
    } catch {}
  }

  const updated = currentLedgers.map((l) =>
    String(l.orderId) === String(orderId)
      ? {
          ...l,
          status: "REVERSED",
          clawbackReason: clawbackReason || "Order cancellation clawback",
          updatedAt: new Date().toISOString(),
        }
      : l
  );

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_PAYOUT_LEDGER, JSON.stringify(updated));
    } catch {}
  }
  dispatchDataUpdate("payouts", "REVERSE", { orderId, clawbackReason });
  return updated;
};

/**
 * Disburse seller payout (sets status to PAID)
 */
export const disburseSellerPayout = (id) => {
  let currentLedgers = [];
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PAYOUT_LEDGER);
      if (raw) currentLedgers = JSON.parse(raw) || [];
    } catch {}
  }

  const updated = currentLedgers.map((l) =>
    String(l.ledgerId) === String(id) || String(l.payoutId) === String(id) || String(l.id) === String(id)
      ? { ...l, status: "PAID", updatedAt: new Date().toISOString() }
      : l
  );

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_PAYOUT_LEDGER, JSON.stringify(updated));
    } catch {}
  }
  dispatchDataUpdate("payouts", "DISBURSE", { id });
  return updated;
};

export default {
  getPayments,
  getPaymentById,
  refundOrderPayment,
  getCustomerPayments,
  getPaymentGatewayStatus,
  getOrderPaymentStatus,
  computeSellerPayout,
  getSellerPayoutLedgers,
  reverseSellerPayout,
  disburseSellerPayout,
};
