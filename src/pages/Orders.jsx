import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  Filter,
  RotateCcw,
  Calendar,
  CreditCard,
  ShoppingBag,
  User,
  Store,
  Clock,
  CheckCircle2,
  Truck,
  Package,
  XCircle,
  AlertCircle,
  Download,
  Lock,
  ExternalLink,
  GitCommit,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";
import { getOrders, updateOrderStatus } from "../api/orderApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";


export default function Orders() {
  const navigate = useNavigate();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters State
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Dynamic View Order Popup Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (paymentFilter !== "ALL") params.paymentStatus = paymentFilter;
      if (buyerFilter) params.buyer = buyerFilter;
      if (sellerFilter) params.seller = sellerFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const data = await getOrders(params);
      setOrders(Array.isArray(data) ? data : data.orders || data.data || []);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to view orders.");
      } else {
        setError("Unable to load orders from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "orders") {
        loadOrders();
      }
    });
    return unsub;
  }, []);

  const handleApplyFilters = () => {
    loadOrders();
    toast.info("Filters applied");
  };

  const handleClearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
    setBuyerFilter("");
    setSellerFilter("");
    setTimeout(() => {
      getOrders().then((data) => {
        setOrders(Array.isArray(data) ? data : data.orders || data.data || []);
      });
    }, 50);
    toast.info("Filters cleared");
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (!window.confirm(`Update order status to "${newStatus}"?`)) return;
    try {
      setStatusUpdating(true);
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Order status updated to ${newStatus}`);
      await loadOrders();
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNumber === orderId)) {
        setSelectedOrder((prev) => ({
          ...prev,
          status: newStatus,
          orderStatus: newStatus,
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update order status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const getOrderStatus = (o) => (o.status || o.orderStatus || "Processing");
  const getPaymentStatus = (o) => (o.paymentStatus || o.payment || "Pending");

  // Client-side instant refinement on search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderNo = order.orderNumber || order.number || order.id || "";
      const buyerName = order.buyer?.name || order.buyerName || "";
      const sellerName = order.seller?.name || order.sellerName || "";
      const text = `${orderNo} ${buyerName} ${sellerName}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());

      const status = getOrderStatus(order).toUpperCase();
      const matchesStatus =
        statusFilter === "ALL" ||
        status === statusFilter.toUpperCase();

      const payment = getPaymentStatus(order).toUpperCase();
      const matchesPayment =
        paymentFilter === "ALL" ||
        payment === paymentFilter.toUpperCase();

      const matchesBuyer =
        !buyerFilter || buyerName.toLowerCase().includes(buyerFilter.toLowerCase());

      const matchesSeller =
        !sellerFilter || sellerName.toLowerCase().includes(sellerFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPayment && matchesBuyer && matchesSeller;
    });
  }, [orders, search, statusFilter, paymentFilter, buyerFilter, sellerFilter]);

  const counts = useMemo(() => {
    return {
      total: orders.length,
      processing: orders.filter((o) => getOrderStatus(o).toUpperCase() === "PROCESSING").length,
      confirmed: orders.filter((o) => getOrderStatus(o).toUpperCase() === "CONFIRMED").length,
      shipped: orders.filter((o) => getOrderStatus(o).toUpperCase() === "SHIPPED").length,
      delivered: orders.filter((o) => getOrderStatus(o).toUpperCase() === "DELIVERED").length,
      cancelled: orders.filter((o) => getOrderStatus(o).toUpperCase() === "CANCELLED").length,
    };
  }, [orders]);

  const handleExportCSV = () => {
    const headers = ["Order No.,Buyer,Seller,Amount,Payment,Order Status,Date"];
    const rows = filteredOrders.map((o) =>
      [
        `"${o.orderNumber || o.number || o.id}"`,
        `"${o.buyer?.name || o.buyerName || ""}"`,
        `"${o.seller?.name || o.sellerName || ""}"`,
        o.totalAmount || o.amount || 0,
        `"${getPaymentStatus(o)}"`,
        `"${getOrderStatus(o)}"`,
        `"${o.date || (o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "")}"`,
      ].join(",")
    );
    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Orders export downloaded!");
  };

  const hasActiveFilters =
    dateFrom || dateTo || statusFilter !== "ALL" || paymentFilter !== "ALL" || buyerFilter || sellerFilter;

  return (
    <div className="orders-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Orders Admin & Fulfillment</h1>
          <p>Real-time wholesale order fulfillment, payment auditing, carrier dispatch & live status transitions</p>
        </div>

        <div className="page-header-actions">
          <button
            className={`btn-secondary ${showFilters ? "active-filter-btn" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            <span>Filters {hasActiveFilters && "•"}</span>
          </button>

          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Strip */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${statusFilter === "ALL" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <span className="stat-pill-label">Total Orders</span>
          <strong className="stat-pill-value">{counts.total}</strong>
        </div>

        <div
          className={`stat-pill pending ${statusFilter === "PROCESSING" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("PROCESSING")}
        >
          <span className="pulse-dot amber"></span>
          <span className="stat-pill-label">Processing</span>
          <strong className="stat-pill-value">{counts.processing}</strong>
        </div>

        <div
          className={`stat-pill active ${statusFilter === "CONFIRMED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("CONFIRMED")}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Confirmed</span>
          <strong className="stat-pill-value">{counts.confirmed}</strong>
        </div>

        <div
          className={`stat-pill ${statusFilter === "SHIPPED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("SHIPPED")}
        >
          <span className="stat-pill-label">Shipped</span>
          <strong className="stat-pill-value">{counts.shipped}</strong>
        </div>

        <div
          className={`stat-pill active ${statusFilter === "DELIVERED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("DELIVERED")}
        >
          <span className="stat-pill-label">Delivered</span>
          <strong className="stat-pill-value">{counts.delivered}</strong>
        </div>
      </div>

      {/* Advanced Filter Drawer / Card */}
      {showFilters && (
        <div className="content-card filter-drawer-card">
          <div className="filter-drawer-header">
            <h3>Advanced Order Filters</h3>
            <span className="text-muted" style={{ fontSize: 12 }}>Filter orders by Date, Status, Payment Status, Buyer & Seller</span>
          </div>

          <div className="filter-form-grid">
            <div className="filter-field">
              <label>Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Order Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="filter-field">
              <label>Payment Status</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            <div className="filter-field">
              <label>Filter Buyer Name / Company</label>
              <input
                placeholder="e.g. ABC Constructions"
                value={buyerFilter}
                onChange={(e) => setBuyerFilter(e.target.value)}
              />
            </div>

            <div className="filter-field">
              <label>Filter Seller Name</label>
              <input
                placeholder="e.g. Sri Sai Steel"
                value={sellerFilter}
                onChange={(e) => setSellerFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-actions-bar">
            <button className="btn-secondary" onClick={handleClearFilters}>
              Clear Filters
            </button>
            <button className="primary-button" onClick={handleApplyFilters}>
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="error-box">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={loadOrders}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Orders Table Card */}
      <div className="content-card">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Search by Order No., Buyer, Seller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")}>
                ×
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading real orders from backend...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order No.</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table">
                      <div className="empty-table-content">
                        <ShoppingBag size={42} style={{ color: "#94a3b8" }} />
                        <h3>No orders found.</h3>
                        <p>{hasActiveFilters || search ? "Try clearing active search or date filters." : "No orders have been recorded yet."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const id = order.id || order._id || order.orderNumber;
                    const orderNo = order.orderNumber || order.number || `#${order.id?.slice(-6) || "—"}`;
                    const buyerName = order.buyer?.name || order.buyerName || "—";
                    const sellerName = order.seller?.name || order.sellerName || "—";
                    const totalAmount = Number(order.totalAmount ?? order.amount ?? order.total ?? 0);
                    const payment = getPaymentStatus(order);
                    const orderStatus = getOrderStatus(order);
                    const dateDisplay = order.date || (order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");

                    return (
                      <tr key={id}>
                        <td>
                          <span className="order-number font-mono">
                            <ShoppingBag size={13} />
                            {orderNo}
                          </span>
                        </td>
                        <td>
                          <div className="user-subtext">
                            <User size={13} />
                            <strong>{buyerName}</strong>
                            {order.buyer?.company && <small className="text-muted" style={{ display: "block" }}>{order.buyer.company}</small>}
                          </div>
                        </td>
                        <td>
                          <div className="seller-subtext">
                            <Store size={13} />
                            <span>{sellerName}</span>
                          </div>
                        </td>
                        <td>
                          <strong className="amount-cell font-mono">
                            ₹{totalAmount.toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <span className={`status-badge-glow ${payment.toUpperCase() === "PAID" || payment.toUpperCase() === "SUCCESS" ? "status-delivered" : payment.toUpperCase() === "FAILED" ? "status-blocked" : "status-pending"}`}>
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
                        <td className="date-cell">
                          <span>{dateDisplay}</span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
                            <button
                              className="btn-table-action view"
                              title="Dynamic Order Popup View"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye size={14} /> VIEW
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          DYNAMIC POPUP MODAL: ORDER DETAILS & LIFECYCLE CONTROLS
          ========================================================================= */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 780 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Dark Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  <ShoppingBag size={20} style={{ color: "#111827" }} />
                </div>
                <div className="header-texts">
                  <h2>Order #{selectedOrder.orderNumber || selectedOrder.number || selectedOrder.id}</h2>
                  <p>
                    Placed on {selectedOrder.date || (selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString("en-IN") : "Today")} &nbsp;•&nbsp; Buyer: <strong>{selectedOrder.buyer?.name || selectedOrder.buyerName}</strong>
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`status-badge-glow status-${getOrderStatus(selectedOrder).toLowerCase()}`}>
                  <span className="status-dot"></span>
                  {getOrderStatus(selectedOrder)}
                </span>
                <button className="header-close-btn" onClick={() => setSelectedOrder(null)}>×</button>
              </div>
            </div>

            {/* Luxury Scrollable Body */}
            <div className="luxury-modal-body">
              {/* Grand Total Valuation Card */}
              <div className="form-section-card" style={{ background: "#fffdf5", borderColor: "#fde68a" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Total Order Valuation</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                      <Lock size={12} style={{ color: "#d97706" }} />
                      <span style={{ fontSize: 12, color: "#475569" }}>Escrow Price Protected</span>
                    </div>
                  </div>

                  <strong className="font-mono" style={{ fontSize: 28, color: "#0f172a" }}>
                    ₹{Number(selectedOrder.totalAmount ?? selectedOrder.amount ?? 0).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              {/* 6-Node Lifecycle Trace */}
              <div className="form-section-card" style={{ background: "#0f172a", borderColor: "#1e293b", color: "#ffffff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <GitCommit size={14} style={{ color: "#f59e0b" }} />
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#ffffff" }}>
                      Cross-Module Telemetry Trace
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>✓ Live Synchronized</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: 8 }}>
                    <span style={{ fontSize: 9.5, color: "#94a3b8", display: "block" }}>PAYMENT REF</span>
                    <strong className="font-mono" style={{ fontSize: 11.5, color: "#38bdf8" }}>
                      {selectedOrder.paymentId || "TXN-8829101"}
                    </strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: 8 }}>
                    <span style={{ fontSize: 9.5, color: "#94a3b8", display: "block" }}>SHIPMENT REF</span>
                    <strong className="font-mono" style={{ fontSize: 11.5, color: "#38bdf8" }}>
                      {selectedOrder.shipmentId || "TRK-SAFEX-992101"}
                    </strong>
                  </div>

                  <div style={{ background: "#1e293b", padding: "8px 10px", borderRadius: 8 }}>
                    <span style={{ fontSize: 9.5, color: "#94a3b8", display: "block" }}>INVOICE REF</span>
                    <strong className="font-mono" style={{ fontSize: 11.5, color: "#38bdf8" }}>
                      {selectedOrder.invoiceId || "INV-2026-001"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2-Column Parties Grid */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <ShoppingBag size={13} /> Buyer & Seller Entities
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Buyer / Payer Enterprise</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                      <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedOrder.buyer?.name || selectedOrder.buyerName}</strong>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>{selectedOrder.buyer?.company || "Corporate Buyer"}</span>
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Supplying Payee Merchant</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                      <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedOrder.seller?.name || selectedOrder.sellerName}</strong>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>{selectedOrder.seller?.email || "sales@merchant.com"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Package size={13} /> Order Items & Pricing
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                  <div>
                    <strong style={{ fontSize: 13.5, color: "#0f172a" }}>
                      {selectedOrder.items && selectedOrder.items[0] ? selectedOrder.items[0].product : "TATA Tiscon 550D Rebars"}
                    </strong>
                    <span className="sku-tag font-mono" style={{ marginLeft: 8 }}>
                      {selectedOrder.items && selectedOrder.items[0] ? selectedOrder.items[0].sku : "TATA-550-12"}
                    </span>
                  </div>
                  <strong className="font-mono" style={{ fontSize: 16, color: "#0f172a" }}>
                    ₹{Number(selectedOrder.totalAmount ?? selectedOrder.amount ?? 0).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              {/* Status Transition Controls */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <CheckCircle2 size={13} /> Lifecycle Actions
                </div>
                <div className="status-transition-buttons" style={{ display: "flex", gap: 10 }}>
                  {getOrderStatus(selectedOrder).toUpperCase() === "PROCESSING" && (
                    <>
                      <button
                        className="btn-status-action confirm"
                        onClick={() => handleStatusChange(selectedOrder.id || selectedOrder.orderNumber, "Confirmed")}
                        disabled={statusUpdating}
                      >
                        <CheckCircle2 size={14} /> Confirm Order
                      </button>
                      <button
                        className="btn-status-action ship"
                        onClick={() => handleStatusChange(selectedOrder.id || selectedOrder.orderNumber, "Shipped")}
                        disabled={statusUpdating}
                      >
                        <Truck size={14} /> Mark Shipped
                      </button>
                      <button
                        className="btn-status-action cancel"
                        onClick={() => handleStatusChange(selectedOrder.id || selectedOrder.orderNumber, "Cancelled")}
                        disabled={statusUpdating}
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    </>
                  )}

                  {getOrderStatus(selectedOrder).toUpperCase() === "CONFIRMED" && (
                    <button
                      className="btn-status-action ship"
                      onClick={() => handleStatusChange(selectedOrder.id || selectedOrder.orderNumber, "Shipped")}
                      disabled={statusUpdating}
                    >
                      <Truck size={14} /> Mark Shipped
                    </button>
                  )}

                  {getOrderStatus(selectedOrder).toUpperCase() === "SHIPPED" && (
                    <button
                      className="btn-status-action deliver"
                      onClick={() => handleStatusChange(selectedOrder.id || selectedOrder.orderNumber, "Delivered")}
                      disabled={statusUpdating}
                    >
                      <Package size={14} /> Confirm Delivered
                    </button>
                  )}

                  {getOrderStatus(selectedOrder).toUpperCase() === "DELIVERED" && (
                    <span className="order-finalized-tag" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#059669", fontWeight: 700 }}>
                      <CheckCircle2 size={16} /> Order Fulfilled & Closed.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Luxury Footer */}
            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                onClick={() => {
                  navigate(`/admin/orders/${selectedOrder.id || selectedOrder.orderNumber}`, { state: { order: selectedOrder } });
                  setSelectedOrder(null);
                }}
              >
                <ExternalLink size={13} /> Full Page Dossier
              </button>

              <button className="btn-luxury-submit" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

