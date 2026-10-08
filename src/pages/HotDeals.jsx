import { useState, useEffect, useMemo, useRef } from "react";
import {
  Flame,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  AlertTriangle,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Check,
  X,
  IndianRupee,
} from "lucide-react";
import {
  getHotDeals,
  addHotDeal,
  toggleHotDealStatus,
  reorderHotDeals,
  updateHotDeal,
  deleteHotDeal,
  searchProductsForHotDeals,
} from "../api/hotDealApi";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/hotDeals.css";

export default function HotDeals() {
  const toast = useToast();

  const [hotDeals, setHotDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | INACTIVE
  const [viewMode, setViewMode] = useState("grid"); // grid | table

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null); // deal object
  const [deleteConfirmDeal, setDeleteConfirmDeal] = useState(null); // deal object

  // Add Deal Modal Form State
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addDisplayOrder, setAddDisplayOrder] = useState("");
  const [addActive, setAddActive] = useState(true);
  const [addConflictError, setAddConflictError] = useState("");
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Deal Modal Form State
  const [editDisplayOrder, setEditDisplayOrder] = useState(1);
  const [editActive, setEditActive] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reorder loading state
  const [reordering, setReordering] = useState(false);

  // Load Hot Deals
  const fetchDeals = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const data = await getHotDeals();
      setHotDeals(data);
    } catch (err) {
      console.error("Failed to load hot deals:", err);
      toast.error("Could not retrieve hot deals from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  // Debounced Product Search for Add Modal (Endpoint 7)
  const searchTimeoutRef = useRef(null);
  useEffect(() => {
    if (!showAddModal) {
      setProductSearchResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await searchProductsForHotDeals(productSearchQuery, 0, 10);
        setProductSearchResults(res.content || []);
      } catch (err) {
        console.error("Product search failed:", err);
      } finally {
        setSearchingProducts(false);
      }
    }, 280);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [productSearchQuery, showAddModal]);

  // Open Add Modal
  const handleOpenAddModal = async () => {
    setSelectedProduct(null);
    setProductSearchQuery("");
    setAddConflictError("");
    setAddActive(true);
    // Suggest next available display order
    const nextOrder = hotDeals.length > 0 ? Math.max(...hotDeals.map((d) => d.displayOrder || 0)) + 1 : 1;
    setAddDisplayOrder(nextOrder);
    setShowAddModal(true);

    // Immediately fetch full catalog of products
    setSearchingProducts(true);
    try {
      const res = await searchProductsForHotDeals("", 0, 50);
      setProductSearchResults(res.content || []);
    } catch (err) {
      console.error("Initial product load failed:", err);
    } finally {
      setSearchingProducts(false);
    }
  };

  // Submit Add Hot Deal (Endpoint 2)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Please select an existing product from the search results");
      return;
    }

    setSubmittingAdd(true);
    setAddConflictError("");

    try {
      await addHotDeal({
        productId: selectedProduct.productId,
        displayOrder: addDisplayOrder ? Number(addDisplayOrder) : undefined,
        active: addActive,
        productDetails: selectedProduct,
      });

      toast.success(`"${selectedProduct.name}" added to Hot Deals successfully!`);
      setShowAddModal(false);
      await fetchDeals(false);
    } catch (err) {
      console.error("Error adding hot deal:", err);
      if (err.status === 409 || err.message?.includes("already in Hot Deals") || err.message?.includes("Conflict")) {
        setAddConflictError(err.message || `Product with ID ${selectedProduct.productId} is already in Hot Deals`);
      } else if (err.status === 404) {
        setAddConflictError(err.message || `Product not found with id: ${selectedProduct.productId}`);
      } else {
        toast.error(err.message || "Failed to add product to Hot Deals");
      }
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Modal (Endpoint 5)
  const handleOpenEditModal = (deal) => {
    setShowEditModal(deal);
    setEditDisplayOrder(deal.displayOrder);
    setEditActive(deal.active);
  };

  // Submit Edit Hot Deal (Endpoint 5)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!showEditModal) return;

    setSubmittingEdit(true);
    try {
      await updateHotDeal(showEditModal.id, {
        displayOrder: Number(editDisplayOrder),
        active: editActive,
      });

      toast.success("Hot deal updated successfully!");
      setShowEditModal(null);
      await fetchDeals(false);
    } catch (err) {
      console.error("Error updating hot deal:", err);
      toast.error(err.message || "Failed to update hot deal");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Quick Toggle Status (Endpoint 3)
  const handleToggleStatus = async (deal) => {
    const nextStatus = !deal.active;
    // Optimistic UI update
    setHotDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, active: nextStatus } : d))
    );

    try {
      await toggleHotDealStatus(deal.id, nextStatus);
      toast.success(
        `Hot deal ${nextStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (err) {
      console.error("Error toggling hot deal status:", err);
      toast.error("Failed to update status on server. Reverting change.");
      // Rollback
      setHotDeals((prev) =>
        prev.map((d) => (d.id === deal.id ? { ...d, active: deal.active } : d))
      );
    }
  };

  // Batch Reorder: Move Up / Down (Endpoint 4)
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= hotDeals.length) return;

    const updatedList = [...hotDeals];
    const currentItem = updatedList[index];
    const targetItem = updatedList[targetIndex];

    // Swap orders
    const currentOrder = currentItem.displayOrder;
    const targetOrder = targetItem.displayOrder;

    currentItem.displayOrder = targetOrder;
    targetItem.displayOrder = currentOrder;

    // Swap positions
    updatedList[index] = targetItem;
    updatedList[targetIndex] = currentItem;

    setHotDeals(updatedList);
    setReordering(true);

    try {
      const itemsPayload = updatedList.map((d, idx) => ({
        id: d.id,
        displayOrder: idx + 1,
      }));

      // Adjust locally
      itemsPayload.forEach((it) => {
        const item = updatedList.find((d) => d.id === it.id);
        if (item) item.displayOrder = it.displayOrder;
      });

      await reorderHotDeals(itemsPayload);
      toast.success("Hot Deals sequence updated successfully");
      await fetchDeals(false);
    } catch (err) {
      console.error("Failed to reorder deals:", err);
      toast.error("Failed to persist order on server");
      await fetchDeals(false);
    } finally {
      setReordering(false);
    }
  };

  // Delete Hot Deal (Endpoint 6)
  const handleDeleteDeal = async () => {
    if (!deleteConfirmDeal) return;

    try {
      await deleteHotDeal(deleteConfirmDeal.id);
      toast.success(
        `"${deleteConfirmDeal.productName}" removed from Hot Deals`
      );
      setDeleteConfirmDeal(null);
      await fetchDeals(false);
    } catch (err) {
      console.error("Error removing hot deal:", err);
      toast.error(err.message || "Failed to remove hot deal");
    }
  };

  // Filtered Deals
  const filteredDeals = useMemo(() => {
    let list = [...hotDeals];

    if (statusFilter === "ACTIVE") {
      list = list.filter((d) => d.active);
    } else if (statusFilter === "INACTIVE") {
      list = list.filter((d) => !d.active);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.productName.toLowerCase().includes(q) ||
          String(d.productId).includes(q) ||
          (d.product?.categoryName || "").toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }, [hotDeals, statusFilter, search]);

  // Metrics
  const metrics = useMemo(() => {
    const total = hotDeals.length;
    const activeCount = hotDeals.filter((d) => d.active).length;
    const inactiveCount = total - activeCount;
    const nextOrder = total > 0 ? Math.max(...hotDeals.map((d) => d.displayOrder || 0)) + 1 : 1;
    return { total, activeCount, inactiveCount, nextOrder };
  }, [hotDeals]);

  return (
    <div className="hot-deals-page">
      {/* --------------------------------------------------------------------
          PAGE HEADER
          -------------------------------------------------------------------- */}
      <div className="hot-deals-header">
        <div>
          <span className="hot-deals-eyebrow">
            <Flame size={14} className="text-orange-500" />
            Promotions & Merchandising
          </span>
          <h1 className="hot-deals-title">Hot Deals Management</h1>
          <p className="hot-deals-subtitle">
            Curate and spotlight flagship products on the buyer homepage Hot Deals carousel.
          </p>
        </div>

        <div className="hot-deals-header-actions">
          <button
            className="btn-hot-secondary"
            onClick={() => fetchDeals()}
            disabled={loading || reordering}
            title="Refresh List"
          >
            <RotateCcw size={15} className={loading ? "animate-spin" : ""} />
            Sync
          </button>
          <button className="btn-hot-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            Add Product to Hot Deals
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          METRICS CARDS
          -------------------------------------------------------------------- */}
      <div className="hot-deals-stats">
        <div className="hot-deal-stat-card">
          <div className="hot-deal-stat-icon orange">
            <Flame size={22} />
          </div>
          <div className="hot-deal-stat-meta">
            <span>Total Hot Deals</span>
            <strong>{metrics.total}</strong>
          </div>
        </div>

        <div className="hot-deal-stat-card">
          <div className="hot-deal-stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div className="hot-deal-stat-meta">
            <span>Active Deals</span>
            <strong>{metrics.activeCount}</strong>
          </div>
        </div>

        <div className="hot-deal-stat-card">
          <div className="hot-deal-stat-icon gray">
            <XCircle size={22} />
          </div>
          <div className="hot-deal-stat-meta">
            <span>Inactive Deals</span>
            <strong>{metrics.inactiveCount}</strong>
          </div>
        </div>

        <div className="hot-deal-stat-card">
          <div className="hot-deal-stat-icon purple">
            <Layers size={22} />
          </div>
          <div className="hot-deal-stat-meta">
            <span>Next Display Order</span>
            <strong>#{metrics.nextOrder}</strong>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          TOOLBAR
          -------------------------------------------------------------------- */}
      <div className="hot-deals-toolbar">
        <div className="hot-deals-search-filter">
          <div className="hot-deals-search-input">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search by product name, ID, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="hot-deals-filter-tabs">
            <button
              className={`hot-deals-filter-btn ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              All ({metrics.total})
            </button>
            <button
              className={`hot-deals-filter-btn ${statusFilter === "ACTIVE" ? "active" : ""}`}
              onClick={() => setStatusFilter("ACTIVE")}
            >
              Active ({metrics.activeCount})
            </button>
            <button
              className={`hot-deals-filter-btn ${statusFilter === "INACTIVE" ? "active" : ""}`}
              onClick={() => setStatusFilter("INACTIVE")}
            >
              Inactive ({metrics.inactiveCount})
            </button>
          </div>
        </div>

        <div className="hot-deals-actions-right">
          <div className="view-toggle-group">
            <button
              className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <TableIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          CONTENT LIST / EMPTY STATE
          -------------------------------------------------------------------- */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
          <p style={{ color: "#64748b", fontSize: "14px" }}>Loading hot deals catalog...</p>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: "14px",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <Flame size={48} style={{ color: "#ea580c", margin: "0 auto 12px", opacity: 0.8 }} />
          <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "6px" }}>
            No Hot Deals Found
          </h3>
          <p style={{ color: "#64748b", fontSize: "13px", maxWidth: "420px", margin: "0 auto 18px" }}>
            {search || statusFilter !== "ALL"
              ? "No deals matched your search criteria. Try adjusting your filters."
              : "No products are currently featured in the Hot Deals carousel. Select a product to launch the deal!"}
          </p>
          <button className="btn-hot-primary" onClick={handleOpenAddModal}>
            <Plus size={16} />
            Add First Hot Deal
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="hot-deals-grid">
          {filteredDeals.map((deal, index) => {
            const prod = deal.product || {};
            const discountPercent =
              prod.mrp && prod.price && prod.mrp > prod.price
                ? Math.round(((prod.mrp - prod.price) / prod.mrp) * 100)
                : 0;

            return (
              <div
                key={deal.id}
                className={`hot-deal-card ${!deal.active ? "inactive" : ""}`}
              >
                <div className="hot-deal-card-header">
                  {prod.imageUrl ? (
                    <img
                      src={prod.imageUrl}
                      alt={deal.productName}
                      className="hot-deal-card-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80";
                      }}
                    />
                  ) : (
                    <Package size={42} style={{ color: "#94a3b8" }} />
                  )}

                  <div className="hot-deal-order-badge">
                    <Flame size={12} style={{ color: "#f97316" }} />
                    Order #{deal.displayOrder}
                  </div>

                  <div
                    className={`hot-deal-status-pill ${
                      deal.active ? "active" : "inactive"
                    }`}
                  >
                    {deal.active ? "Active" : "Inactive"}
                  </div>
                </div>

                <div className="hot-deal-card-body">
                  <div className="hot-deal-card-category">
                    {prod.categoryName || "General"}
                  </div>
                  <h3 className="hot-deal-card-title" title={deal.productName}>
                    {deal.productName}
                  </h3>
                  {prod.description && (
                    <p className="hot-deal-card-desc">{prod.description}</p>
                  )}

                  <div className="hot-deal-pricing-row">
                    <span className="hot-deal-price">
                      ₹{Number(prod.price || 0).toLocaleString("en-IN")}
                    </span>
                    {prod.mrp && prod.mrp > prod.price && (
                      <span className="hot-deal-mrp">
                        ₹{Number(prod.mrp).toLocaleString("en-IN")}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="hot-deal-discount-badge">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  <div className="hot-deal-card-meta">
                    <span>Product ID: #{deal.productId}</span>
                    <span>Stock: {prod.stockQuantity ?? 0} units</span>
                  </div>
                </div>

                <div className="hot-deal-card-actions">
                  <div className="order-arrows-group">
                    <button
                      className="btn-arrow"
                      disabled={index === 0 || reordering}
                      onClick={() => handleMoveOrder(index, "up")}
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      className="btn-arrow"
                      disabled={index === filteredDeals.length - 1 || reordering}
                      onClick={() => handleMoveOrder(index, "down")}
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className="deal-card-buttons">
                    <label
                      className="toggle-switch"
                      title={deal.active ? "Disable Deal" : "Enable Deal"}
                    >
                      <input
                        type="checkbox"
                        checked={deal.active}
                        onChange={() => handleToggleStatus(deal)}
                      />
                      <span className="toggle-slider"></span>
                    </label>

                    <button
                      className="btn-arrow"
                      onClick={() => handleOpenEditModal(deal)}
                      title="Edit Deal"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      className="btn-arrow"
                      onClick={() => setDeleteConfirmDeal(deal)}
                      title="Remove Deal"
                      style={{ color: "#ef4444" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="hot-deals-table-container">
          <table className="hot-deals-table">
            <thead>
              <tr>
                <th style={{ width: "90px" }}>Order</th>
                <th>Product</th>
                <th>Category</th>
                <th>Price / MRP</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeals.map((deal, index) => {
                const prod = deal.product || {};
                const discountPercent =
                  prod.mrp && prod.price && prod.mrp > prod.price
                    ? Math.round(((prod.mrp - prod.price) / prod.mrp) * 100)
                    : 0;

                return (
                  <tr key={deal.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontWeight: "700",
                            fontSize: "12px",
                            color: "#ea580c",
                            background: "#fff7ed",
                            padding: "3px 7px",
                            borderRadius: "5px",
                          }}
                        >
                          #{deal.displayOrder}
                        </span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <button
                            className="btn-arrow"
                            style={{ width: "20px", height: "20px" }}
                            disabled={index === 0 || reordering}
                            onClick={() => handleMoveOrder(index, "up")}
                            title="Move Up"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            className="btn-arrow"
                            style={{ width: "20px", height: "20px" }}
                            disabled={index === filteredDeals.length - 1 || reordering}
                            onClick={() => handleMoveOrder(index, "down")}
                            title="Move Down"
                          >
                            <ArrowDown size={11} />
                          </button>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="table-product-cell">
                        <img
                          src={
                            prod.imageUrl ||
                            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100"
                          }
                          alt={deal.productName}
                          className="table-product-thumb"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100";
                          }}
                        />
                        <div className="table-product-info">
                          <span className="table-product-title" title={deal.productName}>
                            {deal.productName}
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            Product ID: #{deal.productId}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="table-product-category">
                        {prod.categoryName || "General"}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                        <strong style={{ color: "#0f172a" }}>
                          ₹{Number(prod.price || 0).toLocaleString("en-IN")}
                        </strong>
                        {prod.mrp && prod.mrp > prod.price && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "#94a3b8",
                              textDecoration: "line-through",
                            }}
                          >
                            ₹{Number(prod.mrp).toLocaleString("en-IN")}
                          </span>
                        )}
                        {discountPercent > 0 && (
                          <span className="hot-deal-discount-badge">
                            {discountPercent}%
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: (prod.stockQuantity ?? 0) > 0 ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {prod.stockQuantity ?? 0} in stock
                      </span>
                    </td>

                    <td>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={deal.active}
                          onChange={() => handleToggleStatus(deal)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          className="btn-arrow"
                          onClick={() => handleOpenEditModal(deal)}
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn-arrow"
                          style={{ color: "#ef4444" }}
                          onClick={() => setDeleteConfirmDeal(deal)}
                          title="Remove Deal"
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

      {/* --------------------------------------------------------------------
          MODAL 1: ADD PRODUCT TO HOT DEALS (ENDPOINT 2 & 7)
          -------------------------------------------------------------------- */}
      {showAddModal && (
        <div className="hot-deal-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="hot-deal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hot-deal-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Flame size={20} style={{ color: "#ea580c" }} />
                <h3>Add Product to Hot Deals</h3>
              </div>
              <button
                className="btn-arrow"
                onClick={() => setShowAddModal(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="hot-deal-modal-body">
                {/* 409 Conflict Error Notification */}
                {addConflictError && (
                  <div className="conflict-alert">
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
                    <div>
                      <strong>Duplicate Product Conflict:</strong>
                      <div style={{ marginTop: "2px" }}>{addConflictError}</div>
                    </div>
                  </div>
                )}

                {/* Step 1: Search Existing Products (API 7) */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    1. Search & Select Existing Product *
                  </label>

                  {!selectedProduct ? (
                    <div>
                      <div className="product-search-box">
                        <Search size={16} style={{ color: "#94a3b8" }} />
                        <input
                          type="text"
                          placeholder="Search product by name, keyword, or ID (e.g. Samsung)..."
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          autoFocus
                        />
                        {searchingProducts && (
                          <div
                            className="spinner"
                            style={{ width: "16px", height: "16px", borderWidth: "2px" }}
                          ></div>
                        )}
                      </div>

                      {/* Search Dropdown Results */}
                      <div style={{ marginTop: "10px" }}>
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#64748b",
                            marginBottom: "6px",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>SELECT FROM CATALOG ({productSearchResults.length})</span>
                          <span>Click a product to choose</span>
                        </div>

                        {searchingProducts ? (
                          <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "12px" }}>
                            <div className="spinner" style={{ width: "20px", height: "20px", margin: "0 auto 8px" }}></div>
                            Loading products from catalog...
                          </div>
                        ) : productSearchResults.length > 0 ? (
                          <div className="product-dropdown-list" style={{ maxHeight: "260px" }}>
                            {productSearchResults.map((prod) => {
                              const alreadyFeatured = hotDeals.some(
                                (d) => Number(d.productId) === Number(prod.productId)
                              );

                              return (
                                <div
                                  key={prod.productId}
                                  className={`product-dropdown-item ${alreadyFeatured ? "already-featured" : ""}`}
                                  style={{
                                    opacity: alreadyFeatured ? 0.65 : 1,
                                    cursor: alreadyFeatured ? "not-allowed" : "pointer",
                                    background: alreadyFeatured ? "#f8fafc" : undefined,
                                  }}
                                  onClick={() => {
                                    if (alreadyFeatured) {
                                      setAddConflictError(`Product with ID ${prod.productId} is already in Hot Deals`);
                                      return;
                                    }
                                    setSelectedProduct(prod);
                                    setAddConflictError("");
                                  }}
                                >
                                  <img
                                    src={
                                      prod.imageUrl ||
                                      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80"
                                    }
                                    alt={prod.name}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src =
                                        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=80";
                                    }}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        color: "#0f172a",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      <span>{prod.name}</span>
                                      {alreadyFeatured && (
                                        <span
                                          style={{
                                            fontSize: "10px",
                                            fontWeight: 800,
                                            color: "#ea580c",
                                            background: "#fff7ed",
                                            border: "1px solid #fed7aa",
                                            padding: "1px 5px",
                                            borderRadius: "4px",
                                          }}
                                        >
                                          🔥 In Hot Deals
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#64748b",
                                        display: "flex",
                                        gap: "10px",
                                        marginTop: "2px",
                                      }}
                                    >
                                      <span>ID: #{prod.productId}</span>
                                      <span>Category: {prod.categoryName}</span>
                                      <strong style={{ color: "#0f172a" }}>
                                        ₹{Number(prod.price).toLocaleString("en-IN")}
                                      </strong>
                                      <span>Stock: {prod.stockQuantity ?? 0}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              padding: "16px",
                              textAlign: "center",
                              background: "#f8fafc",
                              borderRadius: "8px",
                              border: "1px dashed #cbd5e1",
                            }}
                          >
                            No products found matching "{productSearchQuery}".
                          </div>
                        )}
                      </div>

                      {productSearchQuery &&
                        !searchingProducts &&
                        productSearchResults.length === 0 && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              padding: "10px",
                              textAlign: "center",
                            }}
                          >
                            No products found matching "{productSearchQuery}".
                          </div>
                        )}
                    </div>
                  ) : (
                    /* Selected Product Card */
                    <div className="product-selected-preview">
                      <img
                        src={
                          selectedProduct.imageUrl ||
                          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100"
                        }
                        alt={selectedProduct.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100";
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#ea580c",
                            textTransform: "uppercase",
                          }}
                        >
                          {selectedProduct.categoryName}
                        </span>
                        <h4
                          style={{
                            margin: "2px 0 4px",
                            fontSize: "14px",
                            fontWeight: "700",
                            color: "#0f172a",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {selectedProduct.name}
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            fontSize: "12px",
                            color: "#64748b",
                          }}
                        >
                          <span>Product ID: #{selectedProduct.productId}</span>
                          <strong style={{ color: "#0f172a" }}>
                            ₹{Number(selectedProduct.price).toLocaleString("en-IN")}
                          </strong>
                          <span>Stock: {selectedProduct.stockQuantity ?? 0}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-arrow"
                        onClick={() => setSelectedProduct(null)}
                        title="Change Product"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 2: Display Order (Optional) */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    2. Display Order (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="product-search-box"
                    style={{ width: "100%", padding: "10px 14px", fontSize: "14px" }}
                    value={addDisplayOrder}
                    onChange={(e) => setAddDisplayOrder(e.target.value)}
                    placeholder="Defaults to next available sequence (e.g. 1)"
                  />
                  <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    Lower numbers appear first in the customer Hot Deals carousel.
                  </small>
                </div>

                {/* Step 3: Active Status (Optional) */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    3. Deal Visibility
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                        Active on Marketplace
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Deal is immediately visible to buyers if enabled
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={addActive}
                        onChange={(e) => setAddActive(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="hot-deal-modal-footer">
                <button
                  type="button"
                  className="btn-hot-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-hot-primary"
                  disabled={!selectedProduct || submittingAdd}
                >
                  {submittingAdd ? "Adding Deal..." : "Confirm & Add Hot Deal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          MODAL 2: EDIT HOT DEAL (ENDPOINT 5)
          -------------------------------------------------------------------- */}
      {showEditModal && (
        <div className="hot-deal-modal-backdrop" onClick={() => setShowEditModal(null)}>
          <div className="hot-deal-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hot-deal-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Edit2 size={18} style={{ color: "#ea580c" }} />
                <h3>Update Hot Deal #{showEditModal.id}</h3>
              </div>
              <button
                className="btn-arrow"
                onClick={() => setShowEditModal(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="hot-deal-modal-body">
                {/* Product Info Display */}
                <div className="product-selected-preview">
                  <img
                    src={
                      showEditModal.product?.imageUrl ||
                      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100"
                    }
                    alt={showEditModal.productName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100";
                    }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#ea580c",
                        textTransform: "uppercase",
                      }}
                    >
                      {showEditModal.product?.categoryName || "General"}
                    </span>
                    <h4
                      style={{
                        margin: "2px 0",
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "#0f172a",
                      }}
                    >
                      {showEditModal.productName}
                    </h4>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Product ID: #{showEditModal.productId}
                    </span>
                  </div>
                </div>

                {/* Display Order */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Display Sequence Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="product-search-box"
                    style={{ width: "100%", padding: "10px 14px", fontSize: "14px" }}
                    value={editDisplayOrder}
                    onChange={(e) => setEditDisplayOrder(e.target.value)}
                    required
                  />
                </div>

                {/* Active Toggle */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#334155",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Deal Visibility Status
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                        {editActive ? "Currently Active" : "Currently Inactive"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Toggle to publish or unpublish this deal
                      </div>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="hot-deal-modal-footer">
                <button
                  type="button"
                  className="btn-hot-secondary"
                  onClick={() => setShowEditModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-hot-primary"
                  disabled={submittingEdit}
                >
                  {submittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          MODAL 3: DELETE CONFIRMATION (ENDPOINT 6)
          -------------------------------------------------------------------- */}
      {deleteConfirmDeal && (
        <div className="hot-deal-modal-backdrop" onClick={() => setDeleteConfirmDeal(null)}>
          <div
            className="hot-deal-modal"
            style={{ maxWidth: "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="hot-deal-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Trash2 size={18} style={{ color: "#ef4444" }} />
                <h3>Remove from Hot Deals</h3>
              </div>
              <button
                className="btn-arrow"
                onClick={() => setDeleteConfirmDeal(null)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="hot-deal-modal-body">
              <p style={{ fontSize: "14px", color: "#334155", margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to remove{" "}
                <strong>"{deleteConfirmDeal.productName}"</strong> (Deal #{deleteConfirmDeal.id})
                from Hot Deals?
              </p>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#166534",
                }}
              >
                ℹ️ <strong>Note:</strong> This only removes the spotlight deal from the homepage
                carousel. It will <strong>NOT</strong> delete the actual product from the store catalog.
              </div>
            </div>

            <div className="hot-deal-modal-footer">
              <button
                className="btn-hot-secondary"
                onClick={() => setDeleteConfirmDeal(null)}
              >
                Cancel
              </button>
              <button
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  padding: "9px 16px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
                onClick={handleDeleteDeal}
              >
                Yes, Remove Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
