import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  User,
  Store,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  XCircle,
  FileText,
  IndianRupee,
  MapPin,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  Lock,
  ExternalLink,
  ArrowRight,
  GitCommit,
  Download,
  Printer,
  RefreshCw,
} from "lucide-react";
import { getOrderById, updateOrderStatus, cancelOrder } from "../api/orderApi";
import { refundOrderPayment, getOrderPaymentStatus } from "../api/paymentApi";
import { previewOrderInvoicePdf, downloadOrderInvoicePdf } from "../api/invoiceApi";
import dataStore from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const routeOrder = location.state?.order;
  const localOrder = dataStore.getOrderById(id);
  const cachedOrder = routeOrder || localOrder;

  const [order, setOrder] = useState(() => cachedOrder || null);
  const [loading, setLoading] = useState(!cachedOrder);
  const [error, setError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Cancellation Modal State (Endpoint #6: POST /api/orders/{id}/cancel)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    location: "Admin Control Desk",
    description: "",
  });
  const [cancelling, setCancelling] = useState(false);

  // Payment Verification State (Endpoint #4: GET /api/payments/order/{orderId}/status)
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [orderPaymentTelemetry, setOrderPaymentTelemetry] = useState(null);

  // Refund State (Endpoint #1: POST /api/payments/order/{orderId}/refund)
  const [refunding, setRefunding] = useState(false);

  // Invoice Action State (Endpoint #7: GET /api/orders/{id}/invoice/download & pdf)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const loadOrder = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const data = await getOrderById(id);
      if (!data) {
        setError("Order not found or unavailable.");
      } else {
        setOrder(data);
      }
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to view this order.");
      } else if (err?.response?.status === 404) {
        setError("Order not found (404).");
      } else {
        setError(err?.response?.data?.message || "Unable to load order details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeOrder) {
      setOrder(routeOrder);
      setLoading(false);
      loadOrder(false);
      return;
    }
    if (id && !order) loadOrder(true);
  }, [id, routeOrder]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus.toUpperCase() === "CANCELLED") {
      setShowCancelModal(true);
      return;
    }

    if (!window.confirm(`Update order status to "${newStatus}"?`)) return;
    try {
      setStatusUpdating(true);
      await updateOrderStatus(id, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      await loadOrder(false);
    } catch (err) {
      const msg =
        err?.response?.status === 403
          ? "You do not have permission to update this order."
          : err?.response?.data?.message || "Failed to update order status.";
      toast.error(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  // 6. Submit Order Cancellation Pipeline: POST /api/orders/{id}/cancel
  const handleConfirmCancelOrder = async (e) => {
    e.preventDefault();
    try {
      setCancelling(true);
      const res = await cancelOrder(id, {
        location: cancelForm.location,
        description: cancelForm.description,
      });
      toast.success(`Order #${id} cancelled. Auto-refund pipeline initiated!`);
      setShowCancelModal(false);
      setOrder((prev) => ({
        ...prev,
        status: "CANCELLED",
        orderStatus: "CANCELLED",
        paymentStatus: "REFUNDED",
      }));
      await loadOrder(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  // 4. Verify Latest Order Payment Status: GET /api/payments/order/{orderId}/status
  const handleVerifyPaymentStatus = async () => {
    try {
      setVerifyingPayment(true);
      const res = await getOrderPaymentStatus(id);
      setOrderPaymentTelemetry(res);
      if (res?.status) {
        setOrder((prev) => ({
          ...prev,
          paymentStatus: res.status,
          paymentMethod: res.paymentMethod || prev.paymentMethod,
        }));
      }
      toast.success(`Latest payment status verified: ${res?.status || "CAPTURED"}`);
    } catch (err) {
      toast.error("Failed to query order payment status from gateway.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  // 1. Trigger Direct Order Refund: POST /api/payments/order/{orderId}/refund
  const handleTriggerRefund = async () => {
    const confirmed = window.confirm(
      `Trigger gateway refund for Order #${id} via Razorpay API?\n\nThis calls Razorpay refund API, marks payment status as REFUNDED, and claws back seller payouts.`
    );
    if (!confirmed) return;

    try {
      setRefunding(true);
      const res = await refundOrderPayment(id);
      toast.success("Order refund processed successfully via Razorpay API!");
      setOrder((prev) => ({ ...prev, paymentStatus: "REFUNDED" }));
      await loadOrder(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to process order refund.");
    } finally {
      setRefunding(false);
    }
  };

  // 7. View & Download Tax Invoices
  const handlePreviewPdfInvoice = async () => {
    await previewOrderInvoicePdf(id);
  };

  const handleDownloadPdfInvoice = async () => {
    try {
      setDownloadingInvoice(true);
      await downloadOrderInvoicePdf(id);
      toast.success("Tax Invoice PDF downloaded successfully!");
    } catch (err) {
      toast.error("Failed to download PDF invoice.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const getStatus = (o) => (o?.status || o?.orderStatus || "Processing").toUpperCase();
  const getPaymentStatus = (o) => (o?.paymentStatus || o?.payment || "Pending").toUpperCase();

  if (loading) {
    return (
      <div className="content-card detail-loading-shell">
        <div className="spinner"></div>
        <h2>Opening order dossier</h2>
        <p>Checking saved order data and the backend in the background.</p>
        <button className="btn-secondary" onClick={() => navigate("/admin/orders")}>
          <ArrowLeft size={16} /> Back to Orders
        </button>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="content-card" style={{ padding: 40, textAlign: "center" }}>
        <AlertCircle size={48} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>{error || "Order Not Found"}</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          The requested order details could not be retrieved from the backend.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn-secondary" onClick={() => navigate("/admin/orders")}>
            <ArrowLeft size={16} /> Back to Orders
          </button>
          <button className="primary-button" onClick={loadOrder}>
            <RotateCcw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = getStatus(order);
  const currentPaymentStatus = getPaymentStatus(order);

  // Items and pricing breakdown
  const items = Array.isArray(order.items) ? order.items : [];

  const subtotal = Number(order.subtotal || items.reduce((s, it) => s + (Number(it.price || it.unitPrice || 0) * (it.quantity || 1)), 0));
  const tax = Number(order.tax || order.totalGst || (order.taxableAmount ? (subtotal * 0.18) : (order.totalAmount ? (order.totalAmount - subtotal) : 0)));
  const shipping = Number(order.shipping || order.freightCharge || 0);
  const total = Number(order.totalAmount || (subtotal + tax + shipping));

  const paymentId = order.paymentId || (id ? `PAY-${id}` : null);
  const shipmentId = order.shipmentId || (id ? `SHP-${id}` : null);
  const invoiceId = order.invoiceId || (id ? `INV-0000${id}` : null);

  return (
    <div className="order-details-container">
      {/* Top Header & Navigation */}
      <div className="review-top-bar">
        <button className="btn-back" onClick={() => navigate("/admin/orders")}>
          <ArrowLeft size={17} /> Back to Orders
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Tax Invoice Actions (Endpoint #7) */}
          <button
            className="btn-secondary"
            onClick={handlePreviewPdfInvoice}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Printer size={15} />
            Preview Tax Invoice (PDF)
          </button>

          <button
            className="btn-secondary"
            onClick={handleDownloadPdfInvoice}
            disabled={downloadingInvoice}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Download size={15} />
            {downloadingInvoice ? "Downloading..." : "Download Invoice PDF"}
          </button>

          <div className="review-header-badge">
            <span
              className={`status-badge-glow ${
                currentStatus === "DELIVERED"
                  ? "status-delivered"
                  : currentStatus === "CANCELLED"
                  ? "status-blocked"
                  : currentStatus === "SHIPPED"
                  ? "status-in-transit"
                  : "status-pending"
              }`}
            >
              <span className="status-dot"></span>
              {currentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Main Order Header Banner */}
      <div className="content-card order-summary-banner">
        <div className="order-summary-header-left">
          <div className="order-number-title">
            <ShoppingBag size={22} className="text-amber" />
            <h2>Order {order.orderNumber || `ORD-20261003-${id}`}</h2>
          </div>
          <div className="order-meta-row">
            <span>Placed on: <strong>{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "Today"}</strong></span>
            <span>•</span>
            <span>Items: <strong>{items.length} Product(s)</strong></span>
            <span>•</span>
            <span className="price-protection-tag">
              <Lock size={12} /> B2B Price Protected
            </span>
          </div>
        </div>

        <div className="order-summary-header-right">
          <span className="total-amount-label">Grand Total (Incl. GST)</span>
          <strong className="total-amount-display font-mono">
            ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* 6-Node B2B Lifecycle Trace Strip */}
      <div className="content-card order-traceability-card" style={{ background: "linear-gradient(to right, #0f172a, #1e293b)", color: "#ffffff", padding: "20px 24px" }}>
        <div className="traceability-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GitCommit size={18} style={{ color: "#f59e0b" }} />
            <h3 style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
              COMPLETE B2B BUSINESS LIFECYCLE TRACE
            </h3>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.15)", padding: "3px 8px", borderRadius: 6 }}>
            ✓ 100% Traceable
          </span>
        </div>

        <div className="trace-nodes-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {/* Node 1: Buyer */}
          <div className="trace-node-box" style={{ background: "#1e293b", padding: 12, borderRadius: 8, border: "1px solid #334155" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>1. BUYER</span>
            <strong style={{ display: "block", fontSize: 12.5, marginTop: 4, color: "#f8fafc" }}>
              {order.buyer?.name || order.buyerName || "—"}
            </strong>
          </div>

          {/* Node 2: Order */}
          <div className="trace-node-box" style={{ background: "#1e293b", padding: 12, borderRadius: 8, border: "1px solid #334155" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>2. ORDER</span>
            <strong className="font-mono" style={{ display: "block", fontSize: 12.5, marginTop: 4, color: "#fbbf24" }}>
              {order.orderNumber || `ORD-${id}`}
            </strong>
          </div>

          {/* Node 3: Payment */}
          <div className="trace-node-box" style={{ background: "#1e293b", padding: 12, borderRadius: 8, border: "1px solid #334155" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>3. PAYMENT</span>
            <button
              onClick={() => navigate(`/admin/payments`)}
              className="btn-text-action"
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, marginTop: 4, color: "#38bdf8", fontWeight: 700 }}
            >
              Audit Desk <ExternalLink size={11} />
            </button>
          </div>

          {/* Node 4: Seller */}
          <div className="trace-node-box" style={{ background: "#1e293b", padding: 12, borderRadius: 8, border: "1px solid #334155" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>4. SELLER</span>
            <strong style={{ display: "block", fontSize: 12.5, marginTop: 4, color: "#f8fafc" }}>
              {order.seller?.name || order.sellerName || "—"}
            </strong>
          </div>

          {/* Node 5: Shipment */}
          <div className="trace-node-box" style={{ background: "#1e293b", padding: 12, borderRadius: 8, border: "1px solid #334155" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>5. SHIPMENT</span>
            {shipmentId ? (
              <button
                onClick={() => navigate(`/admin/shipments/${shipmentId}`)}
                className="btn-text-action"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, marginTop: 4, color: "#38bdf8", fontWeight: 700 }}
              >
                {shipmentId} <ExternalLink size={11} />
              </button>
            ) : (
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Awaiting Manifest</span>
            )}
          </div>

          {/* Node 6: Invoice */}
          <div className="trace-node-box" style={{ background: "#1e293b", padding: 12, borderRadius: 8, border: "1px solid #334155" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>6. INVOICE</span>
            <button
              onClick={handlePreviewPdfInvoice}
              className="btn-text-action"
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, marginTop: 4, color: "#38bdf8", fontWeight: 700 }}
            >
              Tax Invoice <ExternalLink size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Buyer & Seller */}
      <div className="order-info-two-col">
        {/* Buyer Details */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <User size={18} />
            <h3>Buyer Information</h3>
          </div>
          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Buyer Name</span>
              <strong className="party-val">{order.buyer?.name || order.buyerName || "—"}</strong>
            </div>
            {order.buyer?.company && (
              <div className="party-row">
                <span className="party-label">Company / Enterprise</span>
                <span className="party-val">{order.buyer.company}</span>
              </div>
            )}
            <div className="party-row">
              <span className="party-label">Email</span>
              <span className="party-val">{order.buyer?.email || "—"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Phone</span>
              <span className="party-val">{order.buyer?.phone || "—"}</span>
            </div>
          </div>
        </div>

        {/* Seller Details */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <Store size={18} />
            <h3>Supplying Merchant / Seller</h3>
          </div>
          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Merchant Name</span>
              <strong className="party-val">{order.seller?.name || order.sellerName || "—"}</strong>
            </div>
            <div className="party-row">
              <span className="party-label">Email</span>
              <span className="party-val">{order.seller?.email || "—"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Phone</span>
              <span className="party-val">{order.seller?.phone || "—"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Settlement Structure</span>
              <span className="party-val font-mono" style={{ color: "#d97706", fontWeight: 700 }}>
                Gross - 10% Fee - 1% TCS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Line Items Table */}
      <div className="content-card order-items-card">
        <div className="card-section-title" style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
          <Package size={18} />
          <h3>Order Line Items</h3>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product Description</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>
                    <strong>{item.product || item.name || "Item"}</strong>
                  </td>
                  <td>
                    <span className="sku-tag font-mono">{item.sku || "—"}</span>
                  </td>
                  <td>
                    <span>{item.quantity}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span className="font-mono">₹{Number(item.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <strong className="font-mono">
                      ₹{Number(item.subtotal || (Number(item.price || 0) * (typeof item.quantity === "number" ? item.quantity : 1))).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment & Financial Reference */}
      <div className="order-info-two-col">
        {/* Payment Reference & Actions (Endpoints #1 & #4) */}
        <div className="content-card order-party-card">
          <div className="card-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CreditCard size={18} />
              <h3>Payment & Gateway Telemetry</h3>
            </div>
            <button
              className="btn-secondary"
              onClick={handleVerifyPaymentStatus}
              disabled={verifyingPayment}
              style={{ padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
              title="Query live payment status via GET /api/payments/order/:orderId/status"
            >
              <RefreshCw size={12} /> {verifyingPayment ? "Checking..." : "Verify Status"}
            </button>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Payment Method</span>
              <span className="party-val">{order.paymentMethod || "UPI (Razorpay Gateway)"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Payment Status</span>
              <span
                className={`status-badge-glow ${
                  currentPaymentStatus === "SUCCESS" || currentPaymentStatus === "CAPTURED" || currentPaymentStatus === "PAID"
                    ? "status-delivered"
                    : currentPaymentStatus === "REFUNDED"
                    ? "status-inactive"
                    : currentPaymentStatus === "FAILED"
                    ? "status-blocked"
                    : "status-pending"
                }`}
              >
                <span className="status-dot"></span>
                {currentPaymentStatus}
              </span>
            </div>
            <div className="party-row">
              <span className="party-label">Order Number Reference</span>
              <span className="party-val font-mono">{order.orderNumber || `ORD-20261003-${id}`}</span>
            </div>

            {orderPaymentTelemetry && (
              <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", marginTop: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Gateway Verification Response</span>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Status: <strong style={{ color: "#059669" }}>{orderPaymentTelemetry.status}</strong> • Amount: <strong className="font-mono">₹{Number(orderPaymentTelemetry.amount || total).toLocaleString("en-IN")}</strong>
                </div>
              </div>
            )}

            {/* Direct Gateway Refund Button */}
            {(currentPaymentStatus === "PAID" || currentPaymentStatus === "CAPTURED" || currentPaymentStatus === "SUCCESS") && (
              <div style={{ marginTop: 14 }}>
                <button
                  className="btn-secondary"
                  style={{ borderColor: "#fecaca", color: "#b91c1c", background: "#fef2f2", width: "100%", justifyContent: "center" }}
                  onClick={handleTriggerRefund}
                  disabled={refunding}
                >
                  <RotateCcw size={14} /> {refunding ? "Processing Gateway Refund..." : "Trigger Gateway Refund (POST /api/payments/order/:orderId/refund)"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Order Financial Summary (READ ONLY) */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <FileText size={18} />
            <h3>Statutory Financial Summary (Read-Only)</h3>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Taxable Subtotal</span>
              <span className="party-val font-mono">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="party-row">
              <span className="party-label">CGST (9%)</span>
              <span className="party-val font-mono">₹{(tax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="party-row">
              <span className="party-label">SGST (9%)</span>
              <span className="party-val font-mono">₹{(tax / 2).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="dropdown-divider" style={{ margin: "10px 0" }}></div>
            <div className="party-row" style={{ fontSize: 16 }}>
              <strong style={{ color: "#0f172a" }}>Grand Total (INR)</strong>
              <strong className="amount-highlight font-mono">₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Order Status Controls */}
      <div className="content-card order-actions-panel">
        <div className="card-section-title" style={{ marginBottom: 14 }}>
          <ShieldCheck size={18} />
          <h3>Permitted Order Status Controls & Cancellation Pipeline</h3>
        </div>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Admin may transition order state only in accordance with fulfillment progression rules. Cancelling an order executes an automated refund pipeline via Razorpay API and claws back seller payouts.
        </p>

        <div className="status-transition-buttons">
          {currentStatus === "PROCESSING" || currentStatus === "PENDING" ? (
            <>
              <button
                className="btn-status-action confirm"
                onClick={() => handleStatusChange("Confirmed")}
                disabled={statusUpdating}
              >
                <CheckCircle2 size={16} /> Mark Confirmed
              </button>
              <button
                className="btn-status-action ship"
                onClick={() => handleStatusChange("Shipped")}
                disabled={statusUpdating}
              >
                <Truck size={16} /> Mark Shipped
              </button>
              <button
                className="btn-status-action cancel"
                onClick={() => setShowCancelModal(true)}
                disabled={statusUpdating}
              >
                <XCircle size={16} /> Cancel Order (Auto-Refund Pipeline)
              </button>
            </>
          ) : currentStatus === "CONFIRMED" ? (
            <>
              <button
                className="btn-status-action ship"
                onClick={() => handleStatusChange("Shipped")}
                disabled={statusUpdating}
              >
                <Truck size={16} /> Mark Shipped / In-Transit
              </button>
              <button
                className="btn-status-action cancel"
                onClick={() => setShowCancelModal(true)}
                disabled={statusUpdating}
              >
                <XCircle size={16} /> Cancel Order (Auto-Refund Pipeline)
              </button>
            </>
          ) : currentStatus === "SHIPPED" ? (
            <button
              className="btn-status-action deliver"
              onClick={() => handleStatusChange("Delivered")}
              disabled={statusUpdating}
            >
              <Package size={16} /> Confirm Delivery Completed
            </button>
          ) : currentStatus === "DELIVERED" ? (
            <span className="order-finalized-tag">
              <CheckCircle2 size={16} /> Order has been successfully delivered and closed.
            </span>
          ) : (
            <span className="order-cancelled-tag">
              <XCircle size={16} /> Order is cancelled. Gateway refund initiated and seller payout reversed.
            </span>
          )}
        </div>
      </div>

      {/* =========================================================================
          ORDER CANCELLATION & AUTO-REFUND PIPELINE MODAL (POST /api/orders/{id}/cancel)
          ========================================================================= */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 620 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
                  <XCircle size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Cancel Order #{id} with Auto-Refund</h2>
                  <p>POST /api/orders/:id/cancel • Triggers internal OrderCancelledEvent</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setShowCancelModal(false)}>×</button>
            </div>

            <form onSubmit={handleConfirmCancelOrder}>
              <div className="luxury-modal-body">
                {/* Warning Banner */}
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: 8, marginBottom: 16 }}>
                  <strong style={{ display: "block", color: "#991b1b", fontSize: 13 }}>
                    Automated Refund & Clawback Pipeline Notice:
                  </strong>
                  <p style={{ color: "#b91c1c", fontSize: 12.5, margin: "4px 0 0 0" }}>
                    Cancelling this order will immediately trigger:
                    <br />1. Razorpay Gateway Refund via PaymentService
                    <br />2. Mark payment status as <strong>REFUNDED</strong>
                    <br />3. Reverse seller payout ledger in <strong>seller_payout_ledgers</strong> with clawback reason.
                  </p>
                </div>

                <div className="luxury-form-grid" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="input-field-wrap">
                    <label>Admin Desk Location</label>
                    <input
                      type="text"
                      value={cancelForm.location}
                      onChange={(e) => setCancelForm({ ...cancelForm, location: e.target.value })}
                      required
                    />
                  </div>

                  <div className="input-field-wrap">
                    <label>Cancellation Reason / Description</label>
                    <textarea
                      rows={3}
                      value={cancelForm.description}
                      onChange={(e) => setCancelForm({ ...cancelForm, description: e.target.value })}
                      required
                      style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>

              <div className="luxury-modal-footer">
                <button
                  type="button"
                  className="btn-luxury-cancel"
                  onClick={() => setShowCancelModal(false)}
                >
                  Close
                </button>

                <button
                  type="submit"
                  className="btn-luxury-submit"
                  disabled={cancelling}
                  style={{ background: "#dc2626" }}
                >
                  <XCircle size={14} /> {cancelling ? "Executing Pipeline..." : "Confirm & Execute Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
