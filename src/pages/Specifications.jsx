import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  SlidersHorizontal,
  Plus,
  Edit,
  Trash2,
  Search,
  RotateCcw,
  Package,
  Layers,
  Check,
  X,
  Tag,
  FolderTree,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Download,
  ListTree,
  FileCheck2,
  Sparkles,
  Save,
  ArrowUpDown,
  Sliders,
  Settings2,
} from "lucide-react";
import { getCategories, getStoredCategories } from "../api/categoryApi";
import {
  getSpecifications,
  createSpecification,
  updateSpecification,
  deleteSpecification,
  addSpecificationOption,
  getSpecificationOptions,
  updateSpecificationOption,
  deleteSpecificationOption,
  getCategorySpecifications,
  mapCategorySpecification,
  updateCategorySpecification,
  deleteCategorySpecification,
  batchConfigureCategorySpecifications,
  getStoredSpecifications,
  getStoredCategorySpecs,
} from "../api/specificationApi";
import { useToast } from "../components/ToastContext";
import { subscribeDataUpdate } from "../api/dataStore";
import "../styles/pages.css";
import "../styles/categories.css";
import "../styles/products.css";
import "../styles/specifications.css";

const INPUT_TYPES = [
  { value: "DROPDOWN", label: "Dropdown (Single Select)", desc: "Predefined list of selectable options" },
  { value: "MULTI_SELECT", label: "Multi Select", desc: "Select multiple options simultaneously" },
  { value: "NUMBER", label: "Numeric Value", desc: "Numerical inputs with unit of measurement" },
  { value: "BOOLEAN", label: "Boolean (Yes / No)", desc: "Binary toggle or checkbox" },
  { value: "TEXT", label: "Freeform Text", desc: "Custom freeform alphanumeric input" },
];

const EMPTY_SPEC_FORM = {
  name: "",
  key: "",
  inputType: "DROPDOWN",
  unit: "",
  active: true,
  optionsInput: "",
};

