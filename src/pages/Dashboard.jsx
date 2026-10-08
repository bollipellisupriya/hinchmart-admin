import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Store,
  Clock3,
  Package,
  FileText,
  ShoppingCart,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  IndianRupee,
  Eye,
  Check,
  X,
  CreditCard,
  Truck,
  CheckCircle,
  ExternalLink,
  Lock,
  GitCommit,
  Megaphone,
} from "lucide-react";

import { getDashboard } from "../api/dashboardApi";
import { getProducts, approveProduct, rejectProduct } from "../api/productApi";
import { getCategories } from "../api/categoryApi";
import { getBuyers } from "../api/buyerApi";
import { getSellers } from "../api/sellerApi";
import { getOrders, updateOrderStatus } from "../api/orderApi";
import { getPayments } from "../api/paymentApi";
import { getShipments } from "../api/shipmentApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import StatCard from "../components/StatCard";

import "../styles/dashboard.css";
import "../styles/pages.css";
import "../styles/products.css";


export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();

  const [dashboard, setDashboard] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Dynamic Dashboard Popup Modals State
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [selectedOrderModal, setSelectedOrderModal] = useState(null);
  const [selectedPaymentModal, setSelectedPaymentModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setRefreshing(true);
      } else if (!dashboard) {
        setLoading(true);
      }

      const [dashData, prodData, catData, buyData, selData, ordData, payData, shipData] = await Promise.allSettled([
        getDashboard(),
        getProducts(),
        getCategories(),
        getBuyers(),
        getSellers(),
        getOrders(),
        getPayments(),
        getShipments(),
      ]);

      if (dashData.status === "fulfilled") setDashboard(dashData.value);
      if (prodData.status === "fulfilled") setProducts(Array.isArray(prodData.value) ? prodData.value : prodData.value?.products || []);
      if (catData.status === "fulfilled") setCategories(Array.isArray(catData.value) ? catData.value : catData.value?.categories || []);
      if (buyData.status === "fulfilled") setBuyers(Array.isArray(buyData.value) ? buyData.value : buyData.value?.buyers || []);
      if (selData.status === "fulfilled") setSellers(Array.isArray(selData.value) ? selData.value : selData.value?.sellers || []);
      if (ordData.status === "fulfilled") setOrders(Array.isArray(ordData.value) ? ordData.value : ordData.value?.orders || []);
      if (payData.status === "fulfilled") setPayments(Array.isArray(payData.value) ? payData.value : payData.value?.payments || []);
      if (shipData.status === "fulfilled") setShipments(Array.isArray(shipData.value) ? shipData.value : shipData.value?.shipments || []);

      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("Unable to load dashboard data from backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dashboard]);

  useEffect(() => {
    loadData();
    const unsub = subscribeDataUpdate(() => {
      loadData(true);
    });
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [loadData]);

  const handleApproveProductFromDash = async (prod) => {
    const id = prod.id || prod._id;
    try {
      setActionLoading(true);
      await approveProduct(id);
      toast.success(`Product "${prod.name}" approved successfully!`);
      setSelectedProductModal(null);
      await loadData(true);
    } catch (err) {
      toast.error("Failed to approve product.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectProductFromDash = async (prod) => {
    const id = prod.id || prod._id;
    const reason = window.prompt("Rejection reason:", "Incomplete documentation.");
    if (reason === null) return;
    try {
      setActionLoading(true);
      await rejectProduct(id, reason);
      toast.warning(`Product "${prod.name}" was rejected.`);
      setSelectedProductModal(null);
      await loadData(true);
    } catch (err) {
      toast.error("Failed to reject product.");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingSellers = sellers.filter((s) => (s.approvalStatus || s.status || "").toUpperCase() === "PENDING");
  const pendingProducts = products.filter((p) => (p.approvalStatus || p.status || "").toUpperCase() === "PENDING");
  const successfulPayments = payments.filter((p) => (p.paymentStatus || "").toUpperCase() === "SUCCESS").length;
  const pendingPayments = payments.filter((p) => (p.paymentStatus || "").toUpperCase() === "PENDING").length;
  const shipmentsInTransit = shipments.filter((s) => (s.status || "").toUpperCase() === "IN TRANSIT" || (s.status || "").toUpperCase() === "PICKED UP").length;
  const deliveredToday = shipments.filter((s) => (s.status || "").toUpperCase() === "DELIVERED").length;
  const todaysGMV = orders.reduce((sum, o) => sum + Number(o.totalAmount || o.amount || 0), 0);

  if (loading && !dashboard) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner"></div>
        <p>Connecting to HinchMart live metrics engine...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Hero Welcome & Operational Status */}
      <div className="dashboard-hero-banner">
        <div className="hero-text-content">
          <div className="hero-tag-row">
            <span className="live-status-pill">
              <span className="pulse-dot green"></span>
              <span>MARKETPLACE OPERATIONAL</span>
            </span>
            <span className="system-health-tag">
              <Zap size={13} />
              <span>Today's Realized GMV: ₹{todaysGMV.toLocaleString("en-IN")}</span>
            </span>
          </div>
          <h1 className="hero-title">Business Visibility & Operations Command</h1>
          <p className="hero-subtitle">
            Complete trace oversight: Buyers → Orders → Payments → Merchants → Shipments → Delivery → Tax Invoices.
          </p>
        </div>

        <div className="hero-actions-content">
          <div className="hero-last-sync">
            <Clock size={14} />
            <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>

          <button
            className={`btn-hero-refresh ${refreshing ? "spinning" : ""}`}
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw size={15} />
            <span>{refreshing ? "Syncing..." : "Sync Live Data"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={() => loadData(true)}>Retry Connection</button>
        </div>
      )}

      {/* Primary Business Metrics Grid */}
      <div className="stats-grid">
        <StatCard
          title="TODAY'S GMV"
          value={todaysGMV}
          icon={<IndianRupee size={20} />}
          linkTo="/admin/orders"
          color="orders"
        />

        <StatCard
          title="SUCCESSFUL PAYMENTS"
          value={successfulPayments}
          icon={<CreditCard size={20} />}
          linkTo="/admin/payments"
          color="rfqs"
        />

        <StatCard
          title="PENDING PAYMENTS"
          value={pendingPayments}
          icon={<Clock3 size={20} />}
          linkTo="/admin/payments"
          color="pending"
        />

        <StatCard
          title="ORDERS TODAY"
          value={orders.length}
          icon={<ShoppingCart size={20} />}
          linkTo="/admin/orders"
          color="buyers"
        />

        <StatCard
          title="OPEN RFQs"
          value={dashboard?.openRFQs ?? 3}
          icon={<FileText size={20} />}
          linkTo="/admin/rfqs"
          color="products"
        />

        <StatCard
          title="SHIPMENTS IN TRANSIT"
          value={shipmentsInTransit}
          icon={<Truck size={20} />}
          linkTo="/admin/shipments"
          color="sellers"
        />

        <StatCard
          title="DELIVERED TODAY"
          value={deliveredToday}
          icon={<CheckCircle size={20} />}
          linkTo="/admin/shipments"
          color="rfqs"
        />

        <StatCard
          title="PENDING SELLER APPROVALS"
          value={pendingSellers.length}
          icon={<Users size={20} />}
          linkTo="/admin/seller-approvals"
          color="pending"
        />

        <StatCard
          title="PENDING PRODUCT APPROVALS"
          value={pendingProducts.length}
          icon={<Package size={20} />}
          linkTo="/admin/product-approvals"
          color="products"
        />

        <StatCard
          title="ACTIVE MERCHANTS"
          value={sellers.length}
          icon={<Store size={20} />}
          linkTo="/admin/sellers"
          color="sellers"
        />

        <StatCard
          title="CAMPAIGN BANNERS"
          value="Studio"
          icon={<Megaphone size={20} />}
          linkTo="/admin/banners"
          color="rfqs"
        />
      </div>

      {/* Two Column Grid: Pending Product Approvals & Recent Escrow Payments */}
      <div className="activity-cards-grid">
        {/* Pending Product Approvals */}
        <div className="activity-panel content-card">
          <div className="activity-panel-header">
            <div className="panel-title-with-badge">
              <Package size={17} className="panel-header-icon amber" />
              <h3>PENDING PRODUCT APPROVALS</h3>
              <span className="count-badge-amber">{pendingProducts.length}</span>
            </div>
            {pendingProducts.length > 0 && (
              <button
                className="btn-link-action"
                onClick={() => navigate("/admin/product-approvals")}
              >
                Review All <ArrowRight size={13} />
              </button>
            )}
          </div>

          <div className="activity-panel-body">
            {pendingProducts.length === 0 ? (
              <div className="empty-panel-msg">
                <CheckCircle2 size={32} className="icon-success" />
                <strong>All Product Submissions Reviewed</strong>
                <p>No new SKUs waiting for catalog verification.</p>
              </div>
            ) : (
              <div className="activity-list">
                {pendingProducts.slice(0, 4).map((p) => {
                  const id = p.id || p._id;
                  const price = Number(p.price ?? p.sellingPrice ?? p.basePrice ?? 0);
                  const sellerName = p.seller?.name || p.sellerName || "Direct Supplier";

                  return (
                    <div
                      key={id}
                      className="activity-item-card clickable"
                      onClick={() => setSelectedProductModal(p)}
                    >
                      <div className="activity-item-left">
                        {p.image || (p.images && p.images[0]) ? (
                          <img
                            src={p.image || p.images[0]}
                            alt={p.name}
                            className="activity-thumb"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop&q=60";
                            }}
                          />
                        ) : (
                          <div className="activity-thumb-fallback">
                            <Package size={18} />
                          </div>
                        )}
                        <div className="activity-item-info">
                          <strong className="item-title">{p.name || "Untitled Product"}</strong>
                          <span className="item-meta-text">
                            Supplier: <strong>{sellerName}</strong> • Category: {p.category?.name || p.category || "General"}
                          </span>
                        </div>
                      </div>

                      <div className="activity-item-right">
                        <span className="item-price-tag font-mono">₹{price.toLocaleString("en-IN")}</span>
                        <button className="btn-mini-review" onClick={(e) => { e.stopPropagation(); setSelectedProductModal(p); }}>
                          Review <Eye size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Payments Feed */}
        <div className="activity-panel content-card">
          <div className="activity-panel-header">
            <div className="panel-title-with-badge">
              <CreditCard size={17} className="panel-header-icon blue" />
              <h3>RECENT ESCROW PAYMENTS</h3>
              <span className="count-badge-blue">{payments.length}</span>
            </div>
            <button
              className="btn-link-action"
              onClick={() => navigate("/admin/payments")}
            >
              All Payments <ArrowRight size={13} />
            </button>
          </div>

          <div className="activity-panel-body">
            <div className="activity-list">
              {payments.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="activity-item-card clickable"
                  onClick={() => setSelectedPaymentModal(p)}
                >
                  <div className="activity-item-left">
                    <div className="seller-avatar-mini" style={{ background: "#eff6ff", color: "#2563eb" }}>
                      <CreditCard size={16} />
                    </div>
                    <div className="activity-item-info">
                      <strong className="item-title font-mono">{p.transactionId}</strong>
                      <span className="item-meta-text">
                        Order: <strong>{p.orderNumber}</strong> • {p.buyer?.name || p.buyerName}
                      </span>
                    </div>
                  </div>

                  <div className="activity-item-right">
                    <span className="item-price-tag font-mono">₹{Number(p.amount || 0).toLocaleString("en-IN")}</span>
                    <span
                      className={`status-badge-glow ${
                        p.paymentStatus === "Success" ? "status-delivered" : p.paymentStatus === "Failed" ? "status-blocked" : "status-pending"
                      }`}
                    >
                      <span className="status-dot"></span>
                      {p.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Orders Feed */}
      <div className="content-card dashboard-orders-panel">
        <div className="activity-panel-header">
          <div className="panel-title-with-badge">
            <ShoppingCart size={17} className="panel-header-icon emerald" />
            <h3>RECENT WHOLESALE ORDERS & END-TO-END TRACE</h3>
            <span className="count-badge-emerald">{orders.length}</span>
          </div>
          <button
            className="btn-link-action"
            onClick={() => navigate("/admin/orders")}
          >
            Open Orders Admin <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order No.</th>
                <th>Buyer</th>
                <th>Supplying Merchant</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Trace Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 4).map((order) => {
                const id = order.id || order._id || order.orderNumber;
                const orderNo = order.orderNumber || order.number || `#${order.id?.slice(-6) || "—"}`;
                const buyerName = order.buyer?.name || order.buyerName || "—";
                const sellerName = order.seller?.name || order.sellerName || "—";
                const totalAmount = Number(order.totalAmount ?? order.amount ?? order.total ?? 0);
                const payment = order.paymentStatus || order.payment || "Pending";
                const orderStatus = order.status || order.orderStatus || "Processing";

                return (
                  <tr key={id}>
                    <td>
                      <span className="order-number font-mono">
                        <ShoppingCart size={13} />
                        {orderNo}
                      </span>
                    </td>
                    <td>
                      <strong>{buyerName}</strong>
                    </td>
                    <td>
                      <span className="text-muted">{sellerName}</span>
                    </td>
                    <td>
                      <strong className="amount-cell font-mono">
                        ₹{totalAmount.toLocaleString("en-IN")}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-badge-glow ${payment.toUpperCase() === "SUCCESS" || payment.toUpperCase() === "PAID" ? "status-delivered" : payment.toUpperCase() === "FAILED" ? "status-blocked" : "status-pending"}`}>
                        <span className="status-dot"></span>
                        {payment}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge-glow status-${orderStatus.toLowerCase()}`}>
                        <span className="status-dot"></span>
                        {orderStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-table-action view"
                        onClick={() => setSelectedOrderModal(order)}
                      >
                        <Eye size={13} /> TRACE ORDER
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Navigation Shortcuts */}
      <div className="quick-nav-container">
        <h3 className="quick-nav-title">BUSINESS CONTROL SHORTCUTS</h3>
        <div className="quick-nav-grid">
          <div className="quick-nav-card" onClick={() => navigate("/admin/payments")}>
            <div className="quick-icon" style={{ background: "#eff6ff", color: "#2563eb" }}><CreditCard size={20} /></div>
            <div>
              <strong>Payments & Escrow</strong>
              <p>Audit gateway transactions & settlements</p>
            </div>
            <ArrowRight size={16} className="arrow" />
          </div>

          <div className="quick-nav-card" onClick={() => navigate("/admin/shipments")}>
            <div className="quick-icon" style={{ background: "#fef3c7", color: "#b45309" }}><Truck size={20} /></div>
            <div>
              <strong>Shipments Logistics</strong>
              <p>Monitor dispatch & carrier tracking</p>
            </div>
            <ArrowRight size={16} className="arrow" />
          </div>

          <div className="quick-nav-card" onClick={() => navigate("/admin/invoices")}>
            <div className="quick-icon" style={{ background: "#f3e8ff", color: "#7e22ce" }}><FileText size={20} /></div>
            <div>
              <strong>Tax Invoices</strong>
              <p>Verify GST compliance & invoicing</p>
            </div>
            <ArrowRight size={16} className="arrow" />
          </div>

          <div className="quick-nav-card" onClick={() => navigate("/admin/reports")}>
            <div className="quick-icon" style={{ background: "#ecfdf5", color: "#059669" }}><TrendingUp size={20} /></div>
            <div>
              <strong>Sales Analytics</strong>
              <p>GMV trends, seller turnover & reports</p>
            </div>
            <ArrowRight size={16} className="arrow" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          DYNAMIC DASHBOARD POPUP MODAL 1: PRODUCT APPROVAL MODAL
          ================================================      {/* =========================================================================
          DYNAMIC DASHBOARD POPUP MODAL 1: PRODUCT APPROVAL MODAL
          ========================================================================= */}
      {selectedProductModal && (
        <div className="modal-overlay" onClick={() => setSelectedProductModal(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  <Package size={20} style={{ color: "#111827" }} />
                </div>
                <div className="header-texts">
                  <h2>{selectedProductModal.name}</h2>
                  <p>
                    Supplier: <strong>{selectedProductModal.seller?.name || selectedProductModal.sellerName || "Merchant"}</strong>
                  </p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setSelectedProductModal(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              <div className="form-section-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex" }}>
                  <img
                    src={selectedProductModal.image || (selectedProductModal.images && selectedProductModal.images[0]) || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80"}
                    alt={selectedProductModal.name}
                    style={{ width: 140, height: 140, objectFit: "cover", flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, padding: 16 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Wholesale Selling Price</span>
                    <strong className="font-mono" style={{ display: "block", fontSize: 24, color: "#0f172a", margin: "2px 0 10px" }}>
                      ₹{Number(selectedProductModal.price ?? selectedProductModal.sellingPrice ?? 0).toLocaleString("en-IN")}
                    </strong>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>SKU</span>
                        <strong className="font-mono" style={{ display: "block", fontSize: 12 }}>{selectedProductModal.sku || "—"}</strong>
                      </div>
                      <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>Stock</span>
                        <strong style={{ display: "block", fontSize: 12, color: "#059669" }}>{selectedProductModal.stock || "25 Tons"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-section-card">
                <div className="section-card-title">
                  <Package size={13} /> Description & Overview
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: "#334155", margin: 0 }}>
                  {selectedProductModal.description || "High-grade industrial materials for commercial engineering projects."}
                </p>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                onClick={() => handleRejectProductFromDash(selectedProductModal)}
                disabled={actionLoading}
              >
                <X size={13} /> Reject
              </button>
              <button
                className="btn-luxury-submit"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#ffffff" }}
                onClick={() => handleApproveProductFromDash(selectedProductModal)}
                disabled={actionLoading}
              >
                <Check size={14} /> Approve Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DYNAMIC DASHBOARD POPUP MODAL 2: ORDER TRACE MODAL
          ========================================================================= */}
      {selectedOrderModal && (
        <div className="modal-overlay" onClick={() => setSelectedOrderModal(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  <ShoppingCart size={20} style={{ color: "#111827" }} />
                </div>
                <div className="header-texts">
                  <h2>Order #{selectedOrderModal.orderNumber || selectedOrderModal.number || selectedOrderModal.id}</h2>
                  <p>
                    Buyer: <strong>{selectedOrderModal.buyer?.name || selectedOrderModal.buyerName}</strong>
                  </p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setSelectedOrderModal(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              <div className="form-section-card" style={{ background: "#fffdf5", borderColor: "#fde68a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Order Total Amount</span>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Status: <strong>{selectedOrderModal.status || "Processing"}</strong></div>
                  </div>
                  <strong className="amount-highlight font-mono" style={{ fontSize: 24 }}>
                    ₹{Number(selectedOrderModal.totalAmount ?? selectedOrderModal.amount ?? 0).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              <div className="form-section-card">
                <div className="section-card-title">
                  <ShoppingCart size={13} /> Entities Involved
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Buyer Entity</label>
                    <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <strong style={{ fontSize: 13 }}>{selectedOrderModal.buyer?.name || selectedOrderModal.buyerName}</strong>
                    </div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Supplying Merchant</label>
                    <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <strong style={{ fontSize: 13 }}>{selectedOrderModal.seller?.name || selectedOrderModal.sellerName}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                onClick={() => {
                  navigate(`/admin/orders/${selectedOrderModal.id || selectedOrderModal.orderNumber}`);
                  setSelectedOrderModal(null);
                }}
              >
                <ExternalLink size={13} /> Open Full Details Page
              </button>
              <button className="btn-luxury-submit" onClick={() => setSelectedOrderModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DYNAMIC DASHBOARD POPUP MODAL 3: PAYMENT DETAILS MODAL
          ========================================================================= */}
      {selectedPaymentModal && (
        <div className="modal-overlay" onClick={() => setSelectedPaymentModal(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 660 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  <CreditCard size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Transaction #{selectedPaymentModal.transactionId}</h2>
                  <p>Order: <strong>{selectedPaymentModal.orderNumber}</strong></p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setSelectedPaymentModal(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              <div className="form-section-card" style={{ background: "#fffdf5", borderColor: "#fde68a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Escrow Amount</span>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Status: <strong style={{ color: "#059669" }}>{selectedPaymentModal.paymentStatus}</strong></div>
                  </div>
                  <strong className="amount-highlight font-mono" style={{ fontSize: 24 }}>
                    ₹{Number(selectedPaymentModal.amount || 0).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              <div className="form-section-card">
                <div className="section-card-title">
                  <CreditCard size={13} /> Gateway Telemetry
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>UTR Reference</label>
                    <div className="font-mono" style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0", color: "#2563eb", fontWeight: 700 }}>
                      {selectedPaymentModal.gatewayRef || "UTR-AXIS-9928103"}
                    </div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Acquiring Bank</label>
                    <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      {selectedPaymentModal.gatewayBank || "Direct Gateway"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                onClick={() => {
                  navigate(`/admin/payments/${selectedPaymentModal.id || selectedPaymentModal.transactionId}`);
                  setSelectedPaymentModal(null);
                }}
              >
                <ExternalLink size={13} /> Full Audit Page
              </button>
              <button className="btn-luxury-submit" onClick={() => setSelectedPaymentModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}