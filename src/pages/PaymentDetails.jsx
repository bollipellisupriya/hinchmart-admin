import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Building2,
  Store,
  FileText,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RotateCcw,
  Lock,
  ArrowRight,
  ExternalLink,
  History,
  Check,
  Percent,
} from "lucide-react";
import {
  getPaymentById,
  getPaymentGatewayStatus,
  getCustomerPayments,
  refundOrderPayment,
  computeSellerPayout,
} from "../api/paymentApi";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";

export default function PaymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Gateway Live Verification State
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [gatewayLoading, setGatewayLoading] = useState(false);

  // Customer History Modal State
  const [customerModalData, setCustomerModalData] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);

  // Refund Action State
  const [refunding, setRefunding] = useState(false);

  const loadPayment = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getPaymentById(id);
      if (!data) {
        setError("Payment transaction not found.");
      } else {
        setPayment(data);
      }
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to view this payment.");
      } else {
        setError("Unable to load transaction details from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadPayment();
  }, [id]);

  // Real-time Gateway Verification: GET /api/payments/{paymentId}/status
  const handleVerifyGateway = async () => {
    const gatewayRef = payment?.razorpayPaymentId || payment?.gatewayRef || id;
    try {
      setGatewayLoading(true);
      const res = await getPaymentGatewayStatus(gatewayRef);
      setGatewayStatus(res);
      toast.success("Live gateway status verified with Razorpay API!");
    } catch (err) {
      toast.error("Failed to query live gateway status.");
    } finally {
      setGatewayLoading(false);
    }
  };

  // Customer Payment History: GET /api/payments/customer/{customerId}
  const handleOpenCustomerHistory = async () => {
    const custId = payment?.customerId;
    if (!custId) {
      toast.error("No customer ID associated with this payment.");
      return;
    }
    try {
      setCustomerLoading(true);
      setCustomerModalData({ customerId: custId, records: [] });
      const records = await getCustomerPayments(custId);
      setCustomerModalData({ customerId: custId, records });
    } catch (err) {
      toast.error("Failed to retrieve customer payment history.");
    } finally {
      setCustomerLoading(false);
    }
  };

  // Trigger Order Refund: POST /api/payments/order/{orderId}/refund
  const handleTriggerRefund = async () => {
    if (!payment?.orderId) {
      toast.error("No associated order to refund.");
      return;
    }
    const confirmed = window.confirm(
      `Trigger gateway refund for Order #${payment.orderId} via Razorpay API?\n\nThis will:\n1. Execute Razorpay Gateway Refund\n2. Mark payment status as REFUNDED\n3. Reverse the Seller Payout Ledger entry with clawback.`
    );
    if (!confirmed) return;

    try {
      setRefunding(true);
      const res = await refundOrderPayment(payment.orderId);
      toast.success("Order refund processed successfully via Razorpay API!");
      setPayment((prev) => ({ ...prev, status: "REFUNDED", paymentStatus: "REFUNDED" }));
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to process refund.");
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state-container">
        <div className="spinner"></div>
        <p>Loading transaction telemetry from backend...</p>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="content-card" style={{ padding: 40, textAlign: "center" }}>
        <AlertCircle size={48} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>{error || "Transaction Not Found"}</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          The requested payment transaction ID could not be loaded from the backend.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn-secondary" onClick={() => navigate("/admin/payments")}>
            <ArrowLeft size={16} /> Back to Payments
          </button>
          <button className="primary-button" onClick={loadPayment}>
            <RotateCcw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const status = (payment.status || payment.paymentStatus || "PENDING").toUpperCase();
  const isCaptured = status === "CAPTURED" || status === "SUCCESS" || status === "PAID";
  const isRefunded = status === "REFUNDED";

  // Compute Seller Payout Split Breakdown
  const payoutSplit = computeSellerPayout(payment.amount || 0);

  return (
    <div className="payment-details-container">
      {/* Top Header & Back Button */}
      <div className="review-top-bar">
        <button className="btn-back" onClick={() => navigate("/admin/payments")}>
          <ArrowLeft size={17} /> Back to Payments
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="btn-secondary"
            onClick={handleVerifyGateway}
            disabled={gatewayLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, borderColor: "#93c5fd", color: "#1d4ed8" }}
          >
            <ShieldCheck size={15} />
            {gatewayLoading ? "Verifying..." : "Verify with Razorpay Gateway"}
          </button>

          <button
            className="btn-secondary"
            onClick={handleOpenCustomerHistory}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <History size={15} />
            Customer History
          </button>

          {isCaptured && payment.orderId && (
            <button
              className="primary-button"
              style={{ background: "#dc2626", borderColor: "#dc2626" }}
              onClick={handleTriggerRefund}
              disabled={refunding}
            >
              <RotateCcw size={15} />
              {refunding ? "Processing Refund..." : "Trigger Gateway Refund"}
            </button>
          )}

          <div className="review-header-badge">
            <span
              className={`status-badge-glow ${
                isCaptured
                  ? "status-delivered"
                  : status === "FAILED"
                  ? "status-blocked"
                  : isRefunded
                  ? "status-inactive"
                  : "status-pending"
              }`}
            >
              <span className="status-dot"></span>
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Main Payment Banner */}
      <div className="content-card order-summary-banner">
        <div className="order-summary-header-left">
          <div className="order-number-title">
            <CreditCard size={22} className="text-amber" />
            <h2>Payment Transaction #{payment.paymentId || payment.id}</h2>
          </div>
          <div className="order-meta-row">
            <span>Purpose: <strong>{payment.purpose || "CHECKOUT"}</strong></span>
            <span>•</span>
            <span>Created: <strong>{payment.createdAt ? new Date(payment.createdAt).toLocaleString("en-IN") : "Today"}</strong></span>
            <span>•</span>
            <span className="price-protection-tag">
              <Lock size={12} /> Read-Only Financial Ledger Record
            </span>
          </div>
        </div>

        <div className="order-summary-header-right">
          <span className="total-amount-label">Gross Transaction Amount</span>
          <strong className="total-amount-display font-mono">
            ₹{Number(payment.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* Real-time Gateway Verification Response Banner */}
      {gatewayStatus && (
        <div className="content-card" style={{ background: "#f0fdf4", borderColor: "#86efac", padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "#16a34a", color: "#fff", padding: 8, borderRadius: 8 }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <strong style={{ fontSize: 15, color: "#166534" }}>Live Razorpay Gateway Telemetry Confirmed</strong>
                <div style={{ fontSize: 12.5, color: "#15803d", marginTop: 2 }}>
                  Status: <strong>{gatewayStatus.status}</strong> • Method: {gatewayStatus.paymentMethod} • Bank: {gatewayStatus.bank || "Direct"} • Auth ID: {gatewayStatus.razorpayPaymentId}
                </div>
              </div>
            </div>
            <strong className="font-mono" style={{ fontSize: 18, color: "#166534" }}>
              ₹{Number(gatewayStatus.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </div>
        </div>
      )}

      {/* Linked Order Reference Card */}
      {payment.orderId && (
        <div className="content-card order-party-card" style={{ background: "#fffdf8", borderColor: "#fde68a" }}>
          <div className="card-section-title">
            <ShoppingBag size={18} className="text-amber" />
            <h3>Associated Wholesale Order Details</h3>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Wholesale Order Reference</span>
              <strong className="party-val font-mono" style={{ color: "#2563eb", fontSize: 15 }}>
                {payment.orderNumber}
              </strong>
            </div>
            <div className="party-row">
              <span className="party-label">Order Trace & Fulfillment</span>
              <button
                className="btn-secondary"
                onClick={() => navigate(`/admin/orders/${payment.orderId}`)}
                style={{ padding: "6px 14px", fontSize: 12.5 }}
              >
                <ExternalLink size={14} /> Inspect Full Order & Logistics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Grid: Buyer & Seller Dossiers */}
      <div className="order-info-two-col">
        {/* Buyer Dossier */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <Building2 size={18} />
            <h3>Customer / Payer Dossier</h3>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Customer ID</span>
              <span className="party-val font-mono">#{payment.customerId || "—"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Customer Name</span>
              <strong className="party-val">{payment.customerName || payment.buyer?.name || "—"}</strong>
            </div>
            <div className="party-row">
              <span className="party-label">Phone</span>
              <span className="party-val">{payment.customerPhone || payment.buyer?.phone || "—"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Audit Log</span>
              <button
                className="btn-secondary"
                onClick={handleOpenCustomerHistory}
                style={{ padding: "4px 10px", fontSize: 12 }}
              >
                <History size={12} /> View Complete Audit History
              </button>
            </div>
          </div>
        </div>

        {/* Seller Dossier */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <Store size={18} />
            <h3>Supplying Merchant (Payee)</h3>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Merchant Name</span>
              <strong className="party-val">{payment.sellerName || payment.seller?.name || "—"}</strong>
            </div>
            <div className="party-row">
              <span className="party-label">Settlement Mode</span>
              <span className="party-val">Escrow Direct Bank Disbursement</span>
            </div>
            <div className="party-row">
              <span className="party-label">Commission Model</span>
              <span className="party-val">10% Platform Take Rate + 1% Statutory TCS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seller Payout Settlement Breakdown Card */}
      <div className="content-card order-party-card">
        <div className="card-section-title">
          <Store size={18} style={{ color: "#d97706" }} />
          <h3>Seller Payout Settlement Breakdown (seller_payout_ledgers)</h3>
        </div>

        <div className="party-details-body">
          <div className="party-row">
            <span className="party-label">Gross Order Value</span>
            <span className="party-val font-mono">
              ₹{payoutSplit.grossAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="party-row">
            <span className="party-label">Hinchmart Platform Commission (10%)</span>
            <span className="party-val font-mono" style={{ color: "#9333ea" }}>
              -₹{payoutSplit.platformCommission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="party-row">
            <span className="party-label">Tax Collected at Source (1% TCS)</span>
            <span className="party-val font-mono" style={{ color: "#d97706", fontWeight: 700 }}>
              -₹{payoutSplit.tcsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="dropdown-divider" style={{ margin: "10px 0" }}></div>
          <div className="party-row" style={{ fontSize: 16 }}>
            <strong style={{ color: "#0f172a" }}>Net Seller Payout (Disbursable)</strong>
            <strong className="amount-highlight font-mono" style={{ color: isRefunded ? "#94a3b8" : "#059669", fontSize: 18 }}>
              ₹{payoutSplit.netPayout.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </strong>
          </div>
          <div className="party-row">
            <span className="party-label">Settlement Status</span>
            <span className={`status-badge-glow ${isRefunded ? "status-blocked" : "status-pending"}`}>
              <span className="status-dot"></span>
              {isRefunded ? "REVERSED (Clawed Back)" : "PENDING (Escrow Held)"}
            </span>
          </div>
        </div>
      </div>

      {/* Gateway Telemetry & Technical Audit */}
      <div className="content-card order-party-card">
        <div className="card-section-title">
          <ShieldCheck size={18} />
          <h3>Payment Gateway Telemetry & Technical Audit</h3>
        </div>

        <div className="party-details-body">
          <div className="party-row">
            <span className="party-label">Razorpay Payment ID</span>
            <strong className="party-val font-mono" style={{ color: "#2563eb" }}>
              {payment.razorpayPaymentId || "—"}
            </strong>
          </div>
          <div className="party-row">
            <span className="party-label">Razorpay Order ID</span>
            <span className="party-val font-mono">
              {payment.razorpayOrderId || "—"}
            </span>
          </div>
          <div className="party-row">
            <span className="party-label">Payment Method</span>
            <strong className="party-val">{payment.paymentMethod || payment.method || "—"}</strong>
          </div>
          {payment.vpa && (
            <div className="party-row">
              <span className="party-label">UPI Virtual Payment Address (VPA)</span>
              <span className="party-val font-mono">{payment.vpa}</span>
            </div>
          )}
          {payment.cardLast4 && (
            <div className="party-row">
              <span className="party-label">Card Network & Last 4</span>
              <span className="party-val font-mono">{payment.cardNetwork} •••• {payment.cardLast4}</span>
            </div>
          )}
          {payment.bank && (
            <div className="party-row">
              <span className="party-label">Issuing / Acquiring Bank</span>
              <span className="party-val">{payment.bank}</span>
            </div>
          )}
          {payment.errorDescription && (
            <div className="party-row" style={{ background: "#fef2f2", padding: "8px 12px", borderRadius: 8 }}>
              <span className="party-label" style={{ color: "#991b1b" }}>Gateway Status Note</span>
              <span className="party-val" style={{ color: "#b91c1c", fontWeight: 600 }}>{payment.errorDescription}</span>
            </div>
          )}
        </div>
      </div>

      {/* Customer Financial History Modal */}
      {customerModalData && (
        <div className="modal-overlay" onClick={() => setCustomerModalData(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 840 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                  <History size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Financial Audit Log: Customer #{customerModalData.customerId}</h2>
                  <p>GET /api/payments/customer/:customerId</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setCustomerModalData(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              {customerLoading ? (
                <div className="loading-state-container" style={{ padding: "40px 0" }}>
                  <div className="spinner"></div>
                  <p>Retrieving customer audit records...</p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 380, overflowY: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Payment ID</th>
                        <th>Order Number</th>
                        <th>Purpose</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerModalData.records?.map((rec) => (
                        <tr key={rec.paymentId || rec.id}>
                          <td><strong className="font-mono">#{rec.paymentId || rec.id}</strong></td>
                          <td>
                            {rec.orderNumber ? (
                              <span className="font-mono" style={{ color: "#2563eb", fontWeight: 700 }}>
                                {rec.orderNumber}
                              </span>
                            ) : "—"}
                          </td>
                          <td>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#f1f5f9" }}>
                              {rec.purpose || "CHECKOUT"}
                            </span>
                          </td>
                          <td>
                            <strong className="font-mono">
                              ₹{Number(rec.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td>{rec.paymentMethod || rec.method || "UPI"}</td>
                          <td>
                            <span className="status-badge-glow status-delivered">
                              <span className="status-dot"></span>
                              {rec.status || rec.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="luxury-modal-footer">
              <button className="btn-luxury-submit" onClick={() => setCustomerModalData(null)}>
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