export default function Specifications() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "MASTERS"); // MASTERS | MAPPINGS
  const [specifications, setSpecifications] = useState(() => getStoredSpecifications());
  const [categories, setCategories] = useState(() => getStoredCategories());
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    searchParams.get("categoryId") || (categories[0]?.categoryId || categories[0]?.id || "1")
  );
  const [categorySpecs, setCategorySpecs] = useState(() => {
    const initialCatId = searchParams.get("categoryId") || (categories[0]?.categoryId || categories[0]?.id || "1");
    const storedMappings = getStoredCategorySpecs();
    return storedMappings[initialCatId] || [];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal States
  const [showSpecModal, setShowSpecModal] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);
  const [specForm, setSpecForm] = useState(EMPTY_SPEC_FORM);
  const [submittingSpec, setSubmittingSpec] = useState(false);

  // Manage Options Modal State
  const [optionModalSpec, setOptionModalSpec] = useState(null);
  const [newOptionValue, setNewOptionValue] = useState("");
  const [newOptionOrder, setNewOptionOrder] = useState(1);
  const [editingOption, setEditingOption] = useState(null);
  const [savingOption, setSavingOption] = useState(false);

  // Map to Category Modal State
  const [showMapModal, setShowMapModal] = useState(false);
  const [mappingSpecId, setMappingSpecId] = useState("");
  const [mappingRequired, setMappingRequired] = useState(true);
  const [mappingOrder, setMappingOrder] = useState(1);
  const [savingMapping, setSavingMapping] = useState(false);

  // Batch Mapping Dirty Tracker
  const [batchDirty, setBatchDirty] = useState(false);

  const loadData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError("");

      const [specsRes, catsRes] = await Promise.allSettled([
        getSpecifications(),
        getCategories(),
      ]);

      const specsData = specsRes.status === "fulfilled" && Array.isArray(specsRes.value) && specsRes.value.length > 0
        ? specsRes.value
        : getStoredSpecifications();

      const catsData = catsRes.status === "fulfilled" && Array.isArray(catsRes.value) && catsRes.value.length > 0
        ? catsRes.value
        : getStoredCategories();

      setSpecifications(specsData);
      setCategories(catsData);

      const targetCatId = selectedCategoryId || (catsData[0]?.categoryId || catsData[0]?.id || "1");
      if (targetCatId) {
        try {
          const catSpecsData = await getCategorySpecifications(targetCatId, { activeOnly: false });
          const catSpecsList = Array.isArray(catSpecsData) ? catSpecsData : catSpecsData?.data || [];
          if (catSpecsList.length > 0) {
            setCategorySpecs(catSpecsList);
          } else {
            const fallback = getStoredCategorySpecs()[targetCatId] || [];
            setCategorySpecs(fallback);
          }
        } catch {
          const fallback = getStoredCategorySpecs()[targetCatId] || [];
          setCategorySpecs(fallback);
        }
      }
    } catch (err) {
      console.warn("Notice loading specifications data:", err);
      setSpecifications(getStoredSpecifications());
      setCategories(getStoredCategories());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeDataUpdate((event) => {
      if (
        event.entity === "specifications" ||
        event.entity === "category_specifications" ||
        event.entity === "categories"
      ) {
        loadData(false);
      }
    });
    return () => unsubscribe();
  }, [selectedCategoryId]);

  const handleCategoryChange = async (catId) => {
    setSelectedCategoryId(catId);
    setSearchParams({ tab: activeTab, categoryId: catId });
    setBatchDirty(false);
    try {
      const data = await getCategorySpecifications(catId, { activeOnly: false });
      setCategorySpecs(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      toast.error("Failed to load category specifications.");
    }
  };

  // Open Add Spec Master Modal
  const handleOpenAddSpec = () => {
    setEditingSpec(null);
    setSpecForm(EMPTY_SPEC_FORM);
    setShowSpecModal(true);
  };

  // Open Edit Spec Master Modal
  const handleOpenEditSpec = (spec) => {
    setEditingSpec(spec);
    const existingOptions = (spec.options || []).map((o) => (typeof o === "string" ? o : o.value || "")).join(", ");
    setSpecForm({
      name: spec.name || "",
      key: spec.key || "",
      inputType: spec.inputType || "DROPDOWN",
      unit: spec.unit || "",
      active: spec.active ?? true,
      optionsInput: existingOptions,
    });
    setShowSpecModal(true);
  };

  // Save Spec Master
  const handleSaveSpec = async (e) => {
    e.preventDefault();
    if (!specForm.name.trim()) {
      toast.warning("Specification name is required.");
      return;
    }

    const optionsList = specForm.optionsInput
      ? specForm.optionsInput
          .split(/[\n,]+/)
          .map((o) => o.trim())
          .filter(Boolean)
      : [];

    const payload = {
      name: specForm.name.trim(),
      key: specForm.key?.trim() || specForm.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      inputType: specForm.inputType,
      unit: specForm.unit?.trim() || null,
      active: Boolean(specForm.active),
      options: optionsList,
    };

    setSubmittingSpec(true);
    try {
      if (editingSpec) {
        const id = editingSpec.id;
        await updateSpecification(id, payload);
        toast.success(`Specification "${payload.name}" updated successfully.`);
      } else {
        await createSpecification(payload);
        toast.success(`Specification Master "${payload.name}" created.`);
      }
      setShowSpecModal(false);
      loadData(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save specification.");
    } finally {
      setSubmittingSpec(false);
    }
  };

  // Delete Spec Master
  const handleDeleteSpec = async (spec) => {
    if (!window.confirm(`Deactivate specification "${spec.name}"?`)) return;
    try {
      await deleteSpecification(spec.id);
      setSelectedIds((prev) => prev.filter((i) => i !== spec.id));
      toast.info(`Specification "${spec.name}" deactivated.`);
      loadData(false);
    } catch (err) {
      toast.error("Failed to delete specification.");
    }
  };

  // Manage Options Handlers
  const handleOpenManageOptions = (spec) => {
    setOptionModalSpec(spec);
    setNewOptionValue("");
    setNewOptionOrder((spec.options || []).length + 1);
    setEditingOption(null);
  };

  const handleAddOrUpdateOption = async (e) => {
    e.preventDefault();
    if (!newOptionValue.trim()) {
      toast.warning("Option value is required.");
      return;
    }
    setSavingOption(true);
    try {
      if (editingOption) {
        await updateSpecificationOption(optionModalSpec.id, editingOption.id, {
          value: newOptionValue.trim(),
          displayOrder: Number(newOptionOrder || 1),
        });
        toast.success("Option updated successfully.");
      } else {
        await addSpecificationOption(optionModalSpec.id, {
          value: newOptionValue.trim(),
          displayOrder: Number(newOptionOrder || (optionModalSpec.options || []).length + 1),
        });
        toast.success("Option added successfully.");
      }
      // Refresh options in modal
      const refreshedOptions = await getSpecificationOptions(optionModalSpec.id);
      setOptionModalSpec((prev) => ({ ...prev, options: refreshedOptions }));
      setNewOptionValue("");
      setNewOptionOrder(refreshedOptions.length + 1);
      setEditingOption(null);
      loadData(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save option.");
    } finally {
      setSavingOption(false);
    }
  };

  const handleDeleteOption = async (optionId) => {
    if (!window.confirm("Remove this predefined option?")) return;
    try {
      await deleteSpecificationOption(optionModalSpec.id, optionId);
      const refreshedOptions = await getSpecificationOptions(optionModalSpec.id);
      setOptionModalSpec((prev) => ({ ...prev, options: refreshedOptions }));
      toast.info("Option removed.");
      loadData(false);
    } catch (err) {
      toast.error("Failed to remove option.");
    }
  };

  // Category Specification Mapping Handlers
  const unmappedMasterSpecs = useMemo(() => {
    const mappedIds = new Set(categorySpecs.map((m) => String(m.id || m.specificationId)));
    return specifications.filter((s) => !mappedIds.has(String(s.id)));
  }, [specifications, categorySpecs]);

  const handleOpenMapModal = () => {
    if (unmappedMasterSpecs.length === 0) {
      toast.info("All specification masters are already assigned to this category.");
      return;
    }
    setMappingSpecId(unmappedMasterSpecs[0]?.id || "");
    setMappingRequired(true);
    setMappingOrder(categorySpecs.length + 1);
    setShowMapModal(true);
  };

  const handleSaveCategoryMapping = async (e) => {
    e.preventDefault();
    if (!mappingSpecId) {
      toast.warning("Please select a specification to assign.");
      return;
    }
    setSavingMapping(true);
    try {
      await mapCategorySpecification(selectedCategoryId, {
        specificationId: mappingSpecId,
        required: mappingRequired,
        displayOrder: mappingOrder,
        active: true,
      });
      toast.success("Specification mapped to category successfully.");
      setShowMapModal(false);
      const refreshed = await getCategorySpecifications(selectedCategoryId, { activeOnly: false });
      setCategorySpecs(Array.isArray(refreshed) ? refreshed : refreshed?.data || []);
      setBatchDirty(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to map specification.");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleRemoveCategoryMapping = async (specId) => {
    if (!window.confirm("Remove this specification from the category?")) return;
    try {
      await deleteCategorySpecification(selectedCategoryId, specId);
      toast.info("Specification removed from category.");
      const refreshed = await getCategorySpecifications(selectedCategoryId, { activeOnly: false });
      setCategorySpecs(Array.isArray(refreshed) ? refreshed : refreshed?.data || []);
      setBatchDirty(false);
    } catch (err) {
      toast.error("Failed to remove category specification.");
    }
  };

  const handleCategorySpecFieldChange = (specId, field, val) => {
    setCategorySpecs((prev) =>
      prev.map((item) => {
        if (String(item.id || item.specificationId) === String(specId)) {
          return { ...item, [field]: val };
        }
        return item;
      })
    );
    setBatchDirty(true);
  };

  const handleSaveBatchCategorySpecs = async () => {
    try {
      setSavingMapping(true);
      const payload = categorySpecs.map((spec, idx) => ({
        specificationId: spec.id || spec.specificationId,
        required: Boolean(spec.required),
        displayOrder: Number(spec.displayOrder || idx + 1),
        active: spec.active !== false,
      }));
      await batchConfigureCategorySpecifications(selectedCategoryId, payload);
      toast.success("Category specifications configuration saved successfully!");
      setBatchDirty(false);
      const refreshed = await getCategorySpecifications(selectedCategoryId, { activeOnly: false });
      setCategorySpecs(Array.isArray(refreshed) ? refreshed : refreshed?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to batch save configurations.");
    } finally {
      setSavingMapping(false);
    }
  };

  // Bulk Selection Handlers
  const filteredSpecifications = useMemo(() => {
    return specifications.filter((spec) => {
      const matchesSearch =
        (spec.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (spec.key || "").toLowerCase().includes(search.toLowerCase()) ||
        (spec.unit || "").toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === "ALL" || spec.inputType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [specifications, search, typeFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredSpecifications.map((s) => s.id));
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
        const spec = specifications.find((s) => s.id === id);
        if (spec) await updateSpecification(id, { ...spec, active: true });
      }
      toast.success(`Activated ${selectedIds.length} specifications.`);
      setSelectedIds([]);
      loadData(false);
    } catch (err) {
      toast.error("Failed to activate specifications.");
    }
  };

  const handleBulkDeactivate = async () => {
    if (!selectedIds.length) return;
    try {
      for (const id of selectedIds) {
        const spec = specifications.find((s) => s.id === id);
        if (spec) await updateSpecification(id, { ...spec, active: false });
      }
      toast.warning(`Deactivated ${selectedIds.length} specifications.`);
      setSelectedIds([]);
      loadData(false);
    } catch (err) {
      toast.error("Failed to deactivate specifications.");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Deactivate ${selectedIds.length} selected specifications permanently?`)) return;
    try {
      for (const id of selectedIds) {
        await deleteSpecification(id);
      }
      toast.info(`Deactivated ${selectedIds.length} specifications.`);
      setSelectedIds([]);
      loadData(false);
    } catch (err) {
      toast.error("Failed to delete specifications.");
    }
  };

  const handleExportCSV = () => {
    const exportList = selectedIds.length > 0
      ? specifications.filter((s) => selectedIds.includes(s.id))
      : filteredSpecifications;

    const headers = ["Specification ID,Name,Key,Input Type,Unit,Options Count,Active Status"];
    const rows = exportList.map((s) => [
      `"${s.id}"`,
      `"${s.name || ""}"`,
      `"${s.key || ""}"`,
      `"${s.inputType || "TEXT"}"`,
      `"${s.unit || ""}"`,
      `"${(s.options || []).length}"`,
      `"${(s.active ?? true) ? "Active" : "Inactive"}"`,
    ].join(","));

    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_specifications_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportList.length} specifications to CSV.`);
  };

  const totalSpecs = specifications.length;
  const activeSpecsCount = specifications.filter((s) => s.active !== false).length;

  return (
    <div className="categories-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="header-eyebrow">
            <SlidersHorizontal size={14} />
            <span>PRODUCT ATTRIBUTES & TAXONOMY SCHEMAS</span>
          </div>
          <h1>Specification Masters & Category Schemas</h1>
          <p>Standardize technical parameters, units of measure & category data schemas</p>
        </div>

        <div className="page-header-actions">
          {activeTab === "MASTERS" ? (
            <button className="primary-button" onClick={handleOpenAddSpec}>
              <Plus size={18} />
              <span>Add Specification Master</span>
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              {batchDirty && (
                <button
                  className="primary-button"
                  style={{ background: "#10b981", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.28)" }}
                  onClick={handleSaveBatchCategorySpecs}
                  disabled={savingMapping}
                >
                  <Save size={16} />
                  <span>Save Configuration</span>
                </button>
              )}
              <button className="primary-button" onClick={handleOpenMapModal}>
                <Plus size={18} />
                <span>Map Specification to Category</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Strip */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${activeTab === "MASTERS" ? "stat-pill-selected" : ""}`}
          onClick={() => {
            setActiveTab("MASTERS");
            setSearchParams({ tab: "MASTERS" });
          }}
          role="button"
          tabIndex={0}
        >
          <span className="stat-pill-label">Total Master Specs</span>
          <strong className="stat-pill-value">{totalSpecs}</strong>
        </div>

        <div className="stat-pill active">
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Active Specs</span>
          <strong className="stat-pill-value">{activeSpecsCount}</strong>
        </div>

        <div
          className={`stat-pill ${activeTab === "MAPPINGS" ? "stat-pill-selected" : ""}`}
          onClick={() => {
            setActiveTab("MAPPINGS");
            setSearchParams({ tab: "MAPPINGS", categoryId: selectedCategoryId });
          }}
          role="button"
          tabIndex={0}
        >
          <span className="stat-pill-label">Category Schemas</span>
          <strong className="stat-pill-value">{categories.length} Categories</strong>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <button
          className={`btn-secondary ${activeTab === "MASTERS" ? "primary-button" : ""}`}
          style={{ padding: "8px 18px", fontSize: "13px" }}
          onClick={() => {
            setActiveTab("MASTERS");
            setSearchParams({ tab: "MASTERS" });
          }}
        >
          <ListTree size={16} />
          <span>1. Specification Masters Library</span>
        </button>

        <button
          className={`btn-secondary ${activeTab === "MAPPINGS" ? "primary-button" : ""}`}
          style={{ padding: "8px 18px", fontSize: "13px" }}
          onClick={() => {
            setActiveTab("MAPPINGS");
            setSearchParams({ tab: "MAPPINGS", categoryId: selectedCategoryId });
          }}
        >
          <FolderTree size={16} />
          <span>2. Category ↔ Specification Mapping</span>
        </button>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button onClick={() => loadData(true)}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Tab 1: SPECIFICATION MASTERS */}
      {activeTab === "MASTERS" && (
        <div className="content-card">
          {/* Table Toolbar */}
          <div className="table-toolbar" style={{ flexWrap: "wrap", gap: "12px" }}>
            <div className="search-input" style={{ minWidth: "300px" }}>
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by specification name, key or unit..."
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch("")}>
                  ×
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b" }}>Input Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  fontWeight: 600,
                }}
              >
                <option value="ALL">All Types ({specifications.length})</option>
                {INPUT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk Actions Strip */}
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <div className="bulk-left">
                <strong>{selectedIds.length}</strong> {selectedIds.length === 1 ? "specification" : "specifications"} selected
              </div>
              <div className="bulk-right">
                <button
                  className="btn-bulk-action success"
                  onClick={handleBulkActivate}
                  title="Activate selected specifications"
                >
                  <CheckCircle2 size={15} /> Activate
                </button>
                <button
                  className="btn-bulk-action warning"
                  onClick={handleBulkDeactivate}
                  title="Deactivate selected specifications"
                >
                  <XCircle size={15} /> Deactivate
                </button>
                <button
                  className="btn-bulk-action danger"
                  onClick={handleBulkDelete}
                  title="Delete selected specifications"
                >
                  <Trash2 size={15} /> Delete
                </button>
                <button
                  className="btn-bulk-action"
                  style={{ background: "#2563eb", color: "#ffffff" }}
                  onClick={handleExportCSV}
                  title="Export selected specifications as CSV"
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
              <p>Loading specifications library...</p>
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
                          filteredSpecifications.length > 0 &&
                          selectedIds.length === filteredSpecifications.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th style={{ minWidth: 180 }}>Specification Name</th>
                    <th style={{ width: 140 }}>Code / Key</th>
                    <th style={{ width: 150 }}>Input Type</th>
                    <th style={{ width: 110, textAlign: "center" }}>Unit</th>
                    <th style={{ minWidth: 220 }}>Predefined Options</th>
                    <th style={{ width: 110, textAlign: "center" }}>Status</th>
                    <th style={{ width: 130, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpecifications.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-table">
                        <div className="empty-table-content">
                          <Package size={40} className="empty-icon" />
                          <h3>No specifications found</h3>
                          <p>
                            {search
                              ? `No specifications matching "${search}"`
                              : "Click Add Specification Master to define technical attributes."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSpecifications.map((spec) => {
                      const id = spec.id;
                      const isActive = spec.active !== false;
                      const isSelected = selectedIds.includes(id);
                      const options = spec.options || [];

                      return (
                        <tr key={id} className={isSelected ? "row-selected" : ""}>
                          {/* Row Checkbox */}
                          <td style={{ width: 44, textAlign: "center" }}>
                            <input
                              type="checkbox"
                              className="custom-checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(id)}
                            />
                          </td>

                          {/* Name */}
                          <td>
                            <div className="category-name-cell">
                              <strong>{spec.name}</strong>
                              <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                                ID: #{spec.id}
                              </small>
                            </div>
                          </td>

                          {/* Key */}
                          <td>
                            <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", color: "#0f172a" }}>
                              {spec.key}
                            </code>
                          </td>

                          {/* Input Type */}
                          <td>
                            <span className={`spec-type-badge ${String(spec.inputType || "TEXT").toLowerCase().replace(/_/g, "-")}`}>
                              {spec.inputType || "TEXT"}
                            </span>
                          </td>

                          {/* Unit */}
                          <td style={{ textAlign: "center" }}>
                            {spec.unit ? (
                              <span className="spec-unit-tag">{spec.unit}</span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>—</span>
                            )}
                          </td>

                          {/* Options Preview */}
                          <td>
                            {spec.inputType === "DROPDOWN" || spec.inputType === "MULTI_SELECT" ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                {options.length > 0 ? (
                                  <>
                                    {options.slice(0, 3).map((opt, oIdx) => (
                                      <span key={opt.id || oIdx} className="spec-option-pill">
                                        {typeof opt === "string" ? opt : opt.value}
                                      </span>
                                    ))}
                                    {options.length > 3 && (
                                      <button
                                        type="button"
                                        className="subcategory-count-tag"
                                        onClick={() => handleOpenManageOptions(spec)}
                                        title="View all options"
                                      >
                                        +{options.length - 3} more
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>No options seeded</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenManageOptions(spec)}
                                  style={{
                                    fontSize: "11px",
                                    color: "#d97706",
                                    fontWeight: 700,
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    textDecoration: "underline",
                                    marginLeft: "4px",
                                  }}
                                >
                                  Manage ({options.length})
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: "12px" }}>N/A ({spec.inputType})</span>
                            )}
                          </td>

                          {/* Status */}
                          <td style={{ textAlign: "center" }}>
                            <span className={`status-badge-glow ${isActive ? "status-active" : "status-inactive"}`}>
                              <span className="status-dot"></span>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
                              {(spec.inputType === "DROPDOWN" || spec.inputType === "MULTI_SELECT") && (
                                <button
                                  className="icon-action"
                                  onClick={() => handleOpenManageOptions(spec)}
                                  title="Manage Predefined Options"
                                >
                                  <Settings2 size={16} />
                                </button>
                              )}
                              <button
                                className="icon-action"
                                onClick={() => handleOpenEditSpec(spec)}
                                title="Edit Specification Master"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                className="icon-action danger"
                                onClick={() => handleDeleteSpec(spec)}
                                title="Deactivate Specification"
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
      )}

      {/* Tab 2: CATEGORY ↔ SPECIFICATION MAPPING */}
      {activeTab === "MAPPINGS" && (
        <div>
          {/* Category Selector Card */}
          <div className="category-mapping-card">
            <div className="mapping-category-picker">
              <div>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                  Select Marketplace Category to Configure Schema
                </h3>
                <p style={{ fontSize: "12.5px", color: "#64748b" }}>
                  Attributes configured here will dynamically prompt sellers and admins during product submission under this category.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1.5px solid #d97706",
                    fontSize: "13.5px",
                    fontWeight: 700,
                    color: "#92400e",
                    background: "#fef3c7",
                    cursor: "pointer",
                  }}
                >
                  {categories.map((cat) => {
                    const cId = cat.categoryId || cat.id || cat._id;
                    return (
                      <option key={cId} value={cId}>
                        Category #{cId}: {cat.name}
                      </option>
                    );
                  })}
                </select>

                <button className="primary-button" onClick={handleOpenMapModal}>
                  <Plus size={16} />
                  <span>Assign Specification</span>
                </button>
              </div>
            </div>

            {/* Mapped Specifications Table */}
            {categorySpecs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <FolderTree size={40} style={{ color: "#cbd5e1", marginBottom: "10px" }} />
                <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                  No Specifications Assigned Yet
                </h4>
                <p style={{ fontSize: "13px", color: "#64748b", maxWidth: "420px", margin: "6px auto 16px" }}>
                  This category currently has no technical attributes defined. Click below to assign specification masters.
                </p>
                <button className="primary-button" onClick={handleOpenMapModal}>
                  <Plus size={16} />
                  <span>Assign First Specification</span>
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 90, textAlign: "center" }}>Display Order</th>
                      <th style={{ minWidth: 180 }}>Specification Name</th>
                      <th style={{ width: 140 }}>Code / Key</th>
                      <th style={{ width: 140 }}>Input Type</th>
                      <th style={{ width: 100, textAlign: "center" }}>Unit</th>
                      <th style={{ width: 130, textAlign: "center" }}>Mandatory?</th>
                      <th style={{ width: 120, textAlign: "center" }}>Active Status</th>
                      <th style={{ width: 90, textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySpecs.map((cs, idx) => {
                      const specId = cs.id || cs.specificationId;
                      const isMandatory = cs.required === true;
                      const isActive = cs.active !== false;

                      return (
                        <tr key={specId || idx}>
                          {/* Display Order */}
                          <td style={{ textAlign: "center" }}>
                            <input
                              type="number"
                              min="1"
                              value={cs.displayOrder !== undefined ? cs.displayOrder : idx + 1}
                              onChange={(e) =>
                                handleCategorySpecFieldChange(specId, "displayOrder", parseInt(e.target.value, 10) || 1)
                              }
                              style={{
                                width: "60px",
                                textAlign: "center",
                                padding: "4px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontWeight: 700,
                              }}
                            />
                          </td>

                          {/* Name */}
                          <td>
                            <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>
                              {cs.name}
                            </strong>
                            {Array.isArray(cs.options) && cs.options.length > 0 && (
                              <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginTop: "4px" }}>
                                {cs.options.slice(0, 3).map((opt, i) => (
                                  <span key={i} className="spec-option-pill" style={{ fontSize: "10.5px" }}>
                                    {typeof opt === "string" ? opt : opt.value}
                                  </span>
                                ))}
                                {cs.options.length > 3 && (
                                  <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                                    +{cs.options.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Key */}
                          <td>
                            <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>
                              {cs.key}
                            </code>
                          </td>

                          {/* Input Type */}
                          <td>
                            <span className={`spec-type-badge ${String(cs.inputType || "TEXT").toLowerCase().replace(/_/g, "-")}`}>
                              {cs.inputType || "TEXT"}
                            </span>
                          </td>

                          {/* Unit */}
                          <td style={{ textAlign: "center" }}>
                            {cs.unit ? <span className="spec-unit-tag">{cs.unit}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                          </td>

                          {/* Required Toggle */}
                          <td style={{ textAlign: "center" }}>
                            <label className="switch" style={{ transform: "scale(0.85)" }}>
                              <input
                                type="checkbox"
                                checked={isMandatory}
                                onChange={(e) =>
                                  handleCategorySpecFieldChange(specId, "required", e.target.checked)
                                }
                              />
                              <span className="slider round"></span>
                            </label>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: isMandatory ? "#b45309" : "#64748b", marginLeft: "4px" }}>
                              {isMandatory ? "Required *" : "Optional"}
                            </span>
                          </td>

                          {/* Active Toggle */}
                          <td style={{ textAlign: "center" }}>
                            <label className="switch" style={{ transform: "scale(0.85)" }}>
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) =>
                                  handleCategorySpecFieldChange(specId, "active", e.target.checked)
                                }
                              />
                              <span className="slider round"></span>
                            </label>
                          </td>

                          {/* Remove */}
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="icon-action danger"
                              onClick={() => handleRemoveCategoryMapping(specId)}
                              title="Remove from category"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Batch Save Action Bar */}
            {categorySpecs.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <span style={{ fontSize: "12.5px", color: batchDirty ? "#b45309" : "#64748b", fontWeight: 600 }}>
                  {batchDirty ? "⚠️ You have unsaved configuration changes." : "✅ Configuration synchronized."}
                </span>

                <button
                  className="primary-button"
                  style={{ background: batchDirty ? "#10b981" : "#0f172a" }}
                  onClick={handleSaveBatchCategorySpecs}
                  disabled={savingMapping}
                >
                  <Save size={16} />
                  <span>{savingMapping ? "Saving Schema..." : "Batch Save Category Schema (PUT /api/categories/{id}/specifications)"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT SPECIFICATION MASTER */}
      {showSpecModal && (
        <div className="modal-overlay" onClick={() => setShowSpecModal(false)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 580 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}>
                  <SlidersHorizontal size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>{editingSpec ? "Edit Specification Master" : "Create Specification Master"}</h2>
                  <p>{editingSpec ? `Updating ${editingSpec.name}` : "Define a standardized industrial attribute specification"}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setShowSpecModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveSpec}>
              <div className="luxury-modal-body">
                <div className="form-section-card">
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Specification Name <span className="required-star">*</span></label>
                      <input
                        type="text"
                        value={specForm.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSpecForm((prev) => ({
                            ...prev,
                            name: val,
                            key: !prev.key || prev.key === prev.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")
                              ? val.toLowerCase().replace(/[^a-z0-9]+/g, "_")
                              : prev.key,
                          }));
                        }}
                        placeholder="e.g. Grade, Diameter, Yield Strength"
                        required
                      />
                    </div>

                    <div className="input-field-wrap">
                      <label>Field Key / Code <span className="required-star">*</span></label>
                      <input
                        type="text"
                        value={specForm.key}
                        onChange={(e) => setSpecForm((prev) => ({ ...prev, key: e.target.value }))}
                        placeholder="e.g. grade, diameter, yield_strength"
                        required
                      />
                    </div>

                    <div className="input-field-wrap">
                      <label>Input Type <span className="required-star">*</span></label>
                      <select
                        value={specForm.inputType}
                        onChange={(e) => setSpecForm((prev) => ({ ...prev, inputType: e.target.value }))}
                      >
                        {INPUT_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="input-field-wrap">
                      <label>Unit of Measurement (Optional)</label>
                      <input
                        type="text"
                        value={specForm.unit}
                        onChange={(e) => setSpecForm((prev) => ({ ...prev, unit: e.target.value }))}
                        placeholder="e.g. mm, N/mm², kg, meters, volts"
                      />
                    </div>

                    {(specForm.inputType === "DROPDOWN" || specForm.inputType === "MULTI_SELECT") && (
                      <div className="input-field-wrap full-width">
                        <label>Seed Initial Predefined Options</label>
                        <textarea
                          rows={3}
                          value={specForm.optionsInput}
                          onChange={(e) => setSpecForm((prev) => ({ ...prev, optionsInput: e.target.value }))}
                          placeholder="Comma or line separated options (e.g. Fe 415, Fe 500, Fe 550, Fe 550D)"
                        />
                        <small className="field-hint">You can also manage, reorder, and add options later.</small>
                      </div>
                    )}

                    <div className="input-field-wrap full-width">
                      <label className="luxury-checkbox-item">
                        <input
                          type="checkbox"
                          checked={specForm.active}
                          onChange={(e) => setSpecForm((prev) => ({ ...prev, active: e.target.checked }))}
                        />
                        <div className="checkbox-text-info">
                          <strong>Active Specification Master</strong>
                          <span>Allow this specification to be mapped to marketplace categories.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="luxury-modal-footer">
                <button
                  type="button"
                  className="btn-luxury-cancel"
                  onClick={() => setShowSpecModal(false)}
                  disabled={submittingSpec}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-luxury-submit" disabled={submittingSpec}>
                  {submittingSpec ? "Saving Master..." : editingSpec ? "Save Changes" : "Create Master Specification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MANAGE PREDEFINED OPTIONS FOR A SPEC */}
      {optionModalSpec && (
        <div className="modal-overlay" onClick={() => setOptionModalSpec(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  <Settings2 size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Manage Options: {optionModalSpec.name}</h2>
                  <p>Predefined dropdown/selection values for {optionModalSpec.key}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setOptionModalSpec(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              {/* Existing Options List */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Tag size={13} /> Current Options ({(optionModalSpec.options || []).length})
                </div>

                <div className="spec-options-manage-box">
                  {(optionModalSpec.options || []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "#94a3b8", fontSize: "12.5px" }}>
                      No options defined yet. Add the first option below.
                    </div>
                  ) : (
                    (optionModalSpec.options || []).map((opt, idx) => {
                      const optId = typeof opt === "object" ? opt.id : idx + 1;
                      const optVal = typeof opt === "object" ? opt.value : opt;
                      const optOrder = typeof opt === "object" ? opt.displayOrder : idx + 1;

                      return (
                        <div key={optId || idx} className="spec-option-row-item">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 800, color: "#94a3b8", width: "22px" }}>
                              #{optOrder}
                            </span>
                            <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>{optVal}</strong>
                          </div>

                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              className="icon-action"
                              onClick={() => {
                                setEditingOption({ id: optId, value: optVal, displayOrder: optOrder });
                                setNewOptionValue(optVal);
                                setNewOptionOrder(optOrder);
                              }}
                              title="Edit Option"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              className="icon-action danger"
                              onClick={() => handleDeleteOption(optId)}
                              title="Delete Option"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add / Edit Option Form */}
              <form onSubmit={handleAddOrUpdateOption} className="form-section-card">
                <div className="section-card-title">
                  <Plus size={13} /> {editingOption ? "Edit Option" : "Add New Predefined Option"}
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px", display: "block" }}>
                      Option Value (e.g. Fe 600)
                    </label>
                    <input
                      type="text"
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      placeholder="e.g. Fe 600"
                      required
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                      }}
                    />
                  </div>

                  <div style={{ width: "90px" }}>
                    <label style={{ fontSize: "11.5px", fontWeight: 700, color: "#475569", marginBottom: "4px", display: "block" }}>
                      Order #
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newOptionOrder}
                      onChange={(e) => setNewOptionOrder(parseInt(e.target.value, 10) || 1)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                        textAlign: "center",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="primary-button"
                    style={{ padding: "8px 16px", height: "38px" }}
                    disabled={savingOption}
                  >
                    <Plus size={15} />
                    <span>{editingOption ? "Save" : "Add"}</span>
                  </button>

                  {editingOption && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ height: "38px" }}
                      onClick={() => {
                        setEditingOption(null);
                        setNewOptionValue("");
                        setNewOptionOrder((optionModalSpec.options || []).length + 1);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="luxury-modal-footer">
              <button
                type="button"
                className="btn-luxury-submit"
                onClick={() => setOptionModalSpec(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: MAP SPECIFICATION TO CATEGORY */}
      {showMapModal && (
        <div className="modal-overlay" onClick={() => setShowMapModal(false)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  <FolderTree size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Assign Specification to Category</h2>
                  <p>Map attribute to category #{selectedCategoryId}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setShowMapModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveCategoryMapping}>
              <div className="luxury-modal-body">
                <div className="form-section-card">
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap full-width">
                      <label>Select Master Specification <span className="required-star">*</span></label>
                      <select
                        value={mappingSpecId}
                        onChange={(e) => setMappingSpecId(e.target.value)}
                        required
                      >
                        {unmappedMasterSpecs.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.key}) — {s.inputType} {s.unit ? `[${s.unit}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="input-field-wrap">
                      <label>Display Sort Order</label>
                      <input
                        type="number"
                        min="1"
                        value={mappingOrder}
                        onChange={(e) => setMappingOrder(parseInt(e.target.value, 10) || 1)}
                      />
                    </div>

                    <div className="input-field-wrap">
                      <label>Mandatory Field?</label>
                      <select
                        value={mappingRequired ? "true" : "false"}
                        onChange={(e) => setMappingRequired(e.target.value === "true")}
                      >
                        <option value="true">Yes (Required *)</option>
                        <option value="false">No (Optional)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="luxury-modal-footer">
                <button
                  type="button"
                  className="btn-luxury-cancel"
                  onClick={() => setShowMapModal(false)}
                  disabled={savingMapping}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-luxury-submit" disabled={savingMapping}>
                  {savingMapping ? "Assigning..." : "Assign Specification (POST /api/categories/{id}/specifications)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
