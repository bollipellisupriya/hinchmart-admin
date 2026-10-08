import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Eye,
  ShieldOff,
  ShieldCheck,
  Mail,
  Phone,
  ShoppingBag,
  Plus,
  Download,
  Edit2,
  Trash2,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  IndianRupee,
  User,
  Wallet,
  History,
} from "lucide-react";
import {
  getBuyers,
  createBuyer,
  updateBuyer,
  activateBuyer,
  deactivateBuyer,
  blockBuyer,
  unblockBuyer,
  deleteBuyer,
} from "../api/buyerApi";
import { topupCustomerWallet } from "../api/walletApi";
import { getCustomerPayments } from "../api/paymentApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";


export default function Buyers() {
  const toast = useToast();
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [editModalBuyer, setEditModalBuyer] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  // Wallet Modal State (Endpoint #5: POST /api/wallet/topup)
  const [walletBuyer, setWalletBuyer] = useState(null);
  const [walletAmount, setWalletAmount] = useState("2500");
  const [walletDescription, setWalletDescription] = useState("Dispute reimbursement / loyalty credit");
  const [walletSubmitting, setWalletSubmitting] = useState(false);

  // Customer Financial Audit Modal State (Endpoint #2: GET /api/payments/customer/{customerId})
  const [historyBuyer, setHistoryBuyer] = useState(null);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    status: "ACTIVE",
  });

  const loadBuyers = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const data = await getBuyers();
      const list = Array.isArray(data) ? data : data.buyers || data.data || [];
      setBuyers(list);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load buyers from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuyers();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "buyers") {
        loadBuyers(false);
      }
    });
    return unsub;
  }, []);

  const getStatus = (buyer) => {
    return (
      buyer.status ||
      (buyer.isBlocked ? "BLOCKED" : buyer.isActive === false ? "INACTIVE" : "ACTIVE")
    ).toUpperCase();
  };

  // Status Toggles
  const handleToggleActivate = async (buyer) => {
    const id = buyer.id || buyer._id;
    const currentStatus = getStatus(buyer);
    try {
      if (currentStatus === "ACTIVE") {
        await deactivateBuyer(id);
        toast.warning(`Buyer "${buyer.name}" has been deactivated.`);
      } else {
        await activateBuyer(id);
        toast.success(`Buyer "${buyer.name}" has been activated.`);
      }
      setBuyers((current) => current.map((item) => (item.id || item._id) === id ? { ...item, status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE", isActive: currentStatus !== "ACTIVE" } : item));
      if (selectedBuyer && (selectedBuyer.id || selectedBuyer._id) === id) {
        setSelectedBuyer((prev) => ({
          ...prev,
          status: currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }));
      }
    } catch (err) {
      toast.error("Failed to update status: " + (err?.message || ""));
    }
  };

  const handleBlock = async (buyer) => {
    const id = buyer.id || buyer._id;
    if (!window.confirm(`Are you sure you want to block buyer "${buyer.name}"?`)) return;
    try {
      await blockBuyer(id);
      toast.warning(`Buyer "${buyer.name}" has been blocked.`);
      await loadBuyers();
      if (selectedBuyer && (selectedBuyer.id || selectedBuyer._id) === id) {
        setSelectedBuyer((prev) => ({ ...prev, status: "BLOCKED" }));
      }
    } catch (err) {
      toast.error("Failed to block buyer.");
    }
  };

  const handleUnblock = async (buyer) => {
    const id = buyer.id || buyer._id;
    try {
      await unblockBuyer(id);
      toast.success(`Buyer "${buyer.name}" has been unblocked.`);
      await loadBuyers();
      if (selectedBuyer && (selectedBuyer.id || selectedBuyer._id) === id) {
        setSelectedBuyer((prev) => ({ ...prev, status: "ACTIVE" }));
      }
    } catch (err) {
      toast.error("Failed to unblock buyer.");
    }
  };

  const handleDelete = async (buyer) => {
    const id = buyer.id || buyer._id;
    if (!window.confirm(`Delete buyer "${buyer.name}" permanently?`)) return;
    try {
      await deleteBuyer(id);
      toast.info(`Buyer "${buyer.name}" deleted.`);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      if (selectedBuyer && (selectedBuyer.id || selectedBuyer._id) === id) {
        setSelectedBuyer(null);
      }
      await loadBuyers();
    } catch (err) {
      toast.error("Failed to delete buyer.");
    }
  };

  // Edit submission
  const handleOpenEdit = (buyer) => {
    setEditModalBuyer(buyer);
    setFormData({
      name: buyer.name || "",
      email: buyer.email || "",
      phone: buyer.phone || "",
      company: buyer.company || "",
      address: buyer.address || "",
      city: buyer.city || "",
      state: buyer.state || "",
      status: getStatus(buyer),
    });
  };

  const handleSaveBuyer = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast.warning("Please provide Name and Email.");
      return;
    }

    try {
      if (editModalBuyer) {
        const id = editModalBuyer.id || editModalBuyer._id;
        await updateBuyer(id, formData);
        toast.success(`Buyer "${formData.name}" updated successfully.`);
        setEditModalBuyer(null);
      }
      await loadBuyers();
    } catch (err) {
      toast.error("Operation failed: " + (err?.message || ""));
    }
  };

  // 5. Admin Manual Wallet Credit Handlers (POST /api/wallet/topup)
  const handleOpenWallet = (buyer) => {
    setWalletBuyer(buyer);
    setWalletAmount("");
    setWalletDescription("");
  };

  const handleWalletSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(walletAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid positive credit amount.");
      return;
    }
    const customerId = walletBuyer?.id || walletBuyer?._id;
    if (!customerId) {
      toast.error("Customer ID not found for this buyer.");
      return;
    }
    try {
      setWalletSubmitting(true);
      const res = await topupCustomerWallet({
        amount: amt,
        description: walletDescription,
        customerId,
      });
      toast.success(
        `Wallet credited with ₹${amt.toLocaleString("en-IN")} for ${walletBuyer?.name}! New Balance: ₹${(res?.balance || 0).toLocaleString("en-IN")}`
      );
      setWalletBuyer(null);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to credit customer wallet.");
    } finally {
      setWalletSubmitting(false);
    }
  };

  // 2. Customer Financial Audit Log Handler (GET /api/payments/customer/{customerId})
  const handleOpenCustomerHistory = async (buyer) => {
    const customerId = buyer.id || buyer._id;
    if (!customerId) {
      toast.error("Customer ID not found for this buyer.");
      return;
    }
    try {
      setHistoryBuyer(buyer);
      setHistoryLoading(true);
      setCustomerPayments([]);
      const records = await getCustomerPayments(customerId);
      setCustomerPayments(records);
    } catch (err) {
      toast.error("Failed to load customer payment records.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredBuyers.map((b) => b.id || b._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkActivate = async () => {
    for (const id of selectedIds) {
      await activateBuyer(id);
    }
    toast.success(`Activated ${selectedIds.length} buyers.`);
    setSelectedIds([]);
    await loadBuyers();
  };

  const handleBulkDeactivate = async () => {
    for (const id of selectedIds) {
      await deactivateBuyer(id);
    }
    toast.warning(`Deactivated ${selectedIds.length} buyers.`);
    setSelectedIds([]);
    await loadBuyers();
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected buyers?`)) return;
    for (const id of selectedIds) {
      await deleteBuyer(id);
    }
    toast.info(`Deleted ${selectedIds.length} buyers.`);
    setSelectedIds([]);
    await loadBuyers();
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["ID,Name,Email,Phone,Company,City,State,Orders,Total Spent (INR),Status,Joined Date"];
    const rows = filteredBuyers.map((b) =>
      [
        `"${b.id || b._id}"`,
        `"${b.name || ""}"`,
        `"${b.email || ""}"`,
        `"${b.phone || ""}"`,
        `"${b.company || ""}"`,
        `"${b.city || ""}"`,
        `"${b.state || ""}"`,
        b.totalOrders || 0,
        b.totalSpent || 0,
        `"${getStatus(b)}"`,
        `"${b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : ""}"`,
      ].join(",")
    );
    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_buyers_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Buyers export downloaded!");
  };

  // Filtered List
  const filteredBuyers = useMemo(() => {
    return buyers.filter((buyer) => {
      const text = `${buyer.name || ""} ${buyer.email || ""} ${buyer.phone || ""} ${buyer.company || ""} ${buyer.city || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const status = getStatus(buyer);
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [buyers, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: buyers.length,
      active: buyers.filter((b) => getStatus(b) === "ACTIVE").length,
      inactive: buyers.filter((b) => getStatus(b) === "INACTIVE").length,
      blocked: buyers.filter((b) => getStatus(b) === "BLOCKED").length,
    };
  }, [buyers]);

  return (
    <div className="buyers-page">
      {/* Header Section */}
      <div className="page-header">
        <div>
          <h1>Buyers Management</h1>
          <p>Real-time buyer directory, verification, activation & status control</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${statusFilter === "ALL" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <span className="stat-pill-label">Total Registered</span>
          <strong className="stat-pill-value">{counts.total}</strong>
        </div>

        <div
          className={`stat-pill active ${statusFilter === "ACTIVE" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("ACTIVE")}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Active</span>
          <strong className="stat-pill-value">{counts.active}</strong>
        </div>

        <div
          className={`stat-pill inactive ${statusFilter === "INACTIVE" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("INACTIVE")}
        >
          <span className="stat-pill-label">Deactivated</span>
          <strong className="stat-pill-value">{counts.inactive}</strong>
        </div>

        <div
          className={`stat-pill blocked ${statusFilter === "BLOCKED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("BLOCKED")}
        >
          <span className="stat-pill-label">Blocked</span>
          <strong className="stat-pill-value">{counts.blocked}</strong>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button onClick={loadBuyers}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="content-card">
        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Search by buyer name, email, company, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")}>
                ×
              </button>
            )}
          </div>

          <div className="filter-tabs">
            {[
              { id: "ALL", label: "All Buyers", count: counts.total },
              { id: "ACTIVE", label: "Active", count: counts.active },
              { id: "INACTIVE", label: "Deactivated", count: counts.inactive },
              { id: "BLOCKED", label: "Blocked", count: counts.blocked },
            ].map((f) => (
              <button
                key={f.id}
                className={`filter-tab ${statusFilter === f.id ? "active" : ""}`}
                onClick={() => setStatusFilter(f.id)}
              >
                <span>{f.label}</span>
                <span className="filter-badge">{f.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Strip */}
        {selectedIds.length > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-left">
              <strong>{selectedIds.length}</strong> buyers selected
            </div>
            <div className="bulk-right">
              <button
                className="btn-bulk-action success"
                onClick={handleBulkActivate}
                title="Activate selected"
              >
                <CheckCircle2 size={15} /> Activate
              </button>
              <button
                className="btn-bulk-action warning"
                onClick={handleBulkDeactivate}
                title="Deactivate selected"
              >
                <XCircle size={15} /> Deactivate
              </button>
              <button
                className="btn-bulk-action danger"
                onClick={handleBulkDelete}
                title="Delete selected"
              >
                <Trash2 size={15} /> Delete
              </button>
              <button
                className="btn-bulk-cancel"
                onClick={() => setSelectedIds([])}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading buyers directory...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 42 }}>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={
                        filteredBuyers.length > 0 &&
                        selectedIds.length === filteredBuyers.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Buyer / Enterprise</th>
                  <th>Contact Details</th>
                  <th>Orders / Spent</th>
                  <th>Joined Date</th>
                  <th>Account Status</th>
                  <th>Quick Activation</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuyers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table">
                      <div className="empty-table-content">
                        <ShoppingBag size={40} className="empty-icon" />
                        <h3>No buyers found</h3>
                        <p>
                          {search
                            ? `No buyers matching "${search}"`
                            : "No buyers registered under this category."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBuyers.map((buyer, idx) => {
                    const status = getStatus(buyer);
                    const id = buyer.id ?? buyer._id ?? buyer.userId ?? buyer.email ?? `buyer_${idx}`;
                    const isSelected = selectedIds.includes(id);
                    const isActive = status === "ACTIVE";

                    return (
                      <tr key={id} className={isSelected ? "row-selected" : ""}>
                        <td>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(id)}
                          />
                        </td>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar buyer-avatar">
                              {(buyer.name || "B")[0].toUpperCase()}
                            </div>
                            <div className="user-info-text">
                              <strong className="user-primary-name">
                                {buyer.name || "Unnamed Buyer"}
                              </strong>
                              {buyer.company && (
                                <span className="company-tag">
                                  <Building2 size={12} /> {buyer.company}
                                </span>
                              )}
                              {buyer.city && (
                                <small className="city-subtext">
                                  <MapPin size={11} /> {buyer.city}
                                  {buyer.state ? `, ${buyer.state}` : ""}
                                </small>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="contact-cell">
                            {buyer.email && (
                              <span className="contact-item">
                                <Mail size={13} /> {buyer.email}
                              </span>
                            )}
                            {buyer.phone && (
                              <span className="contact-item">
                                <Phone size={13} /> {buyer.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="orders-metrics-cell">
                            <div className="orders-count-badge">
                              <ShoppingBag size={13} />
                              <strong>{buyer.totalOrders ?? 0}</strong> orders
                            </div>
                            {buyer.totalSpent !== undefined && (
                              <span className="spent-amount">
                                <IndianRupee size={12} />
                                {Number(buyer.totalSpent).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="date-cell">
                          {buyer.createdAt ? (
                            <div>
                              <span>
                                {new Date(buyer.createdAt).toLocaleDateString(
                                  "en-IN",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-badge-glow status-${status.toLowerCase()}`}
                          >
                            <span className="status-dot"></span>
                            {status === "ACTIVE"
                              ? "Active"
                              : status === "INACTIVE"
                              ? "Deactivated"
                              : "Blocked"}
                          </span>
                        </td>
                        <td>
                          {/* Live Activate / Deactivate Toggle Switch */}
                          <div
                            className="toggle-container"
                            title={
                              status === "BLOCKED"
                                ? "Account is blocked"
                                : isActive
                                ? "Click to Deactivate"
                                : "Click to Activate"
                            }
                          >
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={isActive}
                                disabled={status === "BLOCKED"}
                                onChange={() => handleToggleActivate(buyer)}
                              />
                              <span className="slider round"></span>
                            </label>
                            <span className="toggle-label-text">
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div
                            className="action-buttons"
                            style={{ justifyContent: "flex-end" }}
                          >
                            <button
                              className="icon-action"
                              title="View Details"
                              onClick={() => setSelectedBuyer(buyer)}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="icon-action"
                              title="Manual Wallet Credit"
                              style={{ color: "#059669" }}
                              onClick={() => handleOpenWallet(buyer)}
                            >
                              <Wallet size={16} />
                            </button>

                            <button
                              className="icon-action"
                              title="Customer Financial History"
                              style={{ color: "#2563eb" }}
                              onClick={() => handleOpenCustomerHistory(buyer)}
                            >
                              <History size={16} />
                            </button>

                            <button
                              className="icon-action"
                              title="Edit Buyer"
                              onClick={() => handleOpenEdit(buyer)}
                            >
                              <Edit2 size={16} />
                            </button>

                            {status === "ACTIVE" || status === "INACTIVE" ? (
                              <button
                                className="icon-action danger"
                                title="Block Account"
                                onClick={() => handleBlock(buyer)}
                              >
                                <ShieldOff size={16} />
                              </button>
                            ) : (
                              <button
                                className="icon-action success"
                                title="Unblock Account"
                                onClick={() => handleUnblock(buyer)}
                              >
                                <ShieldCheck size={16} />
                              </button>
                            )}

                            <button
                              className="icon-action danger"
                              title="Delete Buyer"
                              onClick={() => handleDelete(buyer)}
                            >
                              <Trash2 size={16} />
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

      {/* ============================================================
          PREMIUM POPUP MODAL: BUYER PROFILE DOSSIER
          ============================================================ */}
      {selectedBuyer && (
        <div className="modal-overlay" onClick={() => setSelectedBuyer(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Dark Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{(selectedBuyer.name || "B")[0].toUpperCase()}</span>
                </div>
                <div className="header-texts">
                  <h2>{selectedBuyer.name || "Unnamed Buyer"}</h2>
                  <p>{selectedBuyer.company || "Individual Buyer"} &nbsp;•&nbsp; {selectedBuyer.city || ""}{selectedBuyer.state ? `, ${selectedBuyer.state}` : ""}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setSelectedBuyer(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              {/* Status + Quick Toggle */}
              <div className="form-section-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`status-badge-glow status-${getStatus(selectedBuyer).toLowerCase()}`}>
                    <span className="status-dot"></span>
                    {getStatus(selectedBuyer)}
                  </span>
                  <div>
                    <strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>Account Visibility</strong>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Toggle marketplace access for this buyer</span>
                  </div>
                </div>
                <div className="toggle-container">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={getStatus(selectedBuyer) === "ACTIVE"}
                      disabled={getStatus(selectedBuyer) === "BLOCKED"}
                      onChange={() => handleToggleActivate(selectedBuyer)}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span className="toggle-label-text">{getStatus(selectedBuyer) === "ACTIVE" ? "Active" : "Off"}</span>
                </div>
              </div>

              {/* Buyer Details Grid */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Mail size={13} /> Contact & Enterprise Details
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Email Address</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>{selectedBuyer.email || "—"}</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Phone Number</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>{selectedBuyer.phone || "—"}</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Total Orders</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{selectedBuyer.totalOrders ?? 0} orders</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Total GMV / Spent</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, fontWeight: 800, color: "#059669" }} className="font-mono">₹{Number(selectedBuyer.totalSpent || 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="input-field-wrap full-width">
                    <label>Registered Address</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>{selectedBuyer.address || "No address on file"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <div style={{ display: "flex", gap: 10 }}>
                {getStatus(selectedBuyer) !== "BLOCKED" ? (
                  <button
                    className="btn-luxury-cancel"
                    style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                    onClick={() => handleBlock(selectedBuyer)}
                  >
                    <ShieldOff size={13} /> Block Account
                  </button>
                ) : (
                  <button
                    className="btn-luxury-cancel"
                    style={{ background: "#dcfce7", color: "#16a34a", borderColor: "#bbf7d0" }}
                    onClick={() => handleUnblock(selectedBuyer)}
                  >
                    <ShieldCheck size={13} /> Unblock
                  </button>
                )}
              </div>
              <div className="footer-action-buttons">
                <button
                  className="btn-secondary"
                  style={{ borderColor: "#a7f3d0", color: "#059669", background: "#ecfdf5" }}
                  onClick={() => {
                    const b = selectedBuyer;
                    setSelectedBuyer(null);
                    handleOpenWallet(b);
                  }}
                >
                  <Wallet size={13} /> Credit Wallet
                </button>
                <button
                  className="btn-secondary"
                  style={{ borderColor: "#bfdbfe", color: "#2563eb", background: "#eff6ff" }}
                  onClick={() => {
                    const b = selectedBuyer;
                    setSelectedBuyer(null);
                    handleOpenCustomerHistory(b);
                  }}
                >
                  <History size={13} /> Payment Log
                </button>
                <button className="btn-luxury-cancel" onClick={() => setSelectedBuyer(null)}>Close</button>
                <button
                  className="btn-luxury-submit"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}
                  onClick={() => { handleOpenEdit(selectedBuyer); setSelectedBuyer(null); }}
                >
                  <Edit2 size={14} /> Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PREMIUM POPUP MODAL: EDIT BUYER
          ============================================================ */}
      {editModalBuyer && (
        <div
          className="modal-overlay"
          onClick={() => setEditModalBuyer(null)}
        >
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 680 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>
                  <Building2 size={20} style={{ color: "#fff" }} />
                </div>
                <div className="header-texts">
                  <h2>Edit Buyer Profile</h2>
                  <p>{`Updating profile for ${editModalBuyer.name}`}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setEditModalBuyer(null)}>×</button>
            </div>

            <form onSubmit={handleSaveBuyer}>
              <div className="luxury-modal-body">
                {/* Identity Section */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <User size={13} /> Buyer Identity
                  </div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Full Name <span className="required-star">*</span></label>
                      <input required placeholder="e.g. Ramesh Kumar" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="input-field-wrap">
                      <label>Company / Enterprise</label>
                      <input placeholder="Kumar Industries Ltd." value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Contact Section */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <Mail size={13} /> Contact Details
                  </div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Email Address <span className="required-star">*</span></label>
                      <input required type="email" placeholder="ramesh@enterprise.in" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="input-field-wrap">
                      <label>Phone Number</label>
                      <input placeholder="+91 98765 43210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Location Section */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <MapPin size={13} /> Location & Address
                  </div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>City</label>
                      <input placeholder="e.g. Mumbai" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div className="input-field-wrap">
                      <label>State</label>
                      <input placeholder="e.g. Maharashtra" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                    </div>
                    <div className="input-field-wrap full-width">
                      <label>Complete Address</label>
                      <textarea rows={2} placeholder="Factory / Office Street Address..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <CheckCircle2 size={13} /> Account Status
                  </div>
                  <div className="input-field-wrap" style={{ maxWidth: 260 }}>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="ACTIVE">✓ Active — Can place orders & RFQs</option>
                      <option value="INACTIVE">⏸ Inactive / Deactivated</option>
                      <option value="BLOCKED">✕ Blocked</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="luxury-modal-footer">
                <div className="footer-tip-text">
                  <ShieldCheck size={13} /> Fields marked <span style={{ color: "#ef4444", marginLeft: 2 }}>*</span> are required
                </div>
                <div className="footer-action-buttons">
                  <button type="button" className="btn-luxury-cancel" onClick={() => setEditModalBuyer(null)}>Cancel</button>
                  <button type="submit" className="btn-luxury-submit" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 4px 14px rgba(59,130,246,0.35)" }}>
                    <CheckCircle2 size={14} /> Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          ADMIN WALLET CREDIT MODAL (POST /api/wallet/topup)
          ============================================================ */}
      {walletBuyer && (
        <div className="modal-overlay" onClick={() => setWalletBuyer(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  <Wallet size={20} style={{ color: "#fff" }} />
                </div>
                <div className="header-texts">
                  <h2>Admin Wallet Credit</h2>
                  <p>POST /api/wallet/topup • Credit goodwill or reimbursement balance</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setWalletBuyer(null)}>×</button>
            </div>

            <form onSubmit={handleWalletSubmit}>
              <div className="luxury-modal-body">
                <div className="form-section-card">
                  <div className="section-card-title">
                    <IndianRupee size={13} /> Credit Allocation: {walletBuyer.name}
                  </div>

                  <div className="luxury-form-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="input-field-wrap">
                      <label>Customer Entity</label>
                      <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <strong>{walletBuyer.name}</strong> • ID #{walletBuyer.id || walletBuyer._id}
                        {walletBuyer.company && <div style={{ fontSize: 11.5, color: "#64748b" }}>{walletBuyer.company}</div>}
                      </div>
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
                          value={walletAmount}
                          onChange={(e) => setWalletAmount(e.target.value)}
                          placeholder="2500.00"
                          required
                        />
                      </div>
                    </div>

                    <div className="input-field-wrap">
                      <label>Reason & Description *</label>
                      <textarea
                        rows={3}
                        value={walletDescription}
                        onChange={(e) => setWalletDescription(e.target.value)}
                        placeholder="Compensation for delayed delivery or dispute reimbursement"
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
                  onClick={() => setWalletBuyer(null)}
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

      {/* ============================================================
          CUSTOMER FINANCIAL AUDIT LOG MODAL (GET /api/payments/customer/{customerId})
          ============================================================ */}
      {historyBuyer && (
        <div className="modal-overlay" onClick={() => setHistoryBuyer(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 840 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                  <History size={20} style={{ color: "#fff" }} />
                </div>
                <div className="header-texts">
                  <h2>Financial Audit History: {historyBuyer.name}</h2>
                  <p>GET /api/payments/customer/:customerId • Customer ID #{historyBuyer.id || historyBuyer._id}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setHistoryBuyer(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              {historyLoading ? (
                <div className="loading-state-container" style={{ padding: "40px 0" }}>
                  <div className="spinner"></div>
                  <p>Loading financial history from backend...</p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 380, overflowY: "auto" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Payment ID</th>
                        <th>Order No</th>
                        <th>Purpose</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerPayments.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center", padding: 30, color: "#64748b" }}>
                            No financial records found for this buyer.
                          </td>
                        </tr>
                      ) : (
                        customerPayments.map((p) => (
                          <tr key={p.paymentId || p.id}>
                            <td><strong className="font-mono">#{p.paymentId || p.id}</strong></td>
                            <td>
                              {p.orderNumber ? (
                                <span className="font-mono" style={{ color: "#2563eb", fontWeight: 700 }}>
                                  {p.orderNumber}
                                </span>
                              ) : "—"}
                            </td>
                            <td>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: p.purpose === "WALLET_TOPUP" ? "#eff6ff" : "#f1f5f9", color: p.purpose === "WALLET_TOPUP" ? "#1d4ed8" : "#475569" }}>
                                {p.purpose || "CHECKOUT"}
                              </span>
                            </td>
                            <td>
                              <strong className="font-mono">
                                ₹{Number(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </strong>
                            </td>
                            <td>{p.paymentMethod || p.method || "UPI"}</td>
                            <td>
                              <span className={`status-badge-glow ${(p.status || p.paymentStatus || "").toUpperCase() === "REFUNDED" ? "status-inactive" : "status-delivered"}`}>
                                <span className="status-dot"></span>
                                {p.status || p.paymentStatus}
                              </span>
                            </td>
                            <td className="date-cell">
                              <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "Today"}</span>
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
              <button className="btn-luxury-submit" onClick={() => setHistoryBuyer(null)}>
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
