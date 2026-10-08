import { useEffect, useState, useMemo } from "react";
import {
  Ticket,
  Percent,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  Users,
  Calendar,
  AlertCircle,
  IndianRupee,
  Sparkles,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Download,
  Eye,
  Check,
  X,
  Tag,
  ShieldAlert,
  Zap,
  Gift,
  Wand2,
} from "lucide-react";
import {
  getCoupons,
  createCoupon,
  updateCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getCouponUsages,
} from "../api/couponApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";
import "../styles/coupons.css";

export default function Coupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE, PERCENTAGE, FIXED_AMOUNT, FIRST_ORDER
  const [viewMode, setViewMode] = useState("grid"); // grid | table

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Usages Audit Drawer Modal
  const [selectedCouponUsages, setSelectedCouponUsages] = useState(null);
  const [usagesList, setUsagesList] = useState([]);
  const [loadingUsages, setLoadingUsages] = useState(false);

  // 409 Redeemed Conflict Warning Modal
  const [redeemedConflictCoupon, setRedeemedConflictCoupon] = useState(null);

  // Form State
  const initialForm = {
    code: "",
    title: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: "",
    totalUsageLimit: "",
    perUserLimit: 1,
    firstOrderOnly: false,
    isActive: true,
    startDate: "",
    expiryDate: "",
  };

  const [formData, setFormData] = useState(initialForm);

  const loadData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await getCoupons({
        search,
        active: statusFilter === "ACTIVE" ? true : statusFilter === "INACTIVE" ? false : undefined,
      });
      setCoupons(res.content || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load coupons from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeDataUpdate((event) => {
      if (event.entity === "coupons") {
        loadData(false);
      }
    });
    return unsub;
  }, [statusFilter]);

  // Metric Computations
  const metrics = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((c) => c.isActive !== false).length;
    const inactive = total - active;
    const totalRedemptions = coupons.reduce((sum, c) => sum + (Number(c.usedCount) || 0), 0);
    return { total, active, inactive, totalRedemptions };
  }, [coupons]);

  // Filtered List
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        coupon.code?.toLowerCase().includes(q) ||
        coupon.title?.toLowerCase().includes(q) ||
        coupon.description?.toLowerCase().includes(q);

      let matchFilter = true;
      if (statusFilter === "ACTIVE") matchFilter = coupon.isActive !== false;
      else if (statusFilter === "INACTIVE") matchFilter = coupon.isActive === false;
      else if (statusFilter === "PERCENTAGE") matchFilter = coupon.discountType === "PERCENTAGE";
      else if (statusFilter === "FIXED_AMOUNT") matchFilter = coupon.discountType === "FIXED_AMOUNT";
      else if (statusFilter === "FIRST_ORDER") matchFilter = Boolean(coupon.firstOrderOnly);

      return matchSearch && matchFilter;
    });
  }, [coupons, search, statusFilter]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(initialForm);
    setShowFormModal(true);
  };

  const handleOpenEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || "",
      title: coupon.title || "",
      description: coupon.description || "",
      discountType: coupon.discountType || "PERCENTAGE",
      discountValue: coupon.discountValue || 10,
      minOrderAmount: coupon.minOrderAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || "",
      totalUsageLimit: coupon.totalUsageLimit || "",
      perUserLimit: coupon.perUserLimit || 1,
      firstOrderOnly: Boolean(coupon.firstOrderOnly),
      isActive: coupon.isActive !== false,
      startDate: coupon.startDate ? coupon.startDate.slice(0, 16) : "",
      expiryDate: coupon.expiryDate ? coupon.expiryDate.slice(0, 16) : "",
    });
    setShowFormModal(true);
  };

  const handleGenerateCode = () => {
    const prefixes = ["SAVE", "HINCH", "PROMO", "MEGA", "FEST", "BULK", "VIP", "BUILD"];
    const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randVal = formData.discountValue || Math.floor(Math.random() * 5 + 1) * 10;
    const generated = `${randPrefix}${randVal}`;
    setFormData((prev) => ({
      ...prev,
      code: generated,
      title: prev.title || `${generated} - ${prev.discountType === "PERCENTAGE" ? `${randVal}% Off` : `₹${randVal} Flat Discount`}`,
    }));
    toast.success(`Generated Code: "${generated}"`);
  };

  const handleApplyPreset = (type, val, minOrder = 0, title = "") => {
    setFormData((prev) => ({
      ...prev,
      discountType: type,
      discountValue: val,
      minOrderAmount: minOrder,
      maxDiscountAmount: type === "PERCENTAGE" ? val * 50 : "",
      title: title || (type === "PERCENTAGE" ? `${val}% Off Orders above ₹${minOrder}` : `Flat ₹${val} Rebate`),
      code: prev.code || (type === "PERCENTAGE" ? `SAVE${val}` : `FLAT${val}`),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, formData);
        toast.success(`Coupon "${formData.code}" updated successfully!`);
      } else {
        await createCoupon(formData);
        toast.success(`Coupon "${formData.code}" created successfully!`);
      }
      setShowFormModal(false);
      await loadData(false);
    } catch (err) {
      toast.error(err?.message || "Action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon) => {
    const nextStatus = !coupon.isActive;
    try {
      await toggleCouponStatus(coupon.id, nextStatus);
      toast.info(`Coupon ${coupon.code} marked as ${nextStatus ? "ACTIVE" : "INACTIVE"}.`);
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: nextStatus } : c))
      );
    } catch (err) {
      toast.error("Failed to toggle status: " + err.message);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) return;

    try {
      await deleteCoupon(coupon.id);
      toast.success(`Coupon "${coupon.code}" deleted.`);
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
    } catch (err) {
      if (err.isRedeemedConflict || (coupon.usedCount && coupon.usedCount > 0)) {
        setRedeemedConflictCoupon(coupon);
      } else {
        toast.error(err.message || "Failed to delete coupon.");
      }
    }
  };

  const handleDeactivateRedeemed = async () => {
    if (!redeemedConflictCoupon) return;
    try {
      await toggleCouponStatus(redeemedConflictCoupon.id, false);
      toast.success(`Coupon "${redeemedConflictCoupon.code}" deactivated to preserve audit trail.`);
      setRedeemedConflictCoupon(null);
      await loadData(false);
    } catch (err) {
      toast.error("Failed to deactivate: " + err.message);
    }
  };

  const handleOpenUsages = async (coupon) => {
    setSelectedCouponUsages(coupon);
    setLoadingUsages(true);
    try {
      const res = await getCouponUsages(coupon.id);
      setUsagesList(res.content || []);
    } catch {
      toast.error("Failed to load coupon redemptions.");
      setUsagesList([]);
    } finally {
      setLoadingUsages(false);
    }
  };

  const handleCopyCode = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      toast.success(`Copied "${code}" to clipboard!`);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "ID,Code,Title,Discount Type,Discount Value,Min Order,Max Discount,Total Limit,Used Count,Per User Limit,First Order Only,Active,Start Date,Expiry Date",
    ];
    const rows = filteredCoupons.map((c) =>
      [
        c.id,
        `"${c.code || ""}"`,
        `"${c.title || ""}"`,
        c.discountType,
        c.discountValue,
        c.minOrderAmount || 0,
        c.maxDiscountAmount || "",
        c.totalUsageLimit || "Unlimited",
        c.usedCount || 0,
        c.perUserLimit || 1,
        c.firstOrderOnly ? "YES" : "NO",
        c.isActive !== false ? "ACTIVE" : "INACTIVE",
        `"${c.startDate || ""}"`,
        `"${c.expiryDate || ""}"`,
      ].join(",")
    );

    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_coupons_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Coupons CSV exported!");
  };

  return (
    <div className="coupons-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Coupon & Discount Management</h1>
          <p>Create promotional vouchers, configure percentage/flat rebates, and track redemption audit trails</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="primary-button" onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* Header Metric Cards */}
      <div className="coupon-stats-grid">
        <div className="coupon-stat-card">
          <div className="coupon-stat-icon amber">
            <Ticket size={22} />
          </div>
          <div className="coupon-stat-details">
            <span>Total Coupons</span>
            <strong>{metrics.total}</strong>
          </div>
        </div>

        <div className="coupon-stat-card">
          <div className="coupon-stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="coupon-stat-details">
            <span>Active & Live</span>
            <strong>{metrics.active}</strong>
          </div>
        </div>

        <div className="coupon-stat-card">
          <div className="coupon-stat-icon blue">
            <Users size={22} />
          </div>
          <div className="coupon-stat-details">
            <span>Total Redemptions</span>
            <strong>{metrics.totalRedemptions}</strong>
          </div>
        </div>

        <div className="coupon-stat-card">
          <div className="coupon-stat-icon purple">
            <Percent size={22} />
          </div>
          <div className="coupon-stat-details">
            <span>Deactivated</span>
            <strong>{metrics.inactive}</strong>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="coupon-controls-strip">
        <div className="coupon-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search coupon code, title, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>
              ×
            </button>
          )}
        </div>

        <div className="filter-tabs" style={{ margin: 0 }}>
          {[
            { id: "ALL", label: "All Coupons" },
            { id: "ACTIVE", label: "Active" },
            { id: "INACTIVE", label: "Inactive" },
            { id: "PERCENTAGE", label: "Percentage %" },
            { id: "FIXED_AMOUNT", label: "Flat ₹ Off" },
            { id: "FIRST_ORDER", label: "First Order Only" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`filter-tab ${statusFilter === tab.id ? "active" : ""}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className={`btn-ticket-action ${viewMode === "grid" ? "primary" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Ticket Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={`btn-ticket-action ${viewMode === "table" ? "primary" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            <TableIcon size={15} />
          </button>
        </div>
      </div>

      {/* Coupons Content */}
      {loading ? (
        <div className="loading-state-container">
          <div className="spinner"></div>
          <p>Loading promotional coupons...</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="empty-table-content" style={{ padding: "48px 24px", background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <Ticket size={48} color="#94a3b8" />
          <h3>No coupons found</h3>
          <p>
            {search
              ? `No coupon matching "${search}"`
              : "No discount vouchers registered under this filter. Click 'Create Coupon' to add one."}
          </p>
          <button className="primary-button" style={{ marginTop: "14px" }} onClick={handleOpenCreate}>
            <Plus size={15} /> Create First Coupon
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="coupons-grid">
          {filteredCoupons.map((coupon) => {
            const isPercentage = coupon.discountType === "PERCENTAGE";
            const usagePercent = coupon.totalUsageLimit
              ? Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.totalUsageLimit) * 100))
              : null;

            return (
              <div
                key={coupon.id}
                className={`coupon-ticket-card ${coupon.isActive === false ? "inactive" : ""}`}
              >
                {/* Header Strip */}
                <div className={`ticket-header ${isPercentage ? "percentage-type" : "fixed-type"}`}>
                  <div className="ticket-code-wrap">
                    <span className="ticket-code-badge">
                      <Tag size={13} /> {coupon.code}
                    </span>
                    <button
                      className="ticket-copy-btn"
                      onClick={() => handleCopyCode(coupon.code)}
                      title="Copy Coupon Code"
                    >
                      <Copy size={13} />
                    </button>
                  </div>

                  <span className="ticket-discount-pill">
                    {isPercentage ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT`}
                  </span>
                </div>

                {/* Perforated Edge Notch Separator */}
                <div className="ticket-perforated-separator">
                  <div className="perforated-dashed-line"></div>
                </div>

                {/* Body Details */}
                <div className="ticket-body">
                  <div>
                    <h3 className="ticket-title">{coupon.title}</h3>
                    {coupon.description && <p className="ticket-desc">{coupon.description}</p>}
                  </div>

                  <div className="ticket-specs-grid">
                    <div className="ticket-spec-item">
                      <span>Min Cart Order</span>
                      <strong>₹{Number(coupon.minOrderAmount || 0).toLocaleString("en-IN")}</strong>
                    </div>

                    <div className="ticket-spec-item">
                      <span>Max Discount Cap</span>
                      <strong>
                        {isPercentage && coupon.maxDiscountAmount
                          ? `₹${Number(coupon.maxDiscountAmount).toLocaleString("en-IN")}`
                          : "No Cap"}
                      </strong>
                    </div>

                    <div className="ticket-spec-item">
                      <span>Per User Limit</span>
                      <strong>{coupon.perUserLimit || 1} redemption</strong>
                    </div>

                    <div className="ticket-spec-item">
                      <span>Target Audience</span>
                      <strong>{coupon.firstOrderOnly ? "First Order Only" : "All Customers"}</strong>
                    </div>
                  </div>

                  {/* Usage Progress Meter */}
                  <div className="ticket-usage-wrap">
                    <div className="ticket-usage-header">
                      <span>Total Redemptions</span>
                      <strong>
                        {coupon.usedCount || 0}
                        {coupon.totalUsageLimit ? ` / ${coupon.totalUsageLimit}` : " uses (Unlimited)"}
                      </strong>
                    </div>
                    {usagePercent !== null && (
                      <div className="ticket-progress-track">
                        <div
                          className={`ticket-progress-fill ${usagePercent >= 100 ? "full" : ""}`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expiry Timestamp */}
                  <div style={{ fontSize: "11.5px", color: "#64748b", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Calendar size={13} color="#94a3b8" />
                    {coupon.expiryDate ? (
                      <span>
                        Valid until: <strong>{new Date(coupon.expiryDate).toLocaleDateString("en-IN")}</strong>
                      </span>
                    ) : (
                      <span>No expiry date configured</span>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="ticket-footer">
                  <label className="ticket-status-toggle" onClick={() => handleToggleStatus(coupon)}>
                    <input
                      type="checkbox"
                      checked={coupon.isActive !== false}
                      onChange={() => {}}
                      style={{ cursor: "pointer", accentColor: "#f59e0b" }}
                    />
                    <span style={{ color: coupon.isActive !== false ? "#047857" : "#64748b" }}>
                      {coupon.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </label>

                  <div className="ticket-actions-group">
                    <button
                      className="btn-ticket-action"
                      onClick={() => handleOpenUsages(coupon)}
                      title="View Redemption History"
                    >
                      <Eye size={13} /> Usages ({coupon.usedCount || 0})
                    </button>
                    <button
                      className="btn-ticket-action"
                      onClick={() => handleOpenEdit(coupon)}
                      title="Edit Coupon"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn-ticket-action danger"
                      onClick={() => handleDelete(coupon)}
                      title="Delete Coupon"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode View */
        <div className="table-container" style={{ background: "#ffffff" }}>
          <table>
            <thead>
              <tr>
                <th>Coupon Code & Title</th>
                <th>Discount Type & Value</th>
                <th>Order Thresholds</th>
                <th>Usage & Redemptions</th>
                <th>Validity Period</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => {
                const isPercentage = coupon.discountType === "PERCENTAGE";
                return (
                  <tr key={coupon.id}>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong className="font-mono" style={{ color: "#d97706", fontSize: "14px" }}>
                            {coupon.code}
                          </strong>
                          <button
                            className="ticket-copy-btn"
                            onClick={() => handleCopyCode(coupon.code)}
                            title="Copy code"
                          >
                            <Copy size={12} color="#64748b" />
                          </button>
                        </div>
                        <span style={{ fontSize: "12px", color: "#334155", fontWeight: 600 }}>
                          {coupon.title}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className="category-pill-tag"
                        style={{
                          background: isPercentage ? "#eff6ff" : "#ecfdf5",
                          color: isPercentage ? "#1d4ed8" : "#047857",
                          fontWeight: 700,
                        }}
                      >
                        {isPercentage ? `${coupon.discountValue}% PERCENTAGE` : `₹${coupon.discountValue} FLAT`}
                      </span>
                    </td>

                    <td style={{ fontSize: "12px" }}>
                      <div>Min: ₹{coupon.minOrderAmount || 0}</div>
                      {isPercentage && coupon.maxDiscountAmount && (
                        <div style={{ color: "#64748b" }}>Max Cap: ₹{coupon.maxDiscountAmount}</div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: "12.5px", fontWeight: 700 }}>
                        {coupon.usedCount || 0} / {coupon.totalUsageLimit || "∞"}
                      </div>
                      <small style={{ color: "#94a3b8" }}>Limit: {coupon.perUserLimit}/user</small>
                    </td>

                    <td style={{ fontSize: "11.5px", color: "#64748b" }}>
                      {coupon.expiryDate
                        ? new Date(coupon.expiryDate).toLocaleDateString("en-IN")
                        : "No Expiry"}
                    </td>

                    <td>
                      <span
                        className={`status-badge-glow ${coupon.isActive !== false ? "status-active" : "status-inactive"}`}
                      >
                        <span className="status-dot"></span>
                        {coupon.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          className="btn-ticket-action"
                          onClick={() => handleOpenUsages(coupon)}
                          title="View Usages"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          className="btn-ticket-action"
                          onClick={() => handleOpenEdit(coupon)}
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn-ticket-action danger"
                          onClick={() => handleDelete(coupon)}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          LUXURY CREATE / EDIT COUPON MODAL WITH LIVE INTERACTIVE PREVIEW
          ========================================================================= */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowFormModal(false)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: "820px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box">
                  <Ticket size={24} />
                </div>
                <div className="header-texts">
                  <h2>{editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : "Create Promotional Coupon"}</h2>
                  <p>Configure percentage or flat rebate rules, cart thresholds, and customer limits</p>
                </div>
              </div>
              <button
                className="header-close-btn"
                onClick={() => !submitting && setShowFormModal(false)}
              >
                ×
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit}>
              <div
                className="luxury-modal-body"
                style={{ maxHeight: "72vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px", padding: "20px 24px" }}
              >
                {/* Live Card Preview Box */}
                <div className="coupon-live-preview-box">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sparkles size={13} color="#f59e0b" /> Live Customer Voucher Ticket Preview
                    </span>
                    <button
                      type="button"
                      className="preset-chip-btn"
                      onClick={handleGenerateCode}
                      title="Auto-Generate Promo Code"
                      style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fef3c7", borderColor: "rgba(245, 158, 11, 0.4)" }}
                    >
                      <Wand2 size={12} /> 🎲 Generate Code
                    </button>
                  </div>

                  <div className="preview-ticket-visual">
                    <span className="preview-ticket-badge">
                      {formData.discountType === "PERCENTAGE"
                        ? `${formData.discountValue || 0}% OFF`
                        : `₹${formData.discountValue || 0} FLAT`}
                    </span>
                    <strong style={{ fontSize: "20px", color: "#fef3c7", fontFamily: "JetBrains Mono, monospace", letterSpacing: "1px" }}>
                      {formData.code || "COUPON_CODE"}
                    </strong>
                    <span style={{ fontSize: "14px", color: "#f8fafc", fontWeight: 600 }}>
                      {formData.title || "Promotional Title"}
                    </span>
                    <div style={{ fontSize: "11.5px", color: "#cbd5e1", display: "flex", gap: "12px", marginTop: "4px" }}>
                      <span>Min Order: <strong>₹{Number(formData.minOrderAmount || 0).toLocaleString("en-IN")}</strong></span>
                      <span>•</span>
                      <span>
                        {formData.discountType === "PERCENTAGE" && formData.maxDiscountAmount
                          ? `Max Cap: ₹${formData.maxDiscountAmount}`
                          : "No Discount Cap"}
                      </span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700 }}>
                      Popular B2B Quick Presets:
                    </span>
                    <div className="coupon-preset-strip">
                      <button
                        type="button"
                        className="preset-chip-btn"
                        onClick={() => handleApplyPreset("PERCENTAGE", 10, 500, "10% Off Orders Above ₹500")}
                      >
                        ⚡ 10% Off (Min ₹500)
                      </button>
                      <button
                        type="button"
                        className="preset-chip-btn"
                        onClick={() => handleApplyPreset("PERCENTAGE", 15, 2000, "15% Off Bulk Building Materials")}
                      >
                        ⚡ 15% Bulk Off
                      </button>
                      <button
                        type="button"
                        className="preset-chip-btn"
                        onClick={() => handleApplyPreset("FIXED_AMOUNT", 100, 999, "Welcome Bonus - ₹100 Off")}
                      >
                        ⚡ ₹100 Flat (Min ₹999)
                      </button>
                      <button
                        type="button"
                        className="preset-chip-btn"
                        onClick={() => handleApplyPreset("FIXED_AMOUNT", 500, 5000, "₹500 Flat Wholesale Rebate")}
                      >
                        ⚡ ₹500 Wholesale Flat
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 1: Coupon Identity */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <Tag size={16} /> 1. Coupon Identity & Details
                  </div>

                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>
                        <span>Coupon Code *</span>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Auto Uppercase</span>
                      </label>
                      <div className="input-with-action">
                        <input
                          type="text"
                          placeholder="e.g. SAVE10, MEGAFEST"
                          maxLength={50}
                          required
                          value={formData.code}
                          onChange={(e) =>
                            setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, "") })
                          }
                        />
                      </div>
                    </div>

                    <div className="input-field-wrap">
                      <label>
                        <span>Display Title *</span>
                        <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>Max 150 chars</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 10% Off All Orders"
                        maxLength={150}
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>

                    <div className="input-field-wrap full-width">
                      <label>Description (Optional)</label>
                      <textarea
                        placeholder="Short terms or promotional highlights (max 500 chars)..."
                        maxLength={500}
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Discount Type & Value */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <Percent size={16} /> 2. Discount Type & Calculations
                  </div>

                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Discount Type *</label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setFormData({
                            ...formData,
                            discountType: newType,
                            maxDiscountAmount: newType === "FIXED_AMOUNT" ? "" : formData.maxDiscountAmount,
                          });
                        }}
                      >
                        <option value="PERCENTAGE">PERCENTAGE (1–100%)</option>
                        <option value="FIXED_AMOUNT">FIXED AMOUNT (Flat ₹)</option>
                      </select>
                    </div>

                    <div className="input-field-wrap">
                      <label>
                        {formData.discountType === "PERCENTAGE"
                          ? "Discount Percentage (%) *"
                          : "Discount Amount (₹) *"}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={formData.discountType === "PERCENTAGE" ? "100" : undefined}
                        step="0.01"
                        required
                        placeholder={formData.discountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 100"}
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      />
                    </div>

                    <div className="input-field-wrap">
                      <label>Minimum Cart Value (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0 = No minimum required"
                        value={formData.minOrderAmount}
                        onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                      />
                    </div>

                    <div className="input-field-wrap">
                      <label>
                        <span>Max Discount Cap (₹)</span>
                        {formData.discountType === "FIXED_AMOUNT" && (
                          <span style={{ color: "#ef4444", fontSize: "10.5px" }}>
                            Disabled for Flat Rebate
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder={formData.discountType === "FIXED_AMOUNT" ? "Not applicable" : "e.g. 200"}
                        disabled={formData.discountType === "FIXED_AMOUNT"}
                        value={formData.maxDiscountAmount}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Redemptions & Schedule */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <Users size={16} /> 3. Redemptions & Schedule
                  </div>

                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Total Usage Limit across all users</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Blank = Unlimited redemptions"
                        value={formData.totalUsageLimit}
                        onChange={(e) => setFormData({ ...formData, totalUsageLimit: e.target.value })}
                      />
                    </div>

                    <div className="input-field-wrap">
                      <label>Per Customer Limit</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Default: 1 use per customer"
                        value={formData.perUserLimit}
                        onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                      />
                    </div>

                    <div className="input-field-wrap">
                      <label>Start Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      />
                    </div>

                    <div className="input-field-wrap">
                      <label>Expiry Date & Time</label>
                      <input
                        type="datetime-local"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                      />
                    </div>

                    <div className="input-field-wrap full-width" style={{ marginTop: "4px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div
                          className={`custom-switch-label ${formData.firstOrderOnly ? "active" : ""}`}
                          onClick={() => setFormData({ ...formData, firstOrderOnly: !formData.firstOrderOnly })}
                        >
                          <div className="switch-toggle-box"></div>
                          <div>
                            <strong style={{ fontSize: "12.5px", color: "#0f172a", display: "block" }}>
                              First Order Only
                            </strong>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              Only valid on customer's first checkout
                            </span>
                          </div>
                        </div>

                        <div
                          className={`custom-switch-label ${formData.isActive ? "active" : ""}`}
                          onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        >
                          <div className="switch-toggle-box"></div>
                          <div>
                            <strong style={{ fontSize: "12.5px", color: "#0f172a", display: "block" }}>
                              Active Immediately
                            </strong>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              Enable voucher for storefront checkout
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="luxury-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={submitting}
                  onClick={() => setShowFormModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={submitting}>
                  {submitting ? "Saving..." : editingCoupon ? "Update Coupon" : "Publish Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          COUPON USAGES / AUDIT TRAIL MODAL
          ========================================================================= */}
      {selectedCouponUsages && (
        <div className="modal-overlay" onClick={() => setSelectedCouponUsages(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: "720px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box">
                  <Users size={22} />
                </div>
                <div className="header-texts">
                  <h2>Redemption History: {selectedCouponUsages.code}</h2>
                  <p>Audit trail of all customer purchases using this voucher</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setSelectedCouponUsages(null)}>
                ×
              </button>
            </div>

            <div className="luxury-modal-body" style={{ maxHeight: "60vh", overflowY: "auto", padding: "16px 20px" }}>
              {loadingUsages ? (
                <div className="loading-state-container">
                  <div className="spinner"></div>
                  <p>Fetching redemptions...</p>
                </div>
              ) : usagesList.length === 0 ? (
                <div className="empty-table-content" style={{ padding: "36px 16px" }}>
                  <Users size={40} color="#94a3b8" />
                  <h4>No redemptions yet</h4>
                  <p>This coupon has not been applied to any checkout orders so far.</p>
                </div>
              ) : (
                <table className="usages-history-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Order ID</th>
                      <th>Discount Given</th>
                      <th>Used Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usagesList.map((usage, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{usage.customerName || `Customer #${usage.customerId}`}</strong>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>ID: {usage.customerId}</div>
                        </td>
                        <td>
                          <span className="font-mono" style={{ color: "#2563eb", fontWeight: 700 }}>
                            {usage.orderNumber || `#${usage.orderId}`}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "#059669" }}>
                            ₹{Number(usage.discountApplied || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td style={{ fontSize: "11.5px", color: "#64748b" }}>
                          {usage.usedAt ? new Date(usage.usedAt).toLocaleString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="luxury-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedCouponUsages(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          409 REDEEMED CONFLICT MODAL
          ========================================================================= */}
      {redeemedConflictCoupon && (
        <div className="modal-overlay" onClick={() => setRedeemedConflictCoupon(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header" style={{ background: "#7f1d1d" }}>
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "#991b1b" }}>
                  <ShieldAlert size={22} color="#fef2f2" />
                </div>
                <div className="header-texts">
                  <h2 style={{ color: "#fef2f2" }}>Cannot Delete Redeemed Coupon</h2>
                  <p style={{ color: "#fecaca" }}>Audit Compliance Policy (Status 409)</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setRedeemedConflictCoupon(null)}>
                ×
              </button>
            </div>

            <div className="luxury-modal-body" style={{ padding: "20px" }}>
              <p style={{ fontSize: "13.5px", color: "#334155", lineHeight: 1.5 }}>
                Coupon <strong>"{redeemedConflictCoupon.code}"</strong> has already been used in completed buyer orders.
              </p>
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px 14px",
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  color: "#92400e",
                }}
              >
                A redeemed coupon cannot be permanently deleted from the database to preserve historical accounting and invoice records.
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button className="btn-secondary" onClick={() => setRedeemedConflictCoupon(null)}>
                Cancel
              </button>
              <button
                className="btn-bulk-action danger"
                style={{ padding: "8px 16px" }}
                onClick={handleDeactivateRedeemed}
              >
                Deactivate Coupon Instead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
