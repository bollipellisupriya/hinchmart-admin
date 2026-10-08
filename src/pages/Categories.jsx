import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RotateCcw,
  Package,
  FolderTree,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategoryActive,
  deleteCategory,
  getStoredCategories,
  normalizeCategory,
} from "../api/categoryApi";
import { useToast } from "../components/ToastContext";
import { subscribeDataUpdate } from "../api/dataStore";
import CategoryModal from "../components/CategoryModal";
import "../styles/pages.css";
import "../styles/categories.css";

export default function Categories() {
  const toast = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState(() => getStoredCategories().map(normalizeCategory));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTabFilter, setActiveTabFilter] = useState("ALL"); // ALL, ACTIVE, INACTIVE
  const [selectedIds, setSelectedIds] = useState([]);
  const selfTriggeredRef = useRef(false);

  const loadCategories = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const data = await getCategories();
      const list = Array.isArray(data) ? data : data.categories || data.data || [];
      setCategories(list);
    } catch (err) {
      console.error(err);
      setError("Unable to load categories from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    const unsubscribe = subscribeDataUpdate((event) => {
      if (event.entity === "categories") {
        // Skip refetch if this component itself triggered the update
        if (selfTriggeredRef.current) {
          selfTriggeredRef.current = false;
          return;
        }
        loadCategories(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setShowModal(true);
  };

  const handleToggleActivate = async (category) => {
    const id = category.categoryId || category.id || category._id;
    const currentActive = category.active ?? category.isActive ?? true;
    try {
      await toggleCategoryActive(id, category);
      setCategories((current) =>
        current.map((item) =>
          (item.categoryId || item.id || item._id) === id
            ? { ...item, active: !currentActive, isActive: !currentActive }
            : item
        )
      );
      if (currentActive) {
        toast.warning(`Category "${category.name}" deactivated.`);
      } else {
        toast.success(`Category "${category.name}" activated.`);
      }
    } catch (err) {
      toast.error("Failed to toggle category status.");
    }
  };

  const handleSubmit = async (form) => {
    try {
      setSubmitting(true);
      selfTriggeredRef.current = true;
      if (editingCategory) {
        const id = editingCategory.categoryId || editingCategory.id || editingCategory._id;
        const updated = await updateCategory(id, form);
        setCategories((prev) =>
          prev.map((c) => ((c.categoryId || c.id || c._id) === id ? { ...c, ...updated } : c))
        );
        toast.success(`Category "${form.name}" updated successfully.`);
      } else {
        const created = await createCategory(form);
        setCategories((prev) => [
          created,
          ...prev.filter((c) => String(c.categoryId || c.id) !== String(created.categoryId || created.id)),
        ]);
        toast.success(`Category "${form.name}" created successfully.`);
      }
      setShowModal(false);
      // Removed redundant loadCategories(false) — local state is already updated above
    } catch (err) {
      toast.error(err?.response?.data?.message || "Category operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    const id = category.categoryId || category.id || category._id;
    const confirmPrompt = `Are you sure you want to delete category "${category.name}"?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => String(c.categoryId || c.id || c._id) !== String(id)));
      setSelectedIds((prev) => prev.filter((i) => String(i) !== String(id)));
      toast.info(`Category "${category.name}" removed.`);
      await loadCategories(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to delete category.");
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredCategories.map((c) => c.categoryId || c.id || c._id));
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
    if (!selectedIds.length) return;
    try {
      for (const id of selectedIds) {
        const category = categories.find((c) => (c.categoryId || c.id || c._id) === id);
        if (category) {
          await updateCategory(id, { ...category, active: true, isActive: true });
        }
      }
      setCategories((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.categoryId || item.id || item._id)
            ? { ...item, active: true, isActive: true }
            : item
        )
      );
      toast.success(`Activated ${selectedIds.length} categories.`);
      setSelectedIds([]);
      await loadCategories(false);
    } catch (err) {
      toast.error("Failed to activate selected categories.");
    }
  };

  const handleBulkDeactivate = async () => {
    if (!selectedIds.length) return;
    try {
      for (const id of selectedIds) {
        const category = categories.find((c) => (c.categoryId || c.id || c._id) === id);
        if (category) {
          await updateCategory(id, { ...category, active: false, isActive: false });
        }
      }
      setCategories((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.categoryId || item.id || item._id)
            ? { ...item, active: false, isActive: false }
            : item
        )
      );
      toast.warning(`Deactivated ${selectedIds.length} categories.`);
      setSelectedIds([]);
      await loadCategories(false);
    } catch (err) {
      toast.error("Failed to deactivate selected categories.");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected categories permanently?`)) return;
    try {
      for (const id of selectedIds) {
        await deleteCategory(id);
      }
      setCategories((prev) =>
        prev.filter((item) => !selectedIds.includes(item.categoryId || item.id || item._id))
      );
      toast.info(`Deleted ${selectedIds.length} categories.`);
      setSelectedIds([]);
      await loadCategories(false);
    } catch (err) {
      toast.error("Failed to delete selected categories.");
    }
  };

  const handleExportCSV = () => {
    const exportList = selectedIds.length > 0
      ? categories.filter((c) => selectedIds.includes(c.categoryId || c.id || c._id))
      : filteredCategories;

    const headers = ["Category ID,Category Name,Slug,Description,Display Order,Active Status"];
    const rows = exportList.map((c) => [
      `"${c.categoryId || c.id || c._id}"`,
      `"${c.name || ""}"`,
      `"${c.slug || ""}"`,
      `"${(c.description || c.desc || "").replace(/"/g, '""')}"`,
      `"${c.sortOrder ?? c.displayOrder ?? 0}"`,
      `"${(c.active ?? c.isActive ?? true) ? "Active" : "Inactive"}"`,
    ].join(","));

    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_categories_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportList.length} categories to CSV.`);
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => {
      const matchesSearch =
        (category.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (category.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (category.slug || "").toLowerCase().includes(search.toLowerCase());

      const isActive = category.active ?? category.isActive ?? true;

      let matchesTab = true;
      if (activeTabFilter === "ACTIVE") matchesTab = isActive;
      if (activeTabFilter === "INACTIVE") matchesTab = !isActive;

      return matchesSearch && matchesTab;
    });
  }, [categories, search, activeTabFilter]);

  const activeCount = categories.filter((c) => c.active ?? c.isActive ?? true).length;

  return (
    <div className="categories-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="header-eyebrow">
            <FolderTree size={14} />
            <span>MARKETPLACE TAXONOMY & CATALOG</span>
          </div>
          <h1>Category Taxonomy</h1>
          <p>Organize marketplace navigation, product classification & catalog hierarchy</p>
        </div>

        <div className="page-header-actions">
          <button className="primary-button" onClick={openAddModal}>
            <Plus size={18} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Header Stats Strip */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${activeTabFilter === "ALL" ? "stat-pill-selected" : ""}`}
          onClick={() => setActiveTabFilter("ALL")}
          role="button"
          tabIndex={0}
        >
          <span className="stat-pill-label">Total Categories</span>
          <strong className="stat-pill-value">{categories.length}</strong>
        </div>
        <div
          className={`stat-pill active ${activeTabFilter === "ACTIVE" ? "stat-pill-selected" : ""}`}
          onClick={() => setActiveTabFilter("ACTIVE")}
          role="button"
          tabIndex={0}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Active Catalogs</span>
          <strong className="stat-pill-value">{activeCount}</strong>
        </div>
        <div
          className={`stat-pill ${activeTabFilter === "INACTIVE" ? "stat-pill-selected" : ""}`}
          onClick={() => setActiveTabFilter("INACTIVE")}
          role="button"
          tabIndex={0}
        >
          <span className="stat-pill-label">Inactive Categories</span>
          <strong className="stat-pill-value">
            {categories.length - activeCount}
          </strong>
        </div>
      </div>

      {/* Hierarchy Breadcrumb Navigator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          background: "#ffffff",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          marginBottom: "16px",
          fontSize: "12px",
          color: "#64748b",
        }}
      >
        <span style={{ fontWeight: 700, color: "#0f172a" }}>Hierarchy Flow:</span>
        <span
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "2px 8px",
            borderRadius: "6px",
            fontWeight: 800,
          }}
        >
          1. Categories ({categories.length}) [Active View]
        </span>
        <ChevronRight size={14} />
        <span
          style={{ cursor: "pointer", color: "#d97706", fontWeight: 600 }}
          onClick={() => navigate("/admin/brands")}
        >
          2. Brands
        </span>
        <ChevronRight size={14} />
        <span
          style={{ cursor: "pointer", color: "#0284c7", fontWeight: 600 }}
          onClick={() => navigate("/admin/specifications")}
        >
          3. Specifications
        </span>
        <ChevronRight size={14} />
        <span
          style={{ cursor: "pointer", color: "#64748b", fontWeight: 600 }}
          onClick={() => navigate("/admin/products")}
        >
          4. Products
        </span>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button onClick={loadCategories}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div className="content-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories by name, slug or description..."
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Strip */}
        {selectedIds.length > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-left">
              <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? "category" : "categories"} selected
            </div>
            <div className="bulk-right">
              <button
                className="btn-bulk-action success"
                onClick={handleBulkActivate}
                title="Activate selected categories"
              >
                <CheckCircle2 size={15} /> Activate
              </button>
              <button
                className="btn-bulk-action warning"
                onClick={handleBulkDeactivate}
                title="Deactivate selected categories"
              >
                <XCircle size={15} /> Deactivate
              </button>
              <button
                className="btn-bulk-action danger"
                onClick={handleBulkDelete}
                title="Delete selected categories"
              >
                <Trash2 size={15} /> Delete
              </button>
              <button
                className="btn-bulk-action"
                style={{ background: "#2563eb", color: "#ffffff" }}
                onClick={handleExportCSV}
                title="Export selected categories as CSV"
              >
                <Download size={15} /> Export CSV
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

        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading category catalog...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={
                        filteredCategories.length > 0 &&
                        selectedIds.length === filteredCategories.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ width: 80, textAlign: "center" }}>Thumbnail</th>
                  <th style={{ minWidth: 200 }}>Category Name</th>
                  <th style={{ minWidth: 220 }}>Description</th>
                  <th style={{ width: 120, textAlign: "center" }}>Display Order</th>
                  <th style={{ width: 130, textAlign: "center" }}>Active Status</th>
                  <th style={{ width: 120, textAlign: "center" }}>Live Toggle</th>
                  <th style={{ width: 100, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table">
                      <div className="empty-table-content">
                        <Package size={40} className="empty-icon" />
                        <h3>No categories found</h3>
                        <p>
                          {search
                            ? `No categories matching "${search}"`
                            : "Click Add Category to create one."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((category) => {
                    const id = category.categoryId || category.id || category._id;
                    const isActive = category.active ?? category.isActive ?? true;
                    const isSelected = selectedIds.includes(id);

                    return (
                      <tr key={id} className={`category-row ${isSelected ? "row-selected" : ""}`}>
                        {/* Row Checkbox */}
                        <td style={{ width: 44, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectOne(id)}
                          />
                        </td>

                        {/* Thumbnail */}
                        <td style={{ width: 80, textAlign: "center" }}>
                          <div className="category-img-box">
                            {category.imageUrl || category.image ? (
                              <img
                                className="category-image"
                                src={category.imageUrl || category.image}
                                alt={category.name}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className="category-placeholder"
                              style={{ display: category.imageUrl || category.image ? "none" : "flex" }}
                            >
                              {(category.name || "C")[0].toUpperCase()}
                            </div>
                          </div>
                        </td>

                        {/* Name & Badge */}
                        <td>
                          <div className="category-name-cell">
                            <strong>{category.name}</strong>
                            <span className="category-slug-text">/{category.slug || category.name.toLowerCase().replace(/\s+/g, "-")}</span>
                            {category.productsCount !== undefined && (
                              <small className="text-muted">
                                {category.productsCount} products assigned
                              </small>
                            )}
                          </div>
                        </td>

                        {/* Description */}
                        <td>
                          <span className="category-description-text" title={category.description || category.desc || ""}>
                            {category.description || category.desc || category.categoryDescription || "—"}
                          </span>
                        </td>

                        {/* Display Order */}
                        <td style={{ textAlign: "center" }}>
                          <span className="order-number">
                            #{category.sortOrder ?? category.displayOrder ?? category.display_order ?? 0}
                          </span>
                        </td>

                        {/* Active Status */}
                        <td style={{ textAlign: "center" }}>
                          <span
                            className={`status-badge-glow ${
                              isActive ? "status-active" : "status-inactive"
                            }`}
                          >
                            <span className="status-dot"></span>
                            {isActive ? "Active" : "Disabled"}
                          </span>
                        </td>

                        {/* Live Toggle */}
                        <td style={{ textAlign: "center" }}>
                          <div className="toggle-container" style={{ justifyContent: "center" }}>
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => handleToggleActivate(category)}
                              />
                              <span className="slider round"></span>
                            </label>
                            <span className="toggle-label-text">
                              {isActive ? "Active" : "Off"}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
                            <button
                              className="icon-action"
                              onClick={() => navigate(`/admin/specifications?tab=MAPPINGS&categoryId=${category.categoryId || category.id}`)}
                              title="Configure Category Specifications Schema"
                              style={{ color: "#0284c7" }}
                            >
                              <SlidersHorizontal size={16} />
                            </button>
                            <button
                              className="icon-action"
                              onClick={() => openEditModal(category)}
                              title="Edit Category"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="icon-action danger"
                              onClick={() => handleDelete(category)}
                              title="Delete Category"
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

      {/* Category Add/Edit Modal */}
      {showModal && (
        <CategoryModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          initialData={editingCategory}
          loading={submitting}
        />
      )}
    </div>
  );
}
