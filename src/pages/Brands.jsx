import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  RotateCcw,
  Package,
  Layers,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Tag,
  FolderTree,
  Building2,
  Check,
  X,
  Upload,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import {
  getBrands,
  createBrand,
  updateBrand,
  toggleBrandActive,
  deleteBrand,
  getStoredBrands,
  normalizeBrand,
} from "../api/brandApi";
import { getStoredCategories, getCategories } from "../api/categoryApi";
import { getStoredSubcategories, getSubcategories } from "../api/subcategoryApi";
import { uploadBrandImage } from "../api/imageApi";
import { useToast } from "../components/ToastContext";
import { subscribeDataUpdate } from "../api/dataStore";
import "../styles/categories.css";
import "../styles/products.css";
import "../styles/pages.css";

export default function Brands() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [brands, setBrands] = useState(() => (getStoredBrands() || []).map(normalizeBrand).filter(Boolean));
  const [categories, setCategories] = useState(() => (Array.isArray(getStoredCategories()) ? getStoredCategories() : []).filter(Boolean));
  const [subcategories, setSubcategories] = useState(() => (Array.isArray(getStoredSubcategories()) ? getStoredSubcategories() : []).filter(Boolean));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(
    searchParams.get("categoryId") || "ALL"
  );
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState(
    searchParams.get("subcategoryId") || "ALL"
  );
  const [activeTabFilter, setActiveTabFilter] = useState("ALL"); // ALL, ACTIVE, WITH_PRODUCTS
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    categoryId: "",
    subcategoryId: "",
    imageUrl: "",
    sortOrder: 1,
    active: true,
  });

  const loadData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError("");

      const [catsData, subsData, brandsData] = await Promise.all([
        getCategories(),
        getSubcategories(),
        getBrands(),
      ]);

      const catList = (Array.isArray(catsData) ? catsData : catsData?.categories || catsData?.data || []).filter(Boolean);
      const subList = (Array.isArray(subsData) ? subsData : subsData?.subcategories || subsData?.data || []).filter(Boolean);
      const rawBrandList = Array.isArray(brandsData) ? brandsData : brandsData?.brands || brandsData?.data || [];
      const brandList = rawBrandList.map(normalizeBrand).filter(Boolean);

      setCategories(catList);
      setSubcategories(subList);
      setBrands(brandList);
    } catch (err) {
      console.error("Failed to load catalog hierarchy:", err);
      setError("Unable to sync brand hierarchy from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
    const unsubscribe = subscribeDataUpdate((event) => {
      if (
        event.entity === "brands" ||
        event.entity === "subcategories" ||
        event.entity === "categories" ||
        event.entity === "products"
      ) {
        loadData(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter subcategories available for modal or dropdown
  const availableSubcategoriesForFilter = useMemo(() => {
    if (selectedCategoryFilter === "ALL") return (subcategories || []).filter(Boolean);
    return (subcategories || []).filter(
      (s) => s && String(s.categoryId || s.category_id) === String(selectedCategoryFilter)
    );
  }, [subcategories, selectedCategoryFilter]);

  const availableSubcategoriesForModal = useMemo(() => {
    if (!formData.categoryId) return [];
    return (subcategories || []).filter(
      (s) => s && String(s.categoryId || s.category_id) === String(formData.categoryId)
    );
  }, [subcategories, formData.categoryId]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingBrand(null);
    setFormData({
      name: "",
      slug: "",
      categoryId: "",
      subcategoryId: "",
      imageUrl: "",
      sortOrder: brands.length + 1,
      active: true,
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      categoryId: brand.categoryId || "",
      subcategoryId: brand.subcategoryId || "",
      imageUrl: brand.imageUrl || "",
      sortOrder: brand.sortOrder || 1,
      active: brand.active ?? brand.isActive ?? true,
    });
    setShowModal(true);
  };

  const handleSlugAuto = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: handleSlugAuto(val),
    }));
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "name") {
      setFormData((prev) => ({
        ...prev,
        name: value,
        slug: handleSlugAuto(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  // Category change in modal auto-selects valid child subcategory
  const handleModalCategoryChange = (e) => {
    const newCatId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      categoryId: newCatId,
      subcategoryId: "",
    }));
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Image Upload handler: uploads file directly to S3 cloud storage
  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be under 5MB");
      return;
    }

    // Set immediate preview for snappy UX
    const preview = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, imageUrl: preview }));

    setUploadingLogo(true);
    try {
      toast.info("Uploading brand logo to storage...");
      const uploadedUrl = await uploadBrandImage(file);
      if (uploadedUrl) {
        setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
        toast.success("Brand logo uploaded to cloud storage!");
      }
    } catch (err) {
      console.warn("Brand logo upload notice:", err?.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save / Update Brand
  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning("Brand name is required.");
      return;
    }
    if (!formData.categoryId) {
      toast.warning("Category is required.");
      return;
    }
    if (!formData.subcategoryId) {
      toast.warning("Subcategory is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingBrand) {
        const id = editingBrand.brandId || editingBrand.id;
        await updateBrand(id, formData);
        toast.success(`Brand "${formData.name}" updated successfully.`);
      } else {
        await createBrand(formData);
        toast.success(`Brand "${formData.name}" added to database successfully.`);
      }
      setShowModal(false);
      await loadData(false);
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Backend database rejected the brand record.";
      const status = err?.response?.status;
      toast.error(status ? `Database Error (${status}): ${errMsg}` : `Error: ${errMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggle = async (brand) => {
    try {
      const res = await toggleBrandActive(brand);
      toast.success(
        `Brand "${brand.name}" is now ${res.active ? "Active" : "Inactive"}.`
      );
      loadData(false);
    } catch {
      toast.error("Failed to toggle brand status.");
    }
  };

  // Delete Brand
  const handleDelete = async (brand) => {
    const id = brand.brandId || brand.id;
    if (
      window.confirm(
        `Are you sure you want to delete brand "${brand.name}"? Products under this brand will lose their direct brand association.`
      )
    ) {
      try {
        await deleteBrand(id);
        setSelectedIds((prev) => prev.filter((i) => String(i) !== String(id)));
        toast.success(`Brand "${brand.name}" deleted.`);
        loadData(false);
      } catch {
        toast.error("Failed to delete brand.");
      }
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredBrands.map((b) => b.brandId || b.id));
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
        const brand = brands.find((b) => (b.brandId || b.id) === id);
        if (brand) {
          await updateBrand(id, { ...brand, active: true, isActive: true });
        }
      }
      setBrands((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.brandId || item.id)
            ? { ...item, active: true, isActive: true }
            : item
        )
      );
      toast.success(`Activated ${selectedIds.length} brands.`);
      setSelectedIds([]);
      loadData(false);
    } catch (err) {
      toast.error("Failed to activate selected brands.");
    }
  };

  const handleBulkDeactivate = async () => {
    if (!selectedIds.length) return;
    try {
      for (const id of selectedIds) {
        const brand = brands.find((b) => (b.brandId || b.id) === id);
        if (brand) {
          await updateBrand(id, { ...brand, active: false, isActive: false });
        }
      }
      setBrands((prev) =>
        prev.map((item) =>
          selectedIds.includes(item.brandId || item.id)
            ? { ...item, active: false, isActive: false }
            : item
        )
      );
      toast.warning(`Deactivated ${selectedIds.length} brands.`);
      setSelectedIds([]);
      loadData(false);
    } catch (err) {
      toast.error("Failed to deactivate selected brands.");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected brands permanently? Products under these brands will lose their direct brand association.`
      )
    )
      return;
    try {
      for (const id of selectedIds) {
        await deleteBrand(id);
      }
      setBrands((prev) =>
        prev.filter((item) => !selectedIds.includes(item.brandId || item.id))
      );
      toast.info(`Deleted ${selectedIds.length} brands.`);
      setSelectedIds([]);
      loadData(false);
    } catch (err) {
      toast.error("Failed to delete selected brands.");
    }
  };

  const handleExportCSV = () => {
    const exportList = selectedIds.length > 0
      ? brands.filter((b) => selectedIds.includes(b.brandId || b.id))
      : filteredBrands;

    const headers = ["Brand ID,Brand Name,Category,Subcategory,Slug,Sort Order,Products Count,Active Status"];
    const rows = exportList.map((b) => [
      `"${b.brandId || b.id}"`,
      `"${b.name || ""}"`,
      `"${b.categoryName || ""}"`,
      `"${b.subcategoryName || ""}"`,
      `"${b.slug || ""}"`,
      `"${b.sortOrder ?? 0}"`,
      `"${b.productCount ?? 0}"`,
      `"${(b.active ?? b.isActive ?? true) ? "Active" : "Inactive"}"`,
    ].join(","));

    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_brands_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportList.length} brands to CSV.`);
  };

  // Filtered List
  const filteredBrands = useMemo(() => {
    return (brands || []).filter((brand) => {
      if (!brand) return false;
      const q = (search || "").toLowerCase();
      const brandName = String(brand.name || "");
      const brandSlug = String(brand.slug || "");
      const subName = String(brand.subcategoryName || "");
      const catName = String(brand.categoryName || "");

      const matchesSearch =
        brandName.toLowerCase().includes(q) ||
        brandSlug.toLowerCase().includes(q) ||
        subName.toLowerCase().includes(q) ||
        catName.toLowerCase().includes(q);

      let matchesCat = true;
      if (selectedCategoryFilter !== "ALL") {
        matchesCat = String(brand.categoryId) === String(selectedCategoryFilter);
      }

      let matchesSub = true;
      if (selectedSubcategoryFilter !== "ALL") {
        matchesSub = String(brand.subcategoryId) === String(selectedSubcategoryFilter);
      }

      let matchesTab = true;
      if (activeTabFilter === "ACTIVE") {
        matchesTab = Boolean(brand.active ?? brand.isActive ?? true);
      }
      if (activeTabFilter === "WITH_PRODUCTS") {
        matchesTab = (Number(brand.productCount) || 0) > 0;
      }

      return matchesSearch && matchesCat && matchesSub && matchesTab;
    });
  }, [
    brands,
    search,
    selectedCategoryFilter,
    selectedSubcategoryFilter,
    activeTabFilter,
  ]);

  // Dynamic Search Suggestions
  const searchSuggestions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return [];
    return (brands || [])
      .filter((b) =>
        b && (
          (b.name || "").toLowerCase().includes(q) ||
          (b.slug || "").toLowerCase().includes(q) ||
          (b.subcategoryName || "").toLowerCase().includes(q) ||
          (b.categoryName || "").toLowerCase().includes(q)
        )
      )
      .slice(0, 5);
  }, [brands, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validBrands = (brands || []).filter(Boolean);
  const totalBrands = validBrands.length;
  const activeBrands = validBrands.filter((b) => b && (b.active ?? b.isActive ?? true)).length;
  const brandsWithProducts = validBrands.filter((b) => b && (Number(b.productCount) || 0) > 0).length;

  return (
    <div className="categories-page">
      {/* 4-Tier Breadcrumb & Header */}
      <div className="page-header">
        <div>
          <div className="header-eyebrow">
            <Building2 size={14} />
            <span>4-TIER CATALOG HIERARCHY &bull; TIER 3: BRAND</span>
          </div>
          <h1>Brands Catalog</h1>
          <p>
            Manage manufacturers and suppliers that bridge Subcategories to Products in the 4-tier hierarchy
          </p>
        </div>

        <div className="page-header-actions">
          <button className="primary-button" onClick={handleOpenAdd}>
            <Plus size={18} />
            <span>Add Brand</span>
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
          <span className="stat-pill-label">Total Brands</span>
          <strong className="stat-pill-value">{totalBrands}</strong>
        </div>

        <div
          className={`stat-pill active ${activeTabFilter === "ACTIVE" ? "stat-pill-selected" : ""}`}
          onClick={() => setActiveTabFilter("ACTIVE")}
          role="button"
          tabIndex={0}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Active Brands</span>
          <strong className="stat-pill-value">{activeBrands}</strong>
        </div>

        <div
          className={`stat-pill ${activeTabFilter === "WITH_PRODUCTS" ? "stat-pill-selected" : ""}`}
          onClick={() => setActiveTabFilter("WITH_PRODUCTS")}
          role="button"
          tabIndex={0}
        >
          <span className="stat-pill-label">Brands with Products</span>
          <strong className="stat-pill-value">{brandsWithProducts}</strong>
        </div>
      </div>

      {/* 4-Tier Hierarchy Breadcrumb Navigator */}
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
          style={{ cursor: "pointer", color: "#d97706", fontWeight: 600 }}
          onClick={() => navigate("/admin/categories")}
        >
          1. Categories ({categories.length})
        </span>
        <ChevronRight size={14} />
        <span
          style={{ cursor: "pointer", color: "#d97706", fontWeight: 600 }}
          onClick={() => navigate("/admin/subcategories")}
        >
          2. Subcategories ({subcategories.length})
        </span>
        <ChevronRight size={14} />
        <span
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "2px 8px",
            borderRadius: "6px",
            fontWeight: 800,
          }}
        >
          3. Brands ({totalBrands}) [Active View]
        </span>
        <ChevronRight size={14} />
        <span
          style={{ cursor: "pointer", color: "#64748b", fontWeight: 600 }}
          onClick={() => navigate("/admin/products")}
        >
          4. Products
        </span>
      </div>

      {/* Filter & Dynamic Search Bar */}
      <div className="table-toolbar" style={{ flexWrap: "wrap", gap: "12px" }}>
        <div
          ref={searchContainerRef}
          className="search-input"
          style={{ minWidth: "300px", position: "relative" }}
        >
          <Search size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchFocused(true);
            }}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search brands, subcategories, categories..."
          />
          {search && (
            <button
              className="search-clear"
              onClick={() => {
                setSearch("");
                setSearchFocused(false);
              }}
              title="Clear search"
            >
              ×
            </button>
          )}

          {/* Dynamic Real-Time Autocomplete Dropdown */}
          {searchFocused && search.trim().length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "#ffffff",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                zIndex: 50,
                overflow: "hidden",
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#64748b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>MATCHING BRANDS ({searchSuggestions.length})</span>
                <span style={{ color: "#d97706" }}>⚡ Dynamic Suggestions</span>
              </div>

              {searchSuggestions.length === 0 ? (
                <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "12.5px" }}>
                  No brands matching "{search}"
                </div>
              ) : (
                searchSuggestions.map((item) => (
                  <div
                    key={item.brandId || item.id}
                    onClick={() => {
                      setSearch(item.name);
                      setSearchFocused(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f8fafc",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef3c7")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        overflow: "hidden",
                        background: "#0f172a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#f59e0b" }}>
                          {item.name?.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>{item.categoryName || "Category"}</span>
                        <span>›</span>
                        <span style={{ color: "#b45309", fontWeight: 600 }}>{item.subcategoryName || "Subcategory"}</span>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 7px",
                        borderRadius: "10px",
                        background: "#f1f5f9",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      {item.productCount || 0} SKUs
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2-Tier Cascading Filter Selectors */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div className="sort-control">
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
              Category:
            </span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setSelectedSubcategoryFilter("ALL");
              }}
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((cat) => {
                const catId = cat.categoryId || cat.id || cat._id;
                return (
                  <option key={catId} value={catId}>
                    {cat.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="sort-control">
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
              Subcategory:
            </span>
            <select
              value={selectedSubcategoryFilter}
              onChange={(e) => setSelectedSubcategoryFilter(e.target.value)}
              disabled={availableSubcategoriesForFilter.length === 0}
            >
              <option value="ALL">
                All Subcategories ({availableSubcategoriesForFilter.length})
              </option>
              {availableSubcategoriesForFilter.map((sub) => {
                const subId = sub.subcategoryId || sub.id || sub._id;
                return (
                  <option key={subId} value={subId}>
                    {sub.name}
                  </option>
                );
              })}
            </select>
          </div>

          {(selectedCategoryFilter !== "ALL" ||
            selectedSubcategoryFilter !== "ALL" ||
            search !== "") && (
            <button
              className="filter-button"
              onClick={() => {
                setSelectedCategoryFilter("ALL");
                setSelectedSubcategoryFilter("ALL");
                setSearch("");
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Strip */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-bar" style={{ borderRadius: "10px", marginBottom: "14px" }}>
          <div className="bulk-left">
            <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? "brand" : "brands"} selected
          </div>
          <div className="bulk-right">
            <button
              className="btn-bulk-action success"
              onClick={handleBulkActivate}
              title="Activate selected brands"
            >
              <CheckCircle2 size={15} /> Activate
            </button>
            <button
              className="btn-bulk-action warning"
              onClick={handleBulkDeactivate}
              title="Deactivate selected brands"
            >
              <XCircle size={15} /> Deactivate
            </button>
            <button
              className="btn-bulk-action danger"
              onClick={handleBulkDelete}
              title="Delete selected brands"
            >
              <Trash2 size={15} /> Delete
            </button>
            <button
              className="btn-bulk-action"
              style={{ background: "#2563eb", color: "#ffffff" }}
              onClick={handleExportCSV}
              title="Export selected brands as CSV"
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

      {/* Brands Table */}
      <div className="table-container" style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {filteredBrands.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Building2 size={42} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
            <h3 style={{ color: "#0f172a", fontSize: "16px", fontWeight: 700 }}>
              No Brands Found
            </h3>
            <p style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>
              {search || selectedCategoryFilter !== "ALL" || selectedSubcategoryFilter !== "ALL"
                ? "Try adjusting your search or category filters."
                : "Get started by adding your first brand in the catalog."}
            </p>
            <button
              className="primary-button"
              style={{ marginTop: "16px" }}
              onClick={handleOpenAdd}
            >
              <Plus size={16} />
              <span>Add Brand</span>
            </button>
          </div>
        ) : (
          <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ width: "44px", padding: "12px 16px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={
                      filteredBrands.length > 0 &&
                      selectedIds.length === filteredBrands.length
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th style={{ width: "70px", padding: "12px 16px", textAlign: "left" }}>Logo</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Brand Name</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Hierarchy Lineage</th>
                <th style={{ width: "110px", padding: "12px 16px", textAlign: "center" }}>Products</th>
                <th style={{ width: "90px", padding: "12px 16px", textAlign: "center" }}>Order</th>
                <th style={{ width: "100px", padding: "12px 16px", textAlign: "center" }}>Status</th>
                <th style={{ width: "90px", padding: "12px 16px", textAlign: "center" }}>Live</th>
                <th style={{ width: "110px", padding: "12px 16px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBrands.map((brand) => {
                if (!brand) return null;
                const id = brand.brandId || brand.id;
                const isActive = brand.active ?? brand.isActive ?? true;
                const isSelected = selectedIds.includes(id);
                const brandName = brand.name || "Untitled Brand";
                const initial = (brandName.charAt(0) || "B").toUpperCase();

                return (
                  <tr
                    key={id}
                    className={isSelected ? "row-selected" : ""}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* Row Checkbox */}
                    <td style={{ width: "44px", padding: "12px 16px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectOne(id)}
                      />
                    </td>

                    {/* Logo / Thumbnail */}
                    <td style={{ padding: "12px 16px" }}>
                      <div className="category-img-box" style={{ width: "44px", height: "44px", minWidth: "44px", minHeight: "44px", borderRadius: "8px" }}>
                        {brand.imageUrl ? (
                          <img
                            src={brand.imageUrl}
                            alt={brandName}
                            className="category-image"
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
                          style={{
                            display: brand.imageUrl ? "none" : "flex",
                            width: "44px",
                            height: "44px",
                            minWidth: "44px",
                            minHeight: "44px",
                            fontSize: "16px",
                            borderRadius: "8px",
                          }}
                        >
                          {initial}
                        </div>
                      </div>
                    </td>

                    {/* Brand Name & Slug */}
                    <td style={{ padding: "12px 16px" }}>
                      <div className="category-name-cell">
                        <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
                          {brandName}
                        </strong>
                        <span className="category-slug-text" style={{ fontSize: "11px" }}>
                          /{brand.slug || "brand"}
                        </span>
                      </div>
                    </td>

                    {/* Hierarchy Lineage */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            background: "#f1f5f9",
                            color: "#475569",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          {brand.categoryName || "Civil & Structural"}
                        </span>
                        <ChevronRight size={12} style={{ color: "#94a3b8" }} />
                        <span
                          style={{
                            padding: "3px 8px",
                            background: "#fffbeb",
                            color: "#b45309",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            border: "1px solid #fde68a",
                          }}
                        >
                          {brand.subcategoryName || "Subcategory"}
                        </span>
                      </div>
                    </td>

                    {/* Product Count Pill & Direct Link */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        onClick={() => navigate(`/admin/products?brandId=${id}`)}
                        title="View products under this brand"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "4px 8px",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          color: "#1d4ed8",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <Package size={13} />
                        <span>{brand.productCount || 0}</span>
                      </button>
                    </td>

                    {/* Sort Order */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: "11px",
                          color: "#64748b",
                          fontWeight: 700,
                        }}
                      >
                        #{brand.sortOrder || 1}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        className={`status-pill ${isActive ? "active" : "inactive"}`}
                        style={{ fontSize: "11px", padding: "3px 8px" }}
                      >
                        <span className={`pulse-dot ${isActive ? "green" : "gray"}`}></span>
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Live Toggle */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={() => handleToggle(brand)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <button
                          className="icon-action-btn edit"
                          onClick={() => handleOpenEdit(brand)}
                          title="Edit Brand"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          className="icon-action-btn delete"
                          onClick={() => handleDelete(brand)}
                          title="Delete Brand"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Brand Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content modal-animated"
            style={{ maxWidth: "580px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div
                  className="header-eyebrow"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#d97706",
                    marginBottom: "4px",
                  }}
                >
                  <Building2 size={13} />
                  <span>TIER 3 CLASSIFICATION</span>
                </div>
                <h2>{editingBrand ? "Edit Brand" : "Add New Brand"}</h2>
                <p style={{ margin: 0, fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  Map this brand under a Category and Subcategory
                </p>
              </div>
              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="modal-form" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* 2-Tier Parent Selectors */}
              <div className="form-group">
                <label>
                  Parent Category <span className="required-star">*</span>
                </label>
                <select
                  value={formData.categoryId || ""}
                  onChange={handleModalCategoryChange}
                  required
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((c) => {
                    const id = c.categoryId || c.id;
                    return (
                      <option key={id} value={id}>
                        {c.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Parent Subcategory <span className="required-star">*</span>
                </label>
                <select
                  value={formData.subcategoryId || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subcategoryId: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  required
                >
                  <option value="" disabled>Select Subcategory</option>
                  {availableSubcategoriesForModal.length === 0 ? (
                    formData.categoryId ? (
                      <option value="" disabled>No subcategories found for selected category</option>
                    ) : (
                      <option value="" disabled>Please select a category first</option>
                    )
                  ) : (
                    availableSubcategoriesForModal.map((s) => {
                      const id = s.subcategoryId || s.id;
                      return (
                        <option key={id} value={id}>
                          {s.name}
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              {/* Brand Name & Slug */}
              <div className="form-group">
                <label>
                  Brand Name <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tata Tiscon, UltraTech, Polycab"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Brand Slug</label>
                <input
                  type="text"
                  placeholder="e.g. tata-tiscon"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                />
              </div>

              {/* Brand Logo / Thumbnail */}
              <div className="form-group">
                <label>Brand Logo / Thumbnail</label>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {formData.imageUrl && (
                    <div
                      style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#f8fafc",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="https://... or paste image URL"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                    style={{ flex: 1 }}
                  />
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "8px 12px",
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475569",
                      cursor: uploadingLogo ? "wait" : "pointer",
                      whiteSpace: "nowrap",
                      opacity: uploadingLogo ? 0.7 : 1,
                    }}
                  >
                    <Upload size={14} />
                    <span>{uploadingLogo ? "Uploading..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      disabled={uploadingLogo}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>
              </div>

              {/* Sort Order & Active Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div className="form-group">
                  <label>Display Sort Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        sortOrder: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                </div>

                <div className="form-group" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <label>Active Status</label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "6px" }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, active: e.target.checked }))
                      }
                      style={{ width: "16px", height: "16px", accentColor: "#d97706" }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                      {formData.active ? "Active in marketplace" : "Inactive / Hidden"}
                    </span>
                  </label>
                </div>
              </div>

              <div
                className="modal-footer"
                style={{
                  margin: "8px -24px -22px",
                  padding: "16px 24px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : editingBrand ? "Update Brand" : "Create Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
