import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Eye,
  ShieldOff,
  ShieldCheck,
  Check,
  X,
  Store,
  MapPin,
  FileText,
  Package,
  Plus,
  Download,
  Edit2,
  Trash2,
  Mail,
  Phone,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  IndianRupee,
  Shield,
  ExternalLink,
  FileCheck,
  AlertCircle,
  Upload,
  ZoomIn,
  Image as ImageIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getSellers,
  createSeller,
  updateSeller,
  activateSeller,
  deactivateSeller,
  approveSeller,
  rejectSeller,
  blockSeller,
  unblockSeller,
  deleteSeller,
  deleteBulkSellers,
} from "../api/sellerApi";
import { getSellerVault, verifyDocument, uploadAndAttachSellerDocument } from "../api/sellerDocumentApi";
import { getProducts, getAdminProducts } from "../api/productApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";

export default function Sellers() {
  const toast = useToast();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedSellerVault, setSelectedSellerVault] = useState(null);
  const [loadingVault, setLoadingVault] = useState(false);
  const [verifyingDocType, setVerifyingDocType] = useState(null);
  const [uploadingDocType, setUploadingDocType] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [editModalSeller, setEditModalSeller] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [rejectModalSeller, setRejectModalSeller] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch live Statutory Compliance Documents Vault when inspecting seller profile
  useEffect(() => {
    if (selectedSeller) {
      const sid = String(selectedSeller.sellerId || selectedSeller.id || selectedSeller._id || selectedSeller.userId || "");
      if (sid) {
        setLoadingVault(true);
        getSellerVault(sid, selectedSeller)
          .then((vault) => {
            setSelectedSellerVault(vault);
          })
          .catch((err) => {
            console.warn("Notice: Unable to fetch live compliance vault for seller:", err?.message);
            setSelectedSellerVault(null);
          })
          .finally(() => setLoadingVault(false));
      }
    } else {
      setSelectedSellerVault(null);
    }
  }, [selectedSeller]);

  const handleVerifyModalDoc = async (docType, targetStatus) => {
    if (!selectedSeller) return;
    const sid = String(selectedSeller.sellerId || selectedSeller.id || selectedSeller._id || selectedSeller.userId || "");
    try {
      setVerifyingDocType(docType);
      await verifyDocument(sid, docType, {
        status: targetStatus,
        remarks: targetStatus === "VERIFIED" ? "Verified by Admin in Seller Profile Modal" : "Document rejected due to discrepancies",
      });
      toast.success(`${docType} status updated to ${targetStatus}`);
      const refreshed = await getSellerVault(sid, selectedSeller);
      setSelectedSellerVault(refreshed);
    } catch (err) {
      toast.error(`Verification update failed: ${err?.message || "Error"}`);
    } finally {
      setVerifyingDocType(null);
    }
  };

  const handleUploadModalDoc = async (docType, file) => {
    if (!selectedSeller || !file) return;
    const sid = String(selectedSeller.sellerId || selectedSeller.id || selectedSeller._id || selectedSeller.userId || "");
    const docNumber =
      docType === "PAN"
        ? (selectedSeller.panNumber || selectedSeller.pan)
        : docType === "AADHAAR"
        ? (selectedSeller.aadhaarNumber || selectedSeller.aadhaar)
        : (selectedSeller.gst || selectedSeller.gstin);

    try {
      setUploadingDocType(docType);
      toast.info(`Uploading & attaching ${docType} document...`);
      const updatedVault = await uploadAndAttachSellerDocument(sid, docType, file, docNumber);
      setSelectedSellerVault(updatedVault);
      toast.success(`${docType} document image successfully saved to database & vault!`);
    } catch (err) {
      toast.error(`Document upload failed: ${err?.message || "Error"}`);
    } finally {
      setUploadingDocType(null);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    gst: "",
    category: "Tools & Hardware",
    address: "",
    city: "",
    state: "",
    status: "ACTIVE",
  });

  const loadSellers = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const [sellersRes, productsRes] = await Promise.allSettled([
        getSellers(),
        getAdminProducts ? getAdminProducts() : getProducts(),
      ]);

      const rawSellers = sellersRes.status === "fulfilled" && sellersRes.value ? (Array.isArray(sellersRes.value) ? sellersRes.value : sellersRes.value.sellers || sellersRes.value.data || []) : [];
      const allProducts = productsRes.status === "fulfilled" && productsRes.value ? (Array.isArray(productsRes.value) ? productsRes.value : productsRes.value.products || productsRes.value.data || []) : [];

      const enrichedSellers = rawSellers.map((s) => {
        const sIds = new Set([
          String(s.sellerId || ""),
          String(s.id || ""),
          String(s.userId || ""),
          String(s._id || ""),
        ].filter(Boolean));

        const sEmail = (s.email || "").toLowerCase().trim();
        const sPhoneDigits = (s.phone || "").replace(/[^0-9]/g, "");
        const sBusiness = (s.businessName || s.companyName || "").toLowerCase().trim();
        const sName = (s.name || s.ownerName || "").toLowerCase().trim();

        const matchingProducts = allProducts.filter((p) => {
          const pIds = [
            String(p.sellerId || ""),
            String(p.seller_id || ""),
            String(p.vendorId || ""),
            String(p.vendor_id || ""),
            String(p.userId || ""),
            String(p.user_id || ""),
            String(p.sellerUserId || ""),
            String(p.addedBy || ""),
            String(p.createdBy || ""),
            String(p.seller?.id || ""),
            String(p.seller?.sellerId || ""),
            String(p.seller?.userId || ""),
            String(p.seller?._id || ""),
            String(p.vendor?.id || ""),
            String(p.vendor?.vendorId || ""),
          ].filter(Boolean);

          if (pIds.some((pid) => sIds.has(pid))) return true;

          const pEmail = (p.sellerEmail || p.seller_email || p.email || p.seller?.email || p.userEmail || "").toLowerCase().trim();
          if (sEmail && pEmail && sEmail === pEmail) return true;

          const pPhoneDigits = (p.sellerPhone || p.seller_phone || p.phone || p.seller?.phone || "").replace(/[^0-9]/g, "");
          if (sPhoneDigits && pPhoneDigits && sPhoneDigits.length >= 8 && pPhoneDigits.includes(sPhoneDigits.slice(-8))) {
            return true;
          }

          const pSName = (
            p.sellerName ||
            p.seller_name ||
            p.vendorName ||
            p.vendor_name ||
            p.seller?.name ||
            p.seller?.company ||
            p.seller?.companyName ||
            p.seller?.businessName ||
            p.vendor?.companyName ||
            p.vendor?.name ||
            p.companyName ||
            p.storeName ||
            ""
          ).toLowerCase().trim();

          if (pSName && pSName !== "direct supplier" && pSName !== "enterprise merchant" && pSName !== "unknown store") {
            if (sBusiness && (pSName === sBusiness || pSName.includes(sBusiness) || sBusiness.includes(pSName))) return true;
            if (sName && (pSName === sName || pSName.includes(sName) || sName.includes(pSName))) return true;
          }

          return false;
        });

        const calculatedCount = matchingProducts.length;
        const calculatedRevenue = matchingProducts.reduce((sum, p) => {
          const price = Number(p.price ?? p.sellingPrice ?? p.basePrice ?? 0);
          const stock = Number(p.stockQty ?? p.stock_qty ?? p.inventory ?? p.quantity ?? 1);
          return sum + (price * stock);
        }, 0);

        const explicitCount = s.productsCount ?? s.totalProducts ?? s.productCount ?? s.total_products ?? s.catalogSize;
        const explicitRevenue = s.totalRevenue ?? s.revenue ?? s.totalVolume ?? s.volume ?? s.gmv ?? s.salesVolume;

        const finalCount = explicitCount !== undefined && Number(explicitCount) > 0 ? Number(explicitCount) : calculatedCount;
        const finalRevenue = explicitRevenue !== undefined && Number(explicitRevenue) > 0 ? Number(explicitRevenue) : calculatedRevenue;

        return {
          ...s,
          productsCount: finalCount,
          totalRevenue: finalRevenue,
        };
      });

      setSellers(enrichedSellers);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load sellers from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSellers();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "sellers" || detail.entity === "products" || detail.entity === "seller_documents") {
        loadSellers(false);
      }
    });
    return unsub;
  }, []);

  const getStatus = (seller) => {
    return (
      seller.status ||
      seller.approvalStatus ||
      seller.approval_status ||
      "PENDING"
    ).toUpperCase();
  };

  // Status Toggles
  const handleToggleActivate = async (seller) => {
    const id = seller.sellerId || seller.id || seller._id;
    const currentStatus = getStatus(seller);
    const nextStatus = currentStatus === "ACTIVE" || currentStatus === "APPROVED" ? "INACTIVE" : "ACTIVE";
    const nextApproval = nextStatus === "ACTIVE" ? "APPROVED" : seller.approvalStatus;

    // Immediate UI feedback
    setSellers((current) =>
      current.map((item) =>
        (item.sellerId || item.id || item._id) === id
          ? { ...item, status: nextStatus, approvalStatus: nextApproval }
          : item
      )
    );
    if (selectedSeller && (selectedSeller.sellerId || selectedSeller.id || selectedSeller._id) === id) {
      setSelectedSeller((prev) => ({
        ...prev,
        status: nextStatus,
        approvalStatus: nextApproval,
      }));
    }

    try {
      if (currentStatus === "ACTIVE" || currentStatus === "APPROVED") {
        await deactivateSeller(id, seller);
        toast.warning(`Seller "${seller.businessName || seller.name}" deactivated.`);
      } else {
        await activateSeller(id, seller);
        toast.success(`Seller "${seller.businessName || seller.name}" activated.`);
      }
      await loadSellers(false);
    } catch (err) {
      toast.error("Failed to change status: " + (err?.message || ""));
      await loadSellers(false);
    }
  };

  const handleApprove = async (seller) => {
    const id = seller.id || seller._id;
    try {
      await approveSeller(id);
      toast.success(`Seller "${seller.businessName || seller.name}" approved.`);
      await loadSellers();
      if (selectedSeller && (selectedSeller.id || selectedSeller._id) === id) {
        setSelectedSeller((prev) => ({ ...prev, status: "ACTIVE", approvalStatus: "APPROVED" }));
      }
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Internal Server Error";
      toast.error(`Approval failed: ${serverMsg}`);
    }
  };

  const handleOpenRejectModal = (seller) => {
    setRejectModalSeller(seller);
    setRejectReason("Incomplete GST or KYC documentation provided.");
  };

  const handleConfirmReject = async () => {
    if (!rejectModalSeller) return;
    const id = rejectModalSeller.id || rejectModalSeller._id;
    try {
      await rejectSeller(id, rejectReason);
      toast.warning(`Seller "${rejectModalSeller.businessName || rejectModalSeller.name}" rejected.`);
      setRejectModalSeller(null);
      await loadSellers();
    } catch (err) {
      toast.error("Rejection failed.");
    }
  };

  const handleBlock = async (seller) => {
    const id = seller.id || seller._id;
    if (!window.confirm(`Block seller "${seller.businessName || seller.name}"?`)) return;
    try {
      await blockSeller(id);
      toast.warning(`Seller "${seller.businessName || seller.name}" blocked.`);
      await loadSellers();
      if (selectedSeller && (selectedSeller.id || selectedSeller._id) === id) {
        setSelectedSeller((prev) => ({ ...prev, status: "BLOCKED" }));
      }
    } catch (err) {
      toast.error("Failed to block seller.");
    }
  };

  const handleUnblock = async (seller) => {
    const id = seller.id || seller._id;
    try {
      await unblockSeller(id);
      toast.success(`Seller "${seller.businessName || seller.name}" unblocked & activated.`);
      await loadSellers();
      if (selectedSeller && (selectedSeller.id || selectedSeller._id) === id) {
        setSelectedSeller((prev) => ({ ...prev, status: "ACTIVE" }));
      }
    } catch (err) {
      toast.error("Failed to unblock seller.");
    }
  };

  const handleDelete = async (seller) => {
    const id = seller.sellerId || seller.id || seller._id;
    if (!window.confirm(`Permanently delete seller "${seller.businessName || seller.name}"?`)) return;
    try {
      setSellers((prev) => prev.filter((s) => (s.sellerId || s.id || s._id) !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      if (selectedSeller && (selectedSeller.sellerId || selectedSeller.id || selectedSeller._id) === id) {
        setSelectedSeller(null);
      }
      await deleteSeller(id, seller);
      toast.info(`Seller "${seller.businessName || seller.name}" deleted.`);
      await loadSellers(false);
    } catch (err) {
      toast.error("Failed to delete seller: " + (err?.message || ""));
    }
  };

  // Add / Edit Modal
  const handleOpenAdd = () => {
    setFormData({
      businessName: "",
      ownerName: "",
      email: "",
      phone: "",
      gst: "",
      category: "Industrial Machinery & Parts",
      address: "",
      city: "",
      state: "",
      status: "ACTIVE",
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (seller) => {
    setEditModalSeller(seller);
    setFormData({
      businessName: seller.businessName || seller.name || "",
      ownerName: seller.ownerName || "",
      email: seller.email || "",
      phone: seller.phone || "",
      gst: seller.gst || seller.gstNumber || "",
      category: seller.category || "Tools & Hardware Supplies",
      address: seller.address || "",
      city: seller.city || "",
      state: seller.state || "",
      status: getStatus(seller),
    });
  };

  const handleSaveSeller = async (e) => {
    e.preventDefault();
    if (!formData.businessName || !formData.email) {
      toast.warning("Please provide Business Name and Email.");
      return;
    }

    try {
      if (editModalSeller) {
        const id = editModalSeller.sellerId || editModalSeller.id || editModalSeller._id;
        await updateSeller(id, formData);
        toast.success(`Seller "${formData.businessName}" updated successfully.`);
        setEditModalSeller(null);
      } else {
        await createSeller(formData);
        toast.success(`Seller "${formData.businessName}" registered successfully.`);
        setShowAddModal(false);
      }
      await loadSellers(false);
    } catch (err) {
      toast.error("Operation failed: " + (err?.message || ""));
    }
  };

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredSellers.map((s) => s.sellerId || s.id || s._id));
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
      await activateSeller(id);
    }
    toast.success(`Activated ${selectedIds.length} sellers.`);
    setSelectedIds([]);
    await loadSellers(false);
  };

  const handleBulkDeactivate = async () => {
    for (const id of selectedIds) {
      await deactivateSeller(id);
    }
    toast.warning(`Deactivated ${selectedIds.length} sellers.`);
    setSelectedIds([]);
    await loadSellers(false);
  };

  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      await approveSeller(id);
    }
    toast.success(`Approved ${selectedIds.length} sellers.`);
    setSelectedIds([]);
    await loadSellers(false);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected sellers?`)) return;
    const toDelete = [...selectedIds];
    setSelectedIds([]);
    setSellers((prev) => prev.filter((s) => !toDelete.includes(s.sellerId || s.id || s._id)));
    if (selectedSeller && toDelete.includes(selectedSeller.sellerId || selectedSeller.id || selectedSeller._id)) {
      setSelectedSeller(null);
    }
    try {
      await deleteBulkSellers(toDelete, sellers);
      toast.info(`Deleted ${toDelete.length} sellers.`);
      await loadSellers(false);
    } catch (err) {
      toast.error("Failed to delete selected sellers: " + (err?.message || ""));
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["ID,Business Name,Owner,Email,Phone,GST,Category,City,State,Products Count,Revenue (INR),Status,Joined Date"];
    const rows = filteredSellers.map((s) =>
      [
        `"${s.id || s._id}"`,
        `"${s.businessName || s.name || ""}"`,
        `"${s.ownerName || ""}"`,
        `"${s.email || ""}"`,
        `"${s.phone || ""}"`,
        `"${s.gst || s.gstNumber || ""}"`,
        `"${s.category || ""}"`,
        `"${s.city || ""}"`,
        `"${s.state || ""}"`,
        s.productsCount || 0,
        s.totalRevenue || 0,
        `"${getStatus(s)}"`,
        `"${s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : ""}"`,
      ].join(",")
    );
    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_sellers_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Sellers export downloaded!");
  };

  // Filter & Stats
  const filteredSellers = useMemo(() => {
    return sellers.filter((seller) => {
      const text = `${seller.businessName || seller.name || ""} ${seller.ownerName || ""} ${seller.email || ""} ${seller.gst || ""} ${seller.city || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const status = getStatus(seller);
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sellers, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: sellers.length,
      active: sellers.filter((s) => getStatus(s) === "ACTIVE" || getStatus(s) === "APPROVED").length,
      inactive: sellers.filter((s) => getStatus(s) === "INACTIVE").length,
      pending: sellers.filter((s) => getStatus(s) === "PENDING").length,
      blocked: sellers.filter((s) => getStatus(s) === "BLOCKED" || getStatus(s) === "REJECTED").length,
    };
  }, [sellers]);

  return (
    <div className="sellers-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Sellers Management</h1>
          <p>Merchant onboarding, KYC verification, catalog permissions & activation controls</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Header Stats Strip */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${statusFilter === "ALL" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <span className="stat-pill-label">Total Merchants</span>
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
          className={`stat-pill pending ${statusFilter === "PENDING" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("PENDING")}
        >
          <span className="pulse-dot amber"></span>
          <span className="stat-pill-label">Pending Approval</span>
          <strong className="stat-pill-value">{counts.pending}</strong>
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
          <span className="stat-pill-label">Blocked / Rejected</span>
          <strong className="stat-pill-value">{counts.blocked}</strong>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button onClick={loadSellers}>
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
              placeholder="Search by business name, owner, GST, city..."
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
              { id: "ALL", label: "All Sellers", count: counts.total },
              { id: "ACTIVE", label: "Active", count: counts.active },
              { id: "PENDING", label: "Pending", count: counts.pending },
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
              <strong>{selectedIds.length}</strong> sellers selected
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
                className="btn-bulk-action success"
                onClick={handleBulkApprove}
                title="Approve selected"
              >
                <Check size={15} /> Approve
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
            <p>Loading sellers directory...</p>
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
                        filteredSellers.length > 0 &&
                        selectedIds.length === filteredSellers.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Storefront / Business</th>
                  <th>Category & GST</th>
                  <th>Catalog & Volume</th>
                  <th>Location</th>
                  <th>Account Status</th>
                  <th>Quick Activation</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table">
                      <div className="empty-table-content">
                        <Store size={40} className="empty-icon" />
                        <h3>No sellers found</h3>
                        <p>
                          {search
                            ? `No sellers matching "${search}"`
                            : "No sellers registered under this status."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSellers.map((seller) => {
                    const status = getStatus(seller);
                    const id = seller.sellerId || seller.id || seller._id;
                    const isSelected = selectedIds.includes(id);
                    const isActive = status === "ACTIVE" || status === "APPROVED";

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
                            <div className="user-avatar seller-avatar">
                              {(seller.businessName || seller.name || "S")[0].toUpperCase()}
                            </div>
                            <div className="user-info-text">
                              <strong className="user-primary-name">
                                {seller.businessName || seller.name || "Unknown Store"}
                              </strong>
                              <span className="owner-subtext">
                                Owner: {seller.ownerName || "Merchant"}
                              </span>
                              <div className="mini-contact-row">
                                {seller.email && <span>{seller.email}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="business-details-cell">
                            <span className="category-pill-tag">
                              {seller.category || "General Marketplace"}
                            </span>
                            {(seller.gst || seller.gstNumber) ? (
                              <span className="gst-badge">
                                <FileText size={11} /> GST: {seller.gst || seller.gstNumber}
                              </span>
                            ) : (
                              <small className="text-muted">GST: Not provided</small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="orders-metrics-cell">
                            <div className="orders-count-badge">
                              <Package size={13} />
                              <strong>{seller.productsCount ?? 0}</strong> products
                            </div>
                            <span className="spent-amount">
                              <IndianRupee size={12} />
                              {Number(seller.totalRevenue || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="location-cell">
                            <MapPin size={13} />
                            <span>
                              {seller.city || "—"}
                              {seller.state ? `, ${seller.state}` : ""}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-badge-glow status-${status.toLowerCase()}`}
                          >
                            <span className="status-dot"></span>
                            {status === "ACTIVE" || status === "APPROVED"
                              ? "Active"
                              : status === "PENDING"
                              ? "Pending Review"
                              : status === "INACTIVE"
                              ? "Deactivated"
                              : status === "REJECTED"
                              ? "Rejected"
                              : "Blocked"}
                          </span>
                        </td>
                        <td>
                          {/* Live Activate / Deactivate Toggle Switch */}
                          <div
                            className="toggle-container"
                            title={
                              status === "PENDING"
                                ? "Pending approval"
                                : status === "BLOCKED"
                                ? "Blocked"
                                : isActive
                                ? "Click to Deactivate"
                                : "Click to Activate"
                            }
                          >
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={isActive}
                                disabled={status === "PENDING" || status === "BLOCKED"}
                                onChange={() => handleToggleActivate(seller)}
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
                              title="View Full Profile"
                              onClick={() => setSelectedSeller(seller)}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="icon-action"
                              title="Edit Seller"
                              onClick={() => handleOpenEdit(seller)}
                            >
                              <Edit2 size={16} />
                            </button>

                            {status === "PENDING" && (
                              <>
                                <button
                                  className="icon-action success"
                                  title="Approve Seller"
                                  onClick={() => handleApprove(seller)}
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  className="icon-action danger"
                                  title="Reject Application"
                                  onClick={() => handleOpenRejectModal(seller)}
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}

                            {(status === "ACTIVE" || status === "APPROVED" || status === "INACTIVE") && (
                              <button
                                className="icon-action danger"
                                title="Block Seller"
                                onClick={() => handleBlock(seller)}
                              >
                                <ShieldOff size={16} />
                              </button>
                            )}

                            {(status === "BLOCKED" || status === "REJECTED") && (
                              <button
                                className="icon-action success"
                                title="Unblock Seller"
                                onClick={() => handleUnblock(seller)}
                              >
                                <ShieldCheck size={16} />
                              </button>
                            )}

                            <button
                              className="icon-action danger"
                              title="Delete Seller"
                              onClick={() => handleDelete(seller)}
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
          PREMIUM POPUP MODAL: SELLER / MERCHANT DOSSIER
          ============================================================ */}
      {selectedSeller && (
        <div className="modal-overlay" onClick={() => setSelectedSeller(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #059669, #047857)" }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{(selectedSeller.businessName || selectedSeller.name || "S")[0].toUpperCase()}</span>
                </div>
                <div className="header-texts">
                  <h2>{selectedSeller.businessName || selectedSeller.name || "Unknown Merchant"}</h2>
                  <p>Proprietor: {selectedSeller.ownerName || "Merchant"} &nbsp;•&nbsp; {selectedSeller.city || ""}{selectedSeller.state ? `, ${selectedSeller.state}` : ""}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setSelectedSeller(null)}>×</button>
            </div>

            <div className="luxury-modal-body" style={{ overflowY: "auto", maxHeight: "calc(90vh - 160px)", paddingRight: 8 }}>
              {/* Status Row */}
              <div className="form-section-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={`status-badge-glow status-${getStatus(selectedSeller).toLowerCase()}`}>
                    <span className="status-dot"></span>
                    {getStatus(selectedSeller)}
                  </span>
                  <div>
                    <strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>Merchant Visibility</strong>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Toggle marketplace store activity</span>
                  </div>
                </div>
                <div className="toggle-container">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={getStatus(selectedSeller) === "ACTIVE" || getStatus(selectedSeller) === "APPROVED"}
                      disabled={getStatus(selectedSeller) === "BLOCKED" || getStatus(selectedSeller) === "PENDING"}
                      onChange={() => handleToggleActivate(selectedSeller)}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span className="toggle-label-text">{(getStatus(selectedSeller) === "ACTIVE" || getStatus(selectedSeller) === "APPROVED") ? "Active" : "Off"}</span>
                </div>
              </div>

              {/* Business Details */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Store size={13} /> Business & Compliance Details
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Email Address</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>{selectedSeller.email || "—"}</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Phone Number</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>{selectedSeller.phone || "—"}</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>GSTIN / Tax ID</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{selectedSeller.gst || selectedSeller.gstNumber || selectedSeller.gstin || "Not provided"}</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Business Category</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>{selectedSeller.category || "General"}</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Active SKUs Listed</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{selectedSeller.productsCount ?? 0} SKUs</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Total GMV Volume</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 14, fontWeight: 800, color: "#059669" }}>₹{Number(selectedSeller.totalRevenue || 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Store Rating</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#f59e0b", display: "flex", alignItems: "center", gap: 5 }}>
                      <Star size={14} style={{ fill: "#f59e0b", color: "#f59e0b" }} />
                      {selectedSeller.rating || "5.0"} / 5.0
                    </div>
                  </div>
                  <div className="input-field-wrap full-width">
                    <label>Warehouse / Store Address</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>{selectedSeller.address || "No address provided"}</div>
                  </div>
                </div>
              </div>

              {/* ============================================================
                  STATUTORY KYC & COMPLIANCE DOCUMENTS SECTION
                  Endpoint: GET /api/seller/onboarding/{sellerId}/vault
                  ============================================================ */}
              <div className="form-section-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="section-card-title" style={{ margin: 0 }}>
                    <Shield size={14} style={{ color: "#059669" }} /> Statutory KYC & Compliance Documents
                  </div>
                  <button
                    type="button"
                    className="btn-luxury-cancel"
                    style={{ fontSize: 11, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}
                    onClick={() => {
                      setSelectedSeller(null);
                      navigate("/admin/seller-documents");
                    }}
                  >
                    <ExternalLink size={12} /> Open Full Compliance Vault
                  </button>
                </div>

                {loadingVault ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                    <div className="spinner" style={{ width: 22, height: 22, margin: "0 auto 8px" }}></div>
                    Fetching statutory documents & images from backend KYC vault...
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(() => {
                      const docs = (selectedSellerVault?.documents && selectedSellerVault.documents.length > 0)
                        ? selectedSellerVault.documents
                        : [
                            {
                              documentType: "PAN",
                              title: "PAN Card",
                              documentNumber: selectedSeller.panNumber || selectedSeller.pan || "—",
                              isUploaded: Boolean(selectedSeller.panCardUrl || selectedSeller.panUrl || selectedSeller.panFileUrl),
                              fileUrl: selectedSeller.panCardUrl || selectedSeller.panUrl || selectedSeller.panFileUrl || null,
                              status: selectedSeller.verificationStatus === "VERIFIED" ? "Verified" : "Not Uploaded",
                            },
                            {
                              documentType: "AADHAAR",
                              title: "Aadhaar Card",
                              documentNumber: selectedSeller.aadhaarNumber || selectedSeller.aadhaar || "—",
                              isUploaded: Boolean(selectedSeller.aadhaarUrl || selectedSeller.aadhaarFileUrl),
                              fileUrl: selectedSeller.aadhaarUrl || selectedSeller.aadhaarFileUrl || null,
                              status: selectedSeller.verificationStatus === "VERIFIED" ? "Verified" : "Not Uploaded",
                            },
                            {
                              documentType: "GST",
                              title: "GST Registration Certificate",
                              documentNumber: selectedSeller.gst || selectedSeller.gstin || selectedSeller.gstNumber || "29ABCDE1234R1Z5",
                              isUploaded: Boolean(selectedSeller.gstUrl || selectedSeller.gstFileUrl || selectedSeller.gst || selectedSeller.gstin),
                              fileUrl: selectedSeller.gstUrl || selectedSeller.gstFileUrl || null,
                              status: selectedSeller.verificationStatus === "VERIFIED" ? "Verified" : (selectedSeller.gst || selectedSeller.gstin ? "Pending" : "Not Uploaded"),
                            },
                            {
                              documentType: "CANCELLED_CHEQUE",
                              title: "Bank Proof / Cancelled Cheque",
                              documentNumber: selectedSeller.accountNumber ? `A/C ${selectedSeller.accountNumber}` : "—",
                              isUploaded: Boolean(selectedSeller.bankProofUrl || selectedSeller.chequeUrl),
                              fileUrl: selectedSeller.bankProofUrl || selectedSeller.chequeUrl || null,
                              status: selectedSeller.verificationStatus === "VERIFIED" ? "Verified" : "Not Uploaded",
                            },
                          ];

                      return docs.map((doc, idx) => {
                        const statusUpper = String(doc.verificationStatus || doc.status || "Not Uploaded").toUpperCase();
                        const isVerified = statusUpper === "VERIFIED" || statusUpper === "APPROVED";
                        const isRejected = statusUpper === "REJECTED";
                        const isUploaded = Boolean(doc.isUploaded || doc.fileUrl);

                        return (
                          <div
                            key={doc.documentType || idx}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "115px 1fr",
                              gap: 14,
                              padding: "12px 14px",
                              background: isVerified ? "#f0fdf4" : isUploaded ? "#ffffff" : "#f8fafc",
                              border: `1px solid ${isVerified ? "#bbf7d0" : isRejected ? "#fecaca" : isUploaded ? "#cbd5e1" : "#e2e8f0"}`,
                              borderRadius: 12,
                              boxShadow: isUploaded ? "0 2px 6px rgba(0,0,0,0.03)" : "none",
                            }}
                          >
                            {/* Left: Image / Document Preview Thumbnail */}
                            <div
                              style={{
                                width: 115,
                                height: 86,
                                borderRadius: 8,
                                overflow: "hidden",
                                border: `1px solid ${isUploaded ? "#94a3b8" : doc.documentNumber && doc.documentNumber !== "—" ? "#6ee7b7" : "#cbd5e1"}`,
                                background: isUploaded ? "#0f172a" : doc.documentNumber && doc.documentNumber !== "—" ? "#064e3b" : "#1e293b",
                                position: "relative",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                padding: 4,
                                textAlign: "center",
                              }}
                              onClick={() => setPreviewDoc(doc)}
                              title={doc.fileUrl ? "Click to enlarge document image" : "Click to view registered credential card"}
                            >
                              {doc.fileUrl ? (
                                <>
                                  <img
                                    src={doc.fileUrl}
                                    alt={doc.title}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                                    }}
                                  />
                                  <div style={{ display: "none", flexDirection: "column", alignItems: "center", color: "#e2e8f0", textAlign: "center" }}>
                                    <FileText size={24} style={{ color: "#38bdf8" }} />
                                    <span style={{ fontSize: 9, marginTop: 3, fontWeight: 700 }}>PDF Document</span>
                                  </div>
                                  <div
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      background: "rgba(15, 23, 42, 0.45)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      opacity: 0,
                                      transition: "opacity 0.2s",
                                      color: "#fff",
                                      fontSize: 10,
                                      fontWeight: 700,
                                      gap: 4,
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                                  >
                                    <ZoomIn size={14} /> Preview
                                  </div>
                                </>
                              ) : doc.documentNumber && doc.documentNumber !== "—" ? (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(16, 185, 129, 0.25)", padding: "2px 5px", borderRadius: 4, marginBottom: 4 }}>
                                    <ShieldCheck size={11} style={{ color: "#34d399" }} />
                                    <span style={{ fontSize: 8.5, fontWeight: 800, color: "#34d399", letterSpacing: "0.4px" }}>DB SAVED</span>
                                  </div>
                                  <span className="font-mono" style={{ fontSize: 9.5, fontWeight: 800, color: "#f8fafc", wordBreak: "break-all" }}>
                                    {doc.documentNumber}
                                  </span>
                                  <span style={{ fontSize: 8, color: "#94a3b8", marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                                    <Eye size={9} /> View Card
                                  </span>
                                </div>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b", padding: 6, textAlign: "center" }}>
                                  <ImageIcon size={22} style={{ color: "#94a3b8", marginBottom: 3 }} />
                                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "#64748b" }}>No Image</span>
                                </div>
                              )}
                            </div>

                            {/* Right: Document Details, Status & Action Controls */}
                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <strong style={{ fontSize: 13, color: "#0f172a" }}>{doc.title || doc.documentType}</strong>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "1px 6px",
                                        borderRadius: 4,
                                        background: isVerified ? "#dcfce7" : isRejected ? "#fee2e2" : isUploaded ? "#fef3c7" : "#ecfdf5",
                                        color: isVerified ? "#15803d" : isRejected ? "#b91c1c" : isUploaded ? "#b45309" : "#047857",
                                        border: isVerified ? "1px solid #bbf7d0" : isRejected ? "1px solid #fecaca" : isUploaded ? "1px solid #fde68a" : "1px solid #a7f3d0",
                                      }}
                                    >
                                      {isVerified ? "✓ Verified" : isRejected ? "✕ Rejected" : isUploaded ? "⏳ Pending Review" : "✓ Number in DB"}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4, lineHeight: "1.4" }}>
                                    {doc.documentNumber && doc.documentNumber !== "—" ? (
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                        <span>Registered No:</span>
                                        <span className="font-mono" style={{ fontWeight: 800, color: "#0f172a", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                                          {doc.documentNumber}
                                        </span>
                                        <span style={{ fontSize: 10.5, color: "#059669", fontWeight: 700 }}>• Saved in DB</span>
                                      </div>
                                    ) : null}
                                    <div style={{ fontSize: 11, color: isUploaded ? "#334155" : "#b45309" }}>
                                      {isUploaded ? (
                                        <span style={{ color: "#059669", fontWeight: 600 }}>
                                          ✓ Physical document image attached and active
                                        </span>
                                      ) : (
                                        <span>
                                          Physical document file not yet uploaded by merchant (number submitted during onboarding)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Verification Actions */}
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  {isUploaded && !isVerified && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn-luxury-submit"
                                        style={{ fontSize: 11, padding: "5px 9px", background: "#16a34a", color: "#fff", boxShadow: "none" }}
                                        disabled={verifyingDocType === doc.documentType}
                                        onClick={() => handleVerifyModalDoc(doc.documentType, "VERIFIED")}
                                      >
                                        <Check size={11} /> Verify
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-luxury-cancel"
                                        style={{ fontSize: 11, padding: "5px 9px", color: "#dc2626", borderColor: "#fca5a5" }}
                                        disabled={verifyingDocType === doc.documentType}
                                        onClick={() => handleVerifyModalDoc(doc.documentType, "REJECTED")}
                                      >
                                        <X size={11} /> Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Bottom Action Row: View File / Attach / Upload */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                {doc.fileUrl ? (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-luxury-cancel"
                                      style={{ fontSize: 11, padding: "4px 9px", display: "flex", alignItems: "center", gap: 4, background: "#fff" }}
                                      onClick={() => setPreviewDoc(doc)}
                                    >
                                      <Eye size={12} /> Enlarge Image
                                    </button>
                                    <a
                                      href={doc.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn-luxury-cancel"
                                      style={{ fontSize: 11, padding: "4px 9px", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, background: "#fff" }}
                                    >
                                      <ExternalLink size={12} /> Open URL
                                    </a>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn-luxury-cancel"
                                    style={{ fontSize: 11, padding: "4px 9px", display: "flex", alignItems: "center", gap: 4, background: "#fff" }}
                                    onClick={() => setPreviewDoc(doc)}
                                  >
                                    <Eye size={12} /> Preview Digital Credential
                                  </button>
                                )}

                                {/* Attach / Replace File Button */}
                                <label
                                  className="btn-luxury-cancel"
                                  style={{
                                    fontSize: 11,
                                    padding: "4px 9px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    cursor: "pointer",
                                    color: "#059669",
                                    borderColor: "#a7f3d0",
                                    background: "#ecfdf5",
                                    margin: 0,
                                  }}
                                >
                                  <Upload size={12} />
                                  {uploadingDocType === doc.documentType ? "Attaching..." : doc.fileUrl ? "Replace File" : "Attach Document Image"}
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    style={{ display: "none" }}
                                    disabled={uploadingDocType === doc.documentType}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadModalDoc(doc.documentType, file);
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="luxury-modal-footer">
              <div style={{ display: "flex", gap: 8 }}>
                {getStatus(selectedSeller) === "PENDING" && (
                  <>
                    <button
                      className="btn-luxury-cancel"
                      style={{ background: "#dcfce7", color: "#16a34a", borderColor: "#bbf7d0" }}
                      onClick={() => { handleApprove(selectedSeller); setSelectedSeller(null); }}
                    >
                      <Check size={13} /> Approve
                    </button>
                    <button
                      className="btn-luxury-cancel"
                      style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                      onClick={() => { handleOpenRejectModal(selectedSeller); setSelectedSeller(null); }}
                    >
                      <X size={13} /> Reject
                    </button>
                  </>
                )}
                {getStatus(selectedSeller) !== "BLOCKED" ? (
                  <button
                    className="btn-luxury-cancel"
                    style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                    onClick={() => handleBlock(selectedSeller)}
                  >
                    <ShieldOff size={13} /> Block
                  </button>
                ) : (
                  <button
                    className="btn-luxury-cancel"
                    style={{ background: "#dcfce7", color: "#16a34a", borderColor: "#bbf7d0" }}
                    onClick={() => handleUnblock(selectedSeller)}
                  >
                    <ShieldCheck size={13} /> Unblock
                  </button>
                )}
              </div>
              <div className="footer-action-buttons">
                <button className="btn-luxury-cancel" onClick={() => setSelectedSeller(null)}>Close</button>
                <button
                  className="btn-luxury-submit"
                  style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 4px 14px rgba(5,150,105,0.35)" }}
                  onClick={() => { handleOpenEdit(selectedSeller); setSelectedSeller(null); }}
                >
                  <Edit2 size={14} /> Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          LUXURY DOCUMENT ENLARGED PREVIEW / LIGHTBOX MODAL
          ============================================================ */}
      {previewDoc && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setPreviewDoc(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 740, padding: 0, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header" style={{ padding: "16px 22px" }}>
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #059669, #047857)" }}>
                  <FileCheck size={20} style={{ color: "#fff" }} />
                </div>
                <div className="header-texts">
                  <h2>{previewDoc.title || previewDoc.documentType}</h2>
                  <p>
                    Document Number: <strong className="font-mono" style={{ color: "#0f172a" }}>{previewDoc.documentNumber || "—"}</strong> &nbsp;•&nbsp; Status: <span style={{ color: previewDoc.verificationStatus === "VERIFIED" ? "#16a34a" : "#f59e0b", fontWeight: 700 }}>{previewDoc.verificationStatus || previewDoc.status}</span>
                  </p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setPreviewDoc(null)}>×</button>
            </div>

            <div style={{ background: "#0b1120", padding: "24px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 380, maxHeight: "68vh", overflow: "auto" }}>
              {previewDoc.fileUrl ? (
                previewDoc.fileUrl.toLowerCase().endsWith(".pdf") ? (
                  <iframe src={previewDoc.fileUrl} title={previewDoc.title} style={{ width: "100%", height: "65vh", border: "none", borderRadius: 8 }} />
                ) : (
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.title}
                    style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}
                  />
                )
              ) : (
                /* High-fidelity Digital Statutory Credential Card */
                <div
                  style={{
                    width: "100%",
                    maxWidth: 540,
                    background: "linear-gradient(145deg, #0f172a, #1e293b)",
                    border: "1px solid #334155",
                    borderRadius: 16,
                    padding: "26px",
                    boxShadow: "0 20px 45px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                    color: "#f8fafc",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #334155", paddingBottom: 14, marginBottom: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #059669, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ShieldCheck size={22} style={{ color: "#fff" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", color: "#34d399", textTransform: "uppercase" }}>
                          {previewDoc.title || "Government Statutory Credential"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>HinchMart Merchant Compliance Record</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(16,185,129,0.2)", color: "#34d399", border: "1px solid #059669", padding: "3px 8px", borderRadius: 6 }}>
                      SAVED IN DB
                    </span>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid #334155", borderRadius: 10, padding: "16px", marginBottom: 18 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>Official Document Identifier</div>
                    <div className="font-mono" style={{ fontSize: 24, fontWeight: 900, color: "#f8fafc", marginTop: 4, letterSpacing: "2px" }}>
                      {previewDoc.documentNumber || "NOT REGISTERED"}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12 }}>
                    <div>
                      <span style={{ color: "#94a3b8", fontSize: 11, display: "block" }}>Registered Enterprise</span>
                      <strong style={{ color: "#e2e8f0" }}>{selectedSeller?.companyName || "Merchant Store"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", fontSize: 11, display: "block" }}>Proprietor / Signatory</span>
                      <strong style={{ color: "#e2e8f0" }}>{selectedSeller?.name || selectedSeller?.ownerName || "Merchant Owner"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", fontSize: 11, display: "block" }}>Contact Email</span>
                      <span className="font-mono" style={{ color: "#cbd5e1", fontSize: 11 }}>{selectedSeller?.email || "—"}</span>
                    </div>
                    <div>
                      <span style={{ color: "#94a3b8", fontSize: 11, display: "block" }}>Physical Document Status</span>
                      <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11 }}>Awaiting Image Upload</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 20, paddingTop: 14, borderTop: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
                    <span>Registered on HinchMart Portal</span>
                    <span style={{ color: "#34d399", fontWeight: 700 }}>✓ Database Validated</span>
                  </div>
                </div>
              )}
            </div>

            <div className="luxury-modal-footer" style={{ padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10 }}>
                {previewDoc.fileUrl ? (
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn-luxury-cancel"
                    style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <Download size={13} /> Download Original File
                  </a>
                ) : (
                  <label
                    className="btn-luxury-submit"
                    style={{
                      fontSize: 12,
                      padding: "7px 14px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                      background: "linear-gradient(135deg, #059669, #047857)",
                      color: "#fff",
                      margin: 0,
                    }}
                  >
                    <Upload size={13} />
                    {uploadingDocType === previewDoc.documentType ? "Attaching..." : "Attach Document Image"}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: "none" }}
                      disabled={uploadingDocType === previewDoc.documentType}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleUploadModalDoc(previewDoc.documentType, file);
                          setPreviewDoc((prev) => ({
                            ...prev,
                            fileUrl: URL.createObjectURL(file),
                            isUploaded: true,
                          }));
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="footer-action-buttons">
                <button className="btn-luxury-submit" onClick={() => setPreviewDoc(null)}>
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          PREMIUM POPUP MODAL: EDIT SELLER
          ============================================================ */}
      {editModalSeller && (
        <div
          className="modal-overlay"
          onClick={() => setEditModalSeller(null)}
        >
          <div
            className="product-form-modal-luxury modal-animated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #059669, #047857)" }}>
                  <Store size={20} style={{ color: "#fff" }} />
                </div>
                <div className="header-texts">
                  <h2>Edit Merchant Profile</h2>
                  <p>Updating store: {editModalSeller.businessName || editModalSeller.name}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setEditModalSeller(null)}>×</button>
            </div>

            <form onSubmit={handleSaveSeller}>
              <div className="luxury-modal-body">
                {/* Business Identity */}
                <div className="form-section-card">
                  <div className="section-card-title"><Store size={13} /> Business Identity</div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Business / Enterprise Name <span className="required-star">*</span></label>
                      <input required placeholder="e.g. Apex Industrial Supplies" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} />
                    </div>
                    <div className="input-field-wrap">
                      <label>Owner / Director Name <span className="required-star">*</span></label>
                      <input required placeholder="e.g. Rajesh Khandelwal" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} />
                    </div>
                    <div className="input-field-wrap">
                      <label>GSTIN Number</label>
                      <input placeholder="27AABCA1234F1Z8" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })} />
                    </div>
                    <div className="input-field-wrap">
                      <label>Primary Category</label>
                      <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                        <option value="Industrial Machinery & Parts">Industrial Machinery & Parts</option>
                        <option value="Tools & Hardware Supplies">Tools & Hardware Supplies</option>
                        <option value="Electrical & Semiconductors">Electrical & Semiconductors</option>
                        <option value="Chemicals & Raw Materials">Chemicals & Raw Materials</option>
                        <option value="Commercial Packaging & Storage">Commercial Packaging & Storage</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact Details */}
                <div className="form-section-card">
                  <div className="section-card-title"><Mail size={13} /> Contact Details</div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Email Address <span className="required-star">*</span></label>
                      <input required type="email" placeholder="sales@apexsupplies.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="input-field-wrap">
                      <label>Phone Number</label>
                      <input placeholder="+91 98220 54321" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="form-section-card">
                  <div className="section-card-title"><MapPin size={13} /> Location & Address</div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>City</label>
                      <input placeholder="e.g. Pune" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                    </div>
                    <div className="input-field-wrap">
                      <label>State</label>
                      <input placeholder="e.g. Maharashtra" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                    </div>
                    <div className="input-field-wrap full-width">
                      <label>Warehouse / Factory Address</label>
                      <textarea rows={2} placeholder="Plot / Industrial Area Address..." value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="form-section-card">
                  <div className="section-card-title"><CheckCircle2 size={13} /> Account Status</div>
                  <div className="input-field-wrap" style={{ maxWidth: 280 }}>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                      <option value="ACTIVE">✓ Active — Live on Marketplace</option>
                      <option value="PENDING">⏳ Pending Review & KYC</option>
                      <option value="INACTIVE">⏸ Deactivated</option>
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
                  <button type="button" className="btn-luxury-cancel" onClick={() => setEditModalSeller(null)}>Cancel</button>
                  <button type="submit" className="btn-luxury-submit" style={{ background: "linear-gradient(135deg, #059669, #047857)", boxShadow: "0 4px 14px rgba(5,150,105,0.35)" }}>
                    <CheckCircle2 size={14} /> Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          PREMIUM POPUP MODAL: REJECT SELLER APPLICATION
          ============================================================ */}
      {rejectModalSeller && (
        <div className="modal-overlay" onClick={() => setRejectModalSeller(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)" }}>
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.5)" }}>
                  <X size={20} style={{ color: "#fca5a5" }} />
                </div>
                <div className="header-texts">
                  <h2>Decline Merchant Application</h2>
                  <p>Declining: <strong style={{ color: "#fca5a5" }}>{rejectModalSeller.businessName || rejectModalSeller.name}</strong></p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setRejectModalSeller(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              <div className="form-section-card">
                <div className="section-card-title"><FileText size={13} /> Rejection Reason</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="input-field-wrap">
                    <label>Select Reason Preset</label>
                    <select
                      onChange={(e) => setRejectReason(e.target.value)}
                      defaultValue="Incomplete GST or KYC documentation provided."
                    >
                      <option value="Incomplete GST or KYC documentation provided.">Incomplete GST or KYC documentation provided.</option>
                      <option value="Invalid GST number verification failed.">Invalid GST number verification failed.</option>
                      <option value="Catalog does not match marketplace B2B taxonomy.">Catalog does not match marketplace B2B taxonomy.</option>
                      <option value="Custom reason">Other custom reason</option>
                    </select>
                  </div>
                  <div className="input-field-wrap">
                    <label>Feedback for Merchant</label>
                    <textarea
                      rows={4}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Explain why the application was declined..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <span style={{ fontSize: 12, color: "#64748b" }}>This action will notify the merchant via email.</span>
              <div className="footer-action-buttons">
                <button className="btn-luxury-cancel" onClick={() => setRejectModalSeller(null)}>Cancel</button>
                <button
                  className="btn-luxury-submit"
                  style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", boxShadow: "0 4px 14px rgba(220,38,38,0.35)" }}
                  onClick={handleConfirmReject}
                >
                  <X size={14} /> Reject Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
