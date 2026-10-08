import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Search,
  Eye,
  Filter,
  RotateCcw,
  Download,
  IndianRupee,
  Building2,
  Store,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Lock,
  ExternalLink,
  Wallet,
  RefreshCw,
  User,
  History,
  FileText,
  Percent,
  Check,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  getPayments,
  getPaymentGatewayStatus,
  getCustomerPayments,
  refundOrderPayment,
  getSellerPayoutLedgers,
  reverseSellerPayout,
  disburseSellerPayout,
} from "../api/paymentApi";
import { topupCustomerWallet } from "../api/walletApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";

export default function Payments() {
  const navigate = useNavigate();
  const toast = useToast();

  // Active Main Tab: "transactions" vs "settlements"
  const [activeTab, setActiveTab] = useState("transactions");

  // Transactions State
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Seller Payout Ledgers State
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modals State
  const [selectedPayment, setSelectedPayment] = useState(null);
  
  // Real-time Gateway Lookup Modal
  const [gatewayModalData, setGatewayModalData] = useState(null);
  const [gatewayModalLoading, setGatewayModalLoading] = useState(false);

  // Customer Financial History Modal
  const [customerModalData, setCustomerModalData] = useState(null);
  const [customerModalLoading, setCustomerModalLoading] = useState(false);

  // Wallet Topup Modal
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletForm, setWalletForm] = useState({
    amount: "",
    description: "",
    customerId: "",
    customerName: "",
  });
  const [walletSubmitting, setWalletSubmitting] = useState(false);

  // Refund Action State
  const [refundingOrderId, setRefundingOrderId] = useState(null);

  // Load Transactions
  const loadPayments = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (methodFilter !== "ALL") params.method = methodFilter;
      if (buyerFilter) params.buyer = buyerFilter;
      if (sellerFilter) params.seller = sellerFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const data = await getPayments(params);
      setPayments(Array.isArray(data) ? data : data.payments || data.data || []);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to view payment transactions.");
      } else {
        setError("Unable to load payments from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Load Seller Payouts
  const loadPayouts = async () => {
    try {
      setPayoutsLoading(true);
      const data = await getSellerPayoutLedgers();
      setPayouts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Payouts load error:", err);
    } finally {
      setPayoutsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    loadPayouts();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "payments" || detail.entity === "orders" || detail.entity === "payouts") {
        loadPayments(false);
        loadPayouts();
      }
    });
    return unsub;
  }, []);

  const handleApplyFilters = () => {
    loadPayments();
    toast.info("Payment filters applied");
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setMethodFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setBuyerFilter("");
    setSellerFilter("");
    setTimeout(() => {
      getPayments().then((data) => {
        setPayments(Array.isArray(data) ? data : data.payments || data.data || []);
      });
    }, 50);
    toast.info("Payment filters cleared");
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      const q = search.toLowerCase();
      const text = `${item.transactionId || item.id || ""} ${item.orderNumber || ""} ${item.customerName || item.buyer?.name || item.buyerName || ""} ${item.seller?.name || item.sellerName || ""} ${item.paymentMethod || item.method || ""} ${item.razorpayPaymentId || item.gatewayRef || ""}`.toLowerCase();
      const matchesSearch = text.includes(q);

      const status = (item.status || item.paymentStatus || "").toUpperCase();
      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const method = (item.paymentMethod || item.method || "").toLowerCase();
      const matchesMethod =
        methodFilter === "ALL" || method.includes(methodFilter.toLowerCase());

      const buyerName = (item.customerName || item.buyer?.name || item.buyerName || "").toLowerCase();
      const matchesBuyer = !buyerFilter || buyerName.includes(buyerFilter.toLowerCase());

      const sellerName = (item.seller?.name || item.sellerName || "").toLowerCase();
      const matchesSeller = !sellerFilter || sellerName.includes(sellerFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesMethod && matchesBuyer && matchesSeller;
    });
  }, [payments, search, statusFilter, methodFilter, buyerFilter, sellerFilter]);

  const counts = useMemo(() => {
    return {
      total: payments.length,
      success: payments.filter((p) => {
        const s = (p.status || p.paymentStatus || "").toUpperCase();
        return s === "SUCCESS" || s === "CAPTURED" || s === "PAID";
      }).length,
      pending: payments.filter((p) => (p.status || p.paymentStatus || "").toUpperCase() === "PENDING").length,
      failed: payments.filter((p) => (p.status || p.paymentStatus || "").toUpperCase() === "FAILED").length,
      refunded: payments.filter((p) => (p.status || p.paymentStatus || "").toUpperCase() === "REFUNDED").length,
    };
  }, [payments]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["Payment ID,Order No,Customer,Seller,Amount,Purpose,Method,Razorpay ID,Status,Date"];
    const rows = filteredPayments.map((p) =>
      [
        `"${p.paymentId || p.id}"`,
        `"${p.orderNumber || "—"}"`,
        `"${p.customerName || p.buyer?.name || ""}"`,
        `"${p.seller?.name || p.sellerName || "—"}"`,
        p.amount || 0,
        `"${p.purpose || "CHECKOUT"}"`,
        `"${p.paymentMethod || p.method || ""}"`,
        `"${p.razorpayPaymentId || "—"}"`,
        `"${p.status || p.paymentStatus || ""}"`,
        `"${p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "Today"}"`,
      ].join(",")
    );
    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_payments_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Payments records exported to CSV!");
  };

  // 1. Trigger Order Refund Action
  const handleTriggerRefund = async (orderId, paymentId) => {
    if (!orderId) {
      toast.error("No linked Order ID found for this transaction to refund.");
      return;
    }
    const confirmed = window.confirm(
      `Trigger gateway refund for Order #${orderId} via Razorpay API?\n\nThis will:\n1. Execute Razorpay Gateway Refund\n2. Mark payment status as REFUNDED\n3. Reverse the Seller Payout Ledger entry with clawback.`
    );
    if (!confirmed) return;

    try {
      setRefundingOrderId(orderId);
      const res = await refundOrderPayment(orderId);
      toast.success(`Refund processed successfully for Order #${orderId}`);
      if (selectedPayment && (selectedPayment.orderId === orderId || selectedPayment.paymentId === paymentId)) {
        setSelectedPayment({ ...selectedPayment, status: "REFUNDED", paymentStatus: "REFUNDED" });
      }
      await loadPayments(false);
      await loadPayouts();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to trigger order refund.");
    } finally {
      setRefundingOrderId(null);
    }
  };

  // 3. Real-Time Gateway Lookup Action
  const handleOpenGatewayStatus = async (paymentRef) => {
    if (!paymentRef) {
      toast.error("No Razorpay Payment ID or Gateway Reference available.");
      return;
    }
    try {
      setGatewayModalLoading(true);
      setGatewayModalData(null);
      const res = await getPaymentGatewayStatus(paymentRef);
      setGatewayModalData(res);
    } catch (err) {
      toast.error("Could not fetch real-time gateway status.");
    } finally {
      setGatewayModalLoading(false);
    }
  };

  // 2. Customer Financial History Action
  const handleOpenCustomerHistory = async (customerId, customerName) => {
    if (!customerId) {
      toast.error("Customer ID not specified.");
      return;
    }
    try {
      setCustomerModalLoading(true);
      setCustomerModalData({ customerId, customerName, records: [] });
      const records = await getCustomerPayments(customerId);
      setCustomerModalData({ customerId, customerName, records });
    } catch (err) {
      toast.error("Failed to load customer payment history.");
    } finally {
      setCustomerModalLoading(false);
    }
  };

  // 5. Admin Manual Wallet Credit Action
  const handleWalletTopupSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(walletForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid positive top-up amount.");
      return;
    }
    try {
      setWalletSubmitting(true);
      const res = await topupCustomerWallet({
        amount: amt,
        description: walletForm.description,
        customerId: walletForm.customerId,
      });
      toast.success(
        `Wallet credited with ₹${amt.toLocaleString("en-IN")}! New Balance: ₹${(res.balance || 0).toLocaleString("en-IN")}`
      );
      setShowWalletModal(false);
      await loadPayments(false);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to top up wallet.");
    } finally {
      setWalletSubmitting(false);
    }
  };

  // Seller Payout Disburse Action
  const handleDisbursePayout = (payoutId) => {
    if (!window.confirm("Confirm disbursement of net seller payout to registered merchant bank account?")) return;
    disburseSellerPayout(payoutId);
    toast.success(`Seller Payout #${payoutId} marked as PAID & disbursed!`);
    loadPayouts();
  };

  // Seller Payout Clawback Action
  const handleReversePayout = (orderId) => {
    const reason = window.prompt("Enter clawback / reversal reason:", "Admin cancellation / Order refund");
    if (!reason) return;
    reverseSellerPayout(orderId, reason);
    toast.warning(`Seller Payout for Order #${orderId} has been REVERSED with clawback.`);
    loadPayouts();
  };

  const hasActiveFilters =
    statusFilter !== "ALL" || methodFilter !== "ALL" || dateFrom || dateTo || buyerFilter || sellerFilter;

  // Compute Payout totals
  const payoutTotals = useMemo(() => {
    return payouts.reduce(
      (acc, p) => {
        acc.gross += p.grossAmount || 0;
        acc.platformFee += p.platformCommission || 0;
        acc.tcs += p.tcsAmount || 0;
        acc.net += p.netPayout || 0;
        if (p.status === "PENDING") acc.pendingCount += 1;
        if (p.status === "REVERSED") acc.reversedCount += 1;
        if (p.status === "PAID") acc.paidCount += 1;
        return acc;
      },
      { gross: 0, platformFee: 0, tcs: 0, net: 0, pendingCount: 0, reversedCount: 0, paidCount: 0 }
    );
  }, [payouts]);

  return (
    <div className="payments-page">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1>Payments & Settlements Desk</h1>
          <p>
            Audit Razorpay gateway telemetry, trigger refunds, inspect customer histories & track 1% TCS seller payouts
          </p>
        </div>

        <div className="page-header-actions">
          {/* Admin Wallet Credit Button */}
          <button
            className="primary-button"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", borderColor: "#059669" }}
            onClick={() => setShowWalletModal(true)}
          >
            <Wallet size={16} />
            <span>Manual Wallet Credit</span>
          </button>

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

      {/* Main Tabs Strip: Transactions Audit vs Seller Payout Settlements */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          className={`stat-pill ${activeTab === "transactions" ? "active-pill" : ""}`}
          style={{ cursor: "pointer", padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}
          onClick={() => setActiveTab("transactions")}
        >
          <CreditCard size={17} />
          <strong>Payment Transactions & Telemetry</strong>
          <span style={{ background: "#e2e8f0", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
            {payments.length}
          </span>
        </button>

        <button
          className={`stat-pill ${activeTab === "settlements" ? "active-pill" : ""}`}
          style={{ cursor: "pointer", padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}
          onClick={() => setActiveTab("settlements")}
        >
          <Store size={17} />
          <strong>Seller Payout Settlements & TCS Ledger</strong>
          <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
            {payouts.length}
          </span>
        </button>
      </div>

      {activeTab === "transactions" && (
        <>
          {/* Status Filter Tabs Strip */}
          <div className="header-stats-strip">
            <div
              className={`stat-pill ${statusFilter === "ALL" ? "active-pill" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              <span className="stat-pill-label">All Transactions</span>
              <strong className="stat-pill-value">{counts.total}</strong>
            </div>

            <div
              className={`stat-pill active ${statusFilter === "SUCCESS" || statusFilter === "CAPTURED" ? "active-pill" : ""}`}
              onClick={() => setStatusFilter("CAPTURED")}
            >
              <span className="pulse-dot green"></span>
              <span className="stat-pill-label">Captured / Success</span>
              <strong className="stat-pill-value">{counts.success}</strong>
            </div>

            <div
              className={`stat-pill pending ${statusFilter === "PENDING" ? "active-pill" : ""}`}
              onClick={() => setStatusFilter("PENDING")}
            >
              <span className="pulse-dot amber"></span>
              <span className="stat-pill-label">Pending</span>
              <strong className="stat-pill-value">{counts.pending}</strong>
            </div>

            <div
              className={`stat-pill blocked ${statusFilter === "FAILED" ? "active-pill" : ""}`}
              onClick={() => setStatusFilter("FAILED")}
            >
              <span className="pulse-dot red"></span>
              <span className="stat-pill-label">Failed</span>
              <strong className="stat-pill-value">{counts.failed}</strong>
            </div>

            <div
              className={`stat-pill inactive ${statusFilter === "REFUNDED" ? "active-pill" : ""}`}
              onClick={() => setStatusFilter("REFUNDED")}
            >
              <span className="stat-pill-label">Refunded</span>
              <strong className="stat-pill-value">{counts.refunded}</strong>
            </div>
          </div>

          {/* Advanced Filter Drawer */}
          {showFilters && (
            <div className="content-card filter-drawer-card">
              <div className="filter-drawer-header">
                <h3>Advanced Payment Filters</h3>
                <span className="text-muted" style={{ fontSize: 12 }}>Filter transactions by Gateway Status, Method, Date Range & Parties</span>
              </div>

              <div className="filter-grid-layout">
                <div className="filter-field">
                  <label>Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Statuses</option>
                    <option value="CAPTURED">Captured / Success</option>
                    <option value="PENDING">Pending Authorization</option>
                    <option value="FAILED">Failed / Rejected</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>

                <div className="filter-field">
                  <label>Payment Method</label>
                  <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                    <option value="ALL">All Methods</option>
                    <option value="UPI">UPI (VPA)</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="NETBANKING">Net Banking</option>
                    <option value="WALLET">Wallet Store Credit</option>
                  </select>
                </div>

                <div className="filter-field">
                  <label>Buyer Entity</label>
                  <input
                    type="text"
                    placeholder="Search by buyer..."
                    value={buyerFilter}
                    onChange={(e) => setBuyerFilter(e.target.value)}
                  />
                </div>

                <div className="filter-field">
                  <label>Merchant Payee</label>
                  <input
                    type="text"
                    placeholder="Search by seller..."
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                  />
                </div>

                <div className="filter-field">
                  <label>From Date</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>

                <div className="filter-field">
                  <label>To Date</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>

              <div className="filter-actions-bar">
                <button className="btn-secondary" onClick={handleClearFilters}>
                  <RotateCcw size={14} /> Clear All
                </button>
                <button className="primary-button" onClick={handleApplyFilters}>
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Transactions Table Card */}
          <div className="content-card">
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by Payment ID, Order No, Customer, Razorpay ID, UPI VPA, Bank..."
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
                <p>Loading payment transactions from backend...</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Payment & Gateway ID</th>
                      <th>Order No</th>
                      <th>Customer / Payer</th>
                      <th>Purpose</th>
                      <th>Method & Telemetry</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="empty-table">
                          <div className="empty-table-content">
                            <CreditCard size={42} style={{ color: "#94a3b8" }} />
                            <h3>No payment transactions found.</h3>
                            <p>{hasActiveFilters || search ? "Try clearing search or filter parameters." : "No transactions recorded yet."}</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => {
                        const id = p.paymentId || p.id;
                        const status = (p.status || p.paymentStatus || "PENDING").toUpperCase();
                        const isCaptured = status === "CAPTURED" || status === "SUCCESS" || status === "PAID";
                        const isRefunded = status === "REFUNDED";

                        return (
                          <tr key={id}>
                            <td>
                              <div>
                                <span className="order-number font-mono" style={{ fontWeight: 700 }}>
                                  #{id}
                                </span>
                                <div
                                  className="font-mono"
                                  style={{
                                    fontSize: 11,
                                    color: "#2563eb",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    marginTop: 2,
                                    cursor: "pointer",
                                  }}
                                  onClick={() => handleOpenGatewayStatus(p.razorpayPaymentId || id)}
                                  title="Click to perform real-time Razorpay Gateway lookup"
                                >
                                  <ShieldCheck size={11} />
                                  {p.razorpayPaymentId || "pay_gateway_id"}
                                </div>
                              </div>
                            </td>
                            <td>
                              {p.orderId ? (
                                <span
                                  className="font-mono text-link"
                                  onClick={() => navigate(`/admin/orders/${p.orderId}`)}
                                  title="Inspect Wholesale Order"
                                  style={{ cursor: "pointer", color: "#2563eb", fontWeight: 700 }}
                                >
                                  {p.orderNumber}
                                </span>
                              ) : (
                                <span className="text-muted" style={{ fontSize: 12 }}>Direct / Wallet</span>
                              )}
                            </td>
                            <td>
                              <div>
                                <strong
                                  style={{ display: "block", fontSize: 13, color: "#0f172a", cursor: "pointer" }}
                                  onClick={() => handleOpenCustomerHistory(p.customerId, p.customerName || p.buyer?.name)}
                                  title="Click to view complete customer financial history"
                                >
                                  {p.customerName || p.buyer?.name || "Enterprise Customer"}
                                </strong>
                                <span style={{ fontSize: 11, color: "#64748b" }}>
                                  ID #{p.customerId || 10} • {p.customerPhone || p.buyer?.phone || "—"}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  background: p.purpose === "WALLET_TOPUP" ? "#eff6ff" : "#f8fafc",
                                  color: p.purpose === "WALLET_TOPUP" ? "#1d4ed8" : "#475569",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                {p.purpose || (p.orderId ? "CHECKOUT" : "WALLET_TOPUP")}
                              </span>
                            </td>
                            <td>
                              <div>
                                <span className="category-pill-tag" style={{ fontWeight: 700 }}>
                                  {p.paymentMethod || p.method || "UPI"}
                                </span>
                                {p.vpa && (
                                  <span className="font-mono" style={{ display: "block", fontSize: 10.5, color: "#475569", marginTop: 2 }}>
                                    {p.vpa}
                                  </span>
                                )}
                                {p.cardLast4 && (
                                  <span className="font-mono" style={{ display: "block", fontSize: 10.5, color: "#475569", marginTop: 2 }}>
                                    {p.cardNetwork || "CARD"} •••• {p.cardLast4}
                                  </span>
                                )}
                                {p.bank && !p.vpa && !p.cardLast4 && (
                                  <span style={{ display: "block", fontSize: 10.5, color: "#475569", marginTop: 2 }}>
                                    {p.bank}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <strong className="amount-cell font-mono" style={{ fontSize: 14 }}>
                                ₹{Number(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </strong>
                            </td>
                            <td>
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
                                {p.status || p.paymentStatus || "PENDING"}
                              </span>
                            </td>
                            <td className="date-cell">
                              <span>
                                {p.createdAt
                                  ? new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                                  : "Today"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                                <button
                                  className="btn-table-action view"
                                  onClick={() => setSelectedPayment(p)}
                                  title="View Full Payment Telemetry"
                                >
                                  <Eye size={13} /> View
                                </button>

                                <button
                                  className="btn-table-action"
                                  style={{ borderColor: "#bfdbfe", color: "#1d4ed8", background: "#eff6ff" }}
                                  onClick={() => handleOpenGatewayStatus(p.razorpayPaymentId || id)}
                                  title="Real-Time Gateway Status Check"
                                >
                                  <ShieldCheck size={13} /> Gateway
                                </button>

                                {isCaptured && p.orderId && (
                                  <button
                                    className="btn-table-action"
                                    style={{ borderColor: "#fecaca", color: "#b91c1c", background: "#fef2f2" }}
                                    onClick={() => handleTriggerRefund(p.orderId, id)}
                                    disabled={refundingOrderId === p.orderId}
                                    title="Trigger Razorpay Gateway Refund"
                                  >
                                    <RotateCcw size={13} /> {refundingOrderId === p.orderId ? "Refunding..." : "Refund"}
                                  </button>
                                )}
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
        </>
      )}

      {/* =========================================================================
          TAB 2: SELLER PAYOUT SETTLEMENT & CLAWBACKS (TCS & COMMISSIONS)
          ========================================================================= */}
      {activeTab === "settlements" && (
        <>
          {/* Formula Callout Banner */}
          <div className="content-card" style={{ background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "#ffffff", padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Automated Seller Settlement Engine
                </span>
                <h2 style={{ fontSize: 20, color: "#ffffff", margin: "4px 0 8px 0" }}>
                  Net Seller Payout = Gross Amount − 10% Platform Fee − 1% TCS
                </h2>
                <p style={{ fontSize: 13, color: "#94a3b8", maxWidth: 650, margin: 0 }}>
                  Funds remain in <strong>PENDING</strong> escrow held until delivery confirmation. Upon order cancellation or gateway refund, payout ledgers are automatically marked <strong>REVERSED</strong> with a clawback audit reason.
                </p>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Gross Value</div>
                  <strong className="font-mono" style={{ fontSize: 18, color: "#38bdf8" }}>
                    ₹{payoutTotals.gross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>1% Statutory TCS</div>
                  <strong className="font-mono" style={{ fontSize: 18, color: "#fbbf24" }}>
                    ₹{payoutTotals.tcs.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Net Seller Payouts</div>
                  <strong className="font-mono" style={{ fontSize: 18, color: "#34d399" }}>
                    ₹{payoutTotals.net.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Ledgers Table */}
          <div className="content-card">
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Store size={18} style={{ color: "#d97706" }} />
                <h3 style={{ margin: 0, fontSize: 16 }}>Seller Payout Ledgers (seller_payout_ledgers)</h3>
              </div>
              <button className="btn-secondary" onClick={loadPayouts}>
                <RefreshCw size={14} /> Refresh Ledgers
              </button>
            </div>

            {payoutsLoading ? (
              <div className="loading-state-container">
                <div className="spinner"></div>
                <p>Loading seller payout ledgers...</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Payout ID</th>
                      <th>Order No</th>
                      <th>Merchant / Payee</th>
                      <th>Gross Amount</th>
                      <th>Platform Fee (10%)</th>
                      <th>1% TCS (Statutory)</th>
                      <th>Net Seller Payout</th>
                      <th>Status</th>
                      <th>Clawback / Audit Notes</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="empty-table">
                          <div className="empty-table-content">
                            <Store size={42} style={{ color: "#94a3b8" }} />
                            <h3>No seller payout ledgers recorded yet.</h3>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      payouts.map((row) => (
                        <tr key={row.payoutId}>
                          <td>
                            <strong className="font-mono">#{row.payoutId}</strong>
                          </td>
                          <td>
                            <span
                              className="font-mono text-link"
                              onClick={() => navigate(`/admin/orders/${row.orderId}`)}
                              style={{ color: "#2563eb", fontWeight: 700, cursor: "pointer" }}
                            >
                              {row.orderNumber}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{row.sellerName}</div>
                            <span style={{ fontSize: 11, color: "#64748b" }}>Seller ID #{row.sellerId}</span>
                          </td>
                          <td>
                            <span className="font-mono" style={{ fontSize: 13 }}>
                              ₹{Number(row.grossAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono" style={{ color: "#9333ea", fontSize: 13 }}>
                              -₹{Number(row.platformCommission || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono" style={{ color: "#d97706", fontSize: 13, fontWeight: 700 }}>
                              -₹{Number(row.tcsAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td>
                            <strong className="amount-cell font-mono" style={{ color: row.status === "REVERSED" ? "#94a3b8" : "#059669", fontSize: 14 }}>
                              ₹{Number(row.netPayout || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </strong>
                          </td>
                          <td>
                            <span
                              className={`status-badge-glow ${
                                row.status === "PAID"
                                  ? "status-delivered"
                                  : row.status === "REVERSED"
                                  ? "status-blocked"
                                  : "status-pending"
                              }`}
                            >
                              <span className="status-dot"></span>
                              {row.status}
                            </span>
                          </td>
                          <td>
                            {row.clawbackReason ? (
                              <span style={{ fontSize: 11.5, color: "#ef4444", fontWeight: 600, background: "#fef2f2", padding: "3px 8px", borderRadius: 6 }}>
                                {row.clawbackReason}
                              </span>
                            ) : (
                              <span style={{ fontSize: 11.5, color: "#64748b" }}>
                                {row.status === "PENDING" ? "Held in escrow pending delivery" : "Settled to merchant bank"}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                              {row.status === "PENDING" && (
                                <>
                                  <button
                                    className="btn-table-action"
                                    style={{ borderColor: "#bbf7d0", color: "#15803d", background: "#f0fdf4" }}
                                    onClick={() => handleDisbursePayout(row.payoutId)}
                                    title="Disburse to seller registered bank account"
                                  >
                                    <Check size={12} /> Disburse
                                  </button>
                                  <button
                                    className="btn-table-action"
                                    style={{ borderColor: "#fecaca", color: "#b91c1c", background: "#fef2f2" }}
                                    onClick={() => handleReversePayout(row.orderId)}
                                    title="Claw back / Reverse payout"
                                  >
                                    <RotateCcw size={12} /> Claw Back
                                  </button>
                                </>
                              )}
                              {row.status === "PAID" && (
                                <span style={{ fontSize: 11, color: "#059669", fontWeight: 700 }}>✓ Disbursed</span>
                              )}
                              {row.status === "REVERSED" && (
                                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>✕ Clawed Back</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* =========================================================================
          DYNAMIC POPUP MODAL: PAYMENT TRANSACTION DETAILS
          ========================================================================= */}
      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 740 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  <CreditCard size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Payment Audit Record #{selectedPayment.paymentId || selectedPayment.id}</h2>
                  <p>
                    Purpose: <strong>{selectedPayment.purpose || "CHECKOUT"}</strong> &nbsp;•&nbsp; Gateway: {selectedPayment.bank || "Razorpay Banking"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className={`status-badge-glow ${
                    (selectedPayment.status || selectedPayment.paymentStatus || "").toUpperCase() === "CAPTURED" ||
                    (selectedPayment.status || selectedPayment.paymentStatus || "").toUpperCase() === "SUCCESS"
                      ? "status-delivered"
                      : (selectedPayment.status || selectedPayment.paymentStatus || "").toUpperCase() === "REFUNDED"
                      ? "status-inactive"
                      : (selectedPayment.status || selectedPayment.paymentStatus || "").toUpperCase() === "FAILED"
                      ? "status-blocked"
                      : "status-pending"
                  }`}
                >
                  <span className="status-dot"></span>
                  {selectedPayment.status || selectedPayment.paymentStatus || "PENDING"}
                </span>
                <button className="header-close-btn" onClick={() => setSelectedPayment(null)}>×</button>
              </div>
            </div>

            <div className="luxury-modal-body">
              {/* Settlement Amount Banner */}
              <div className="form-section-card" style={{ background: "#fffdf5", borderColor: "#fde68a" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Escrow Settlement Value</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                      <Lock size={12} style={{ color: "#d97706" }} />
                      <span style={{ fontSize: 12, color: "#475569" }}>Financial Record Protected</span>
                    </div>
                  </div>

                  <strong className="amount-highlight font-mono" style={{ fontSize: 28, color: "#0f172a" }}>
                    ₹{Number(selectedPayment.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* 2-Column Parties Grid */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <CreditCard size={13} /> Customer (Payer) & Merchant (Payee)
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Customer / Payer</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                      <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>
                        {selectedPayment.customerName || selectedPayment.buyer?.name || "—"}
                      </strong>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>
                        {selectedPayment.customerId ? `ID #${selectedPayment.customerId}` : ""} {selectedPayment.customerPhone ? `• ${selectedPayment.customerPhone}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Wholesale Order Reference</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                      <strong className="font-mono" style={{ display: "block", fontSize: 13, color: "#2563eb" }}>
                        {selectedPayment.orderNumber || "Direct Top-up"}
                      </strong>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>
                        Order ID: {selectedPayment.orderId ? `#${selectedPayment.orderId}` : "None"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gateway Technical Telemetry */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Lock size={13} /> Razorpay Gateway Technical Telemetry
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Razorpay Payment ID</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 12.5, color: "#2563eb", fontWeight: 700 }}>
                      {selectedPayment.razorpayPaymentId || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Razorpay Order ID</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 12.5, color: "#475569" }}>
                      {selectedPayment.razorpayOrderId || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Payment Method</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                      {selectedPayment.paymentMethod || selectedPayment.method || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>VPA / Card / Bank</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 12.5, color: "#0f172a" }}>
                      {selectedPayment.vpa || (selectedPayment.cardLast4 ? `${selectedPayment.cardNetwork || "CARD"} •••• ${selectedPayment.cardLast4}` : selectedPayment.bank || "—")}
                    </div>
                  </div>
                </div>

                {selectedPayment.errorDescription && (
                  <div style={{ marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", textTransform: "uppercase" }}>Gateway Error / Status Note</span>
                    <div style={{ fontSize: 12.5, color: "#b91c1c", marginTop: 2 }}>{selectedPayment.errorDescription}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                onClick={() => {
                  navigate(`/admin/payments/${selectedPayment.paymentId || selectedPayment.id}`);
                  setSelectedPayment(null);
                }}
              >
                <ExternalLink size={13} /> Full Audit Page
              </button>

              {/* Refund Button Inside Modal */}
              {(selectedPayment.status === "CAPTURED" || selectedPayment.paymentStatus === "CAPTURED") && selectedPayment.orderId && (
                <button
                  className="btn-secondary"
                  style={{ borderColor: "#fecaca", color: "#b91c1c", background: "#fef2f2" }}
                  onClick={() => handleTriggerRefund(selectedPayment.orderId, selectedPayment.paymentId)}
                  disabled={refundingOrderId === selectedPayment.orderId}
                >
                  <RotateCcw size={13} /> {refundingOrderId === selectedPayment.orderId ? "Refunding..." : "Trigger Gateway Refund"}
                </button>
              )}

              <button className="btn-luxury-submit" onClick={() => setSelectedPayment(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REAL-TIME GATEWAY LOOKUP MODAL (GET /api/payments/{paymentId}/status)
          ========================================================================= */}
      {(gatewayModalLoading || gatewayModalData) && (
        <div className="modal-overlay" onClick={() => { setGatewayModalData(null); setGatewayModalLoading(false); }}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
                  <ShieldCheck size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Razorpay Live Gateway Telemetry</h2>
                  <p>Direct query to GET /api/payments/:paymentId/status</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setGatewayModalData(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              {gatewayModalLoading ? (
                <div className="loading-state-container" style={{ padding: "40px 0" }}>
                  <div className="spinner"></div>
                  <p>Connecting to Razorpay API gateway in real-time...</p>
                </div>
              ) : gatewayModalData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "14px 18px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <div>
                      <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Settlement Status</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: gatewayModalData.status === "CAPTURED" ? "#059669" : "#dc2626" }}>
                        ✓ {gatewayModalData.status}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Amount Settled</span>
                      <div className="font-mono" style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                        ₹{Number(gatewayModalData.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Razorpay Payment ID</label>
                      <div className="font-mono" style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12.5, color: "#2563eb", fontWeight: 700 }}>
                        {gatewayModalData.razorpayPaymentId}
                      </div>
                    </div>
                    <div className="input-field-wrap">
                      <label>Razorpay Order ID</label>
                      <div className="font-mono" style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12.5, color: "#475569" }}>
                        {gatewayModalData.razorpayOrderId}
                      </div>
                    </div>
                    <div className="input-field-wrap">
                      <label>Payment Method</label>
                      <div style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                        {gatewayModalData.paymentMethod}
                      </div>
                    </div>
                    <div className="input-field-wrap">
                      <label>Acquiring Bank</label>
                      <div style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13 }}>
                        {gatewayModalData.bank || "Direct UPI Gateway"}
                      </div>
                    </div>
                    {gatewayModalData.cardLast4 && (
                      <div className="input-field-wrap">
                        <label>Card Telemetry</label>
                        <div className="font-mono" style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12.5 }}>
                          {gatewayModalData.cardNetwork} •••• {gatewayModalData.cardLast4}
                        </div>
                      </div>
                    )}
                    <div className="input-field-wrap">
                      <label>Customer Contact & Email</label>
                      <div style={{ padding: "8px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12.5 }}>
                        {gatewayModalData.contact || "—"} {gatewayModalData.email ? `• ${gatewayModalData.email}` : ""}
                      </div>
                    </div>
                  </div>

                  {gatewayModalData.errorDescription && (
                    <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12.5, color: "#b91c1c" }}>
                      <strong>Gateway Error:</strong> {gatewayModalData.errorDescription}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="luxury-modal-footer">
              <button className="btn-luxury-submit" onClick={() => setGatewayModalData(null)}>
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOMER PAYMENT AUDIT MODAL (GET /api/payments/customer/{customerId})
          ========================================================================= */}
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
                  <h2>Financial Audit Log: {customerModalData.customerName || `Customer #${customerModalData.customerId}`}</h2>
                  <p>All checkout orders, wallet top-ups, authorizations and refunds (Customer ID: {customerModalData.customerId})</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setCustomerModalData(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              {customerModalLoading ? (
                <div className="loading-state-container" style={{ padding: "40px 0" }}>
                  <div className="spinner"></div>
                  <p>Retrieving complete customer financial dossier...</p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 400, overflowY: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Payment ID</th>
                        <th>Order Number</th>
                        <th>Purpose</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerModalData.records?.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                            No financial records found for this customer.
                          </td>
                        </tr>
                      ) : (
                        customerModalData.records?.map((rec) => (
                          <tr key={rec.paymentId || rec.id}>
                            <td>
                              <strong className="font-mono">#{rec.paymentId || rec.id}</strong>
                            </td>
                            <td>
                              {rec.orderNumber ? (
                                <span className="font-mono" style={{ color: "#2563eb", fontWeight: 700 }}>
                                  {rec.orderNumber}
                                </span>
                              ) : (
                                <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  background: rec.purpose === "WALLET_TOPUP" ? "#eff6ff" : "#f8fafc",
                                  color: rec.purpose === "WALLET_TOPUP" ? "#1d4ed8" : "#475569",
                                }}
                              >
                                {rec.purpose || "CHECKOUT"}
                              </span>
                            </td>
                            <td>
                              <strong className="font-mono">
                                ₹{Number(rec.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </strong>
                            </td>
                            <td>
                              <span className="category-pill-tag">
                                {rec.paymentMethod || rec.method || "UPI"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-badge-glow ${
                                  (rec.status || rec.paymentStatus || "").toUpperCase() === "CAPTURED" ||
                                  (rec.status || rec.paymentStatus || "").toUpperCase() === "SUCCESS"
                                    ? "status-delivered"
                                    : (rec.status || rec.paymentStatus || "").toUpperCase() === "REFUNDED"
                                    ? "status-inactive"
                                    : "status-pending"
                                }`}
                              >
                                <span className="status-dot"></span>
                                {rec.status || rec.paymentStatus}
                              </span>
                            </td>
                            <td className="date-cell">
                              <span>
                                {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString("en-IN") : "Today"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="luxury-modal-footer">
              <button className="btn-luxury-submit" onClick={() => setCustomerModalData(null)}>
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADMIN MANUAL WALLET CREDIT MODAL (POST /api/wallet/topup)
          ========================================================================= */}
      {showWalletModal && (
        <div className="modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 580 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  <Wallet size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Admin Manual Wallet Credit</h2>
                  <p>POST /api/wallet/topup • Strictly authorized for Admin goodwill & dispute compensation</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setShowWalletModal(false)}>×</button>
            </div>

            <form onSubmit={handleWalletTopupSubmit}>
              <div className="luxury-modal-body">
                <div className="form-section-card">
                  <div className="section-card-title">
                    <IndianRupee size={13} /> Credit Allocation Details
                  </div>

                  <div className="luxury-form-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="input-field-wrap">
                      <label>Target Customer ID</label>
                      <input
                        type="text"
                        value={walletForm.customerId}
                        onChange={(e) => setWalletForm({ ...walletForm, customerId: e.target.value })}
                        placeholder="e.g. 10"
                        required
                      />
                      <span style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>
                        Customer: <strong>{walletForm.customerName}</strong>
                      </span>
                    </div>

                    <div className="input-field-wrap">
                      <label>Credit Amount (INR) *</label>
                      <div style={{ position: "relative" }}>
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "#0f172a" }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          style={{ paddingLeft: 28 }}
                          value={walletForm.amount}
                          onChange={(e) => setWalletForm({ ...walletForm, amount: e.target.value })}
                          placeholder="2500.00"
                          required
                        />
                      </div>
                    </div>

                    <div className="input-field-wrap">
                      <label>Adjustment Description & Reason *</label>
                      <textarea
                        rows={3}
                        value={walletForm.description}
                        onChange={(e) => setWalletForm({ ...walletForm, description: e.target.value })}
                        placeholder="Compensation for delayed delivery on Order #ORD-20261003-42"
                        required
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="luxury-modal-footer">
                <button
                  type="button"
                  className="btn-luxury-cancel"
                  onClick={() => setShowWalletModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-luxury-submit"
                  disabled={walletSubmitting}
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  <Wallet size={14} /> {walletSubmitting ? "Crediting..." : "Authorize Wallet Credit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
