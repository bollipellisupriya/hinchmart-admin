import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileCheck,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Plus,
  Eye,
  Check,
  X,
  ExternalLink,
  Download,
  Building2,
  User,
  CreditCard,
  FileText,
  AlertTriangle,
  Upload,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Store,
  Phone,
  Mail,
  MapPin,
  Tag,
  CheckSquare,
} from "lucide-react";
import {
  getAllSellerVaults,
  getSellerVault,
  verifyDocument,
  bulkApproveSeller,
  bulkRejectSeller,
  step1Personal,
  step2Business,
  step3Bank,
  uploadDocument,
  finalSubmit,
} from "../api/sellerDocumentApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";
import "../styles/categories.css";

export default function SellerDocuments() {
  const toast = useToast();
  const [vaults, setVaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, VERIFIED, PENDING, REJECTED, NOT_UPLOADED
  const [businessTypeFilter, setBusinessTypeFilter] = useState("ALL");
  const [selectedVault, setSelectedVault] = useState(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState("documents"); // documents | wizard | bank

  // Document Reject Modal
  const [rejectingDocType, setRejectingDocType] = useState(null);
  const [docRejectRemarks, setDocRejectRemarks] = useState("");

  // Bulk Reject Modal
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState("");

  // Document Image Zoom Modal
  const [zoomDocUrl, setZoomDocUrl] = useState(null);

  // New Seller Onboarding Modal
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardForm, setWizardForm] = useState({
    sellerId: "",
    name: "",
    email: "",
    phone: "",
    panNumber: "",
    aadhaarNumber: "",
    companyName: "",
    businessType: "PRIVATE_LIMITED",
    gstin: "",
    businessAddress: "",
    state: "Maharashtra",
    city: "Mumbai",
    pincode: "400001",
    bankName: "HDFC Bank",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "HDFC0000123",
    accountType: "CURRENT",
    panFileUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    aadhaarFileUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80",
    gstFileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80",
  });

  const [syncing, setSyncing] = useState(false);
  const [directSellerIdInput, setDirectSellerIdInput] = useState("");

  // Load Data
  const loadData = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const data = await getAllSellerVaults();
      setVaults(data);

      if (selectedVault) {
        const sid = selectedVault.sellerId || selectedVault.id;
        const refreshed = data.find((v) => (v.sellerId || v.id) === sid);
        if (refreshed) setSelectedVault(refreshed);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load seller document vaults.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWithDB = async () => {
    setSyncing(true);
    try {
      await loadData(true);
      toast.success("Synchronized with backend database & document vaults.");
    } catch {
      toast.error("Database sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDirectLookupFromDB = async (sellerIdOrQuery) => {
    const q = String(sellerIdOrQuery || directSellerIdInput).trim();
    if (!q) {
      toast.warning("Please enter a Seller ID to fetch from DB.");
      return;
    }
    setSyncing(true);
    try {
      const vault = await getSellerVault(q);
      if (vault && (vault.companyName || vault.name || (vault.documents && vault.documents.some((d) => d.isUploaded)))) {
        setVaults((prev) => {
          const sid = String(vault.sellerId || vault.id);
          const exists = prev.some((v) => String(v.sellerId || v.id) === sid);
          return exists ? prev.map((v) => (String(v.sellerId || v.id) === sid ? vault : v)) : [vault, ...prev];
        });
        setSelectedVault(vault);
        toast.success(`Successfully retrieved seller #${q} and documents from DB!`);
      } else {
        toast.info(`Queried DB for seller #${q}. Updating live vault table...`);
        await loadData(false);
      }
    } catch (err) {
      toast.error(`Unable to find seller #${q} in DB: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenInspectVault = async (vault) => {
    setSelectedVault(vault);
    setActiveInspectorTab("documents");
    const sid = vault.sellerId || vault.id;
    try {
      const liveVault = await getSellerVault(sid);
      if (liveVault) {
        setSelectedVault((prev) =>
          prev && (prev.sellerId === sid || prev.id === sid) ? { ...prev, ...liveVault } : prev
        );
      }
    } catch (err) {
      console.warn("Live vault fetch notice:", err?.message);
    }
  };

  useEffect(() => {
    loadData(true);
    const unsubscribe = subscribeDataUpdate((event) => {
      if (event.entity === "seller_documents" || event.entity === "sellers") {
        loadData(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Filtered Vaults
  const filteredVaults = useMemo(() => {
    return vaults.filter((vault) => {
      const q = search.trim().toLowerCase();
      const text = `${vault.companyName || ""} ${vault.name || ""} ${vault.email || ""} ${vault.phone || ""} ${vault.gstin || ""} ${vault.panNumber || ""} ${vault.sellerId || ""}`.toLowerCase();
      const matchesSearch = !q || text.includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "VERIFIED" && vault.vaultMetrics?.overallStatus === "Verified") ||
        (statusFilter === "PENDING" && vault.vaultMetrics?.overallStatus === "Pending") ||
        (statusFilter === "REJECTED" && vault.vaultMetrics?.overallStatus === "Rejected") ||
        (statusFilter === "NOT_UPLOADED" && vault.vaultMetrics?.overallStatus === "Not Uploaded");

      const matchesBusinessType =
        businessTypeFilter === "ALL" || vault.businessType === businessTypeFilter;

      return matchesSearch && matchesStatus && matchesBusinessType;
    });
  }, [vaults, search, statusFilter, businessTypeFilter]);

  // Metric Counts
  const metrics = useMemo(() => {
    return {
      total: vaults.length,
      verified: vaults.filter((v) => v.vaultMetrics?.overallStatus === "Verified").length,
      pending: vaults.filter((v) => v.vaultMetrics?.overallStatus === "Pending").length,
      rejected: vaults.filter((v) => v.vaultMetrics?.overallStatus === "Rejected").length,
    };
  }, [vaults]);

  // Phase 6 Option A: Verify Single Document
  const handleVerifySingleDoc = async (sellerId, docType) => {
    try {
      await verifyDocument(sellerId, docType, { status: "VERIFIED", remarks: "Verified and approved by Compliance Team." });
      toast.success(`${docType} document marked as VERIFIED.`);
      await loadData(false);
    } catch (err) {
      toast.error("Failed to verify document.");
    }
  };

  // Phase 6 Option A: Reject Single Document
  const handleRejectSingleDoc = async () => {
    if (!selectedVault || !rejectingDocType) return;
    try {
      await verifyDocument(selectedVault.sellerId, rejectingDocType, {
        status: "REJECTED",
        remarks: docRejectRemarks || "Document quality is poor or details mismatch.",
      });
      toast.warning(`${rejectingDocType} document rejected.`);
      setRejectingDocType(null);
      setDocRejectRemarks("");
      await loadData(false);
    } catch (err) {
      toast.error("Failed to reject document.");
    }
  };

  // Phase 6 Option B: Bulk Approve All 3 Documents
  const handleBulkApprove = async (sellerId) => {
    try {
      await bulkApproveSeller(sellerId);
      toast.success("All 3 compliance documents approved & Seller verified!");
      await loadData(false);
    } catch (err) {
      toast.error("Bulk approval failed.");
    }
  };

  // Phase 6 Option B: Bulk Reject Seller
  const handleBulkReject = async () => {
    if (!selectedVault) return;
    try {
      await bulkRejectSeller(selectedVault.sellerId, bulkRejectReason || "KYC compliance requirements not satisfied.");
      toast.warning("Merchant application and documents rejected.");
      setShowBulkRejectModal(false);
      setBulkRejectReason("");
      await loadData(false);
    } catch (err) {
      toast.error("Bulk rejection failed.");
    }
  };

  // Wizard Step Submission (Phase 1 to 5)
  const handleNextWizardStep = async (e) => {
    e.preventDefault();
    if (wizardStep === 1) {
      if (!wizardForm.name || !wizardForm.email || !wizardForm.panNumber) {
        toast.warning("Please fill in all mandatory personal details.");
        return;
      }
      const s1 = await step1Personal({
        sellerId: wizardForm.sellerId || `sel_${Date.now()}`,
        name: wizardForm.name,
        email: wizardForm.email,
        phone: wizardForm.phone,
        panNumber: wizardForm.panNumber,
        aadhaarNumber: wizardForm.aadhaarNumber,
      });
      setWizardForm((prev) => ({ ...prev, sellerId: s1.sellerId }));
      toast.success("Phase 1: Personal & KYC saved (onboardingStatus = STEP_1)");
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!wizardForm.companyName || !wizardForm.gstin) {
        toast.warning("Please provide Company Name and GSTIN.");
        return;
      }
      await step2Business(wizardForm.sellerId, {
        companyName: wizardForm.companyName,
        businessType: wizardForm.businessType,
        gstin: wizardForm.gstin,
        businessAddress: wizardForm.businessAddress,
        state: wizardForm.state,
        city: wizardForm.city,
        pincode: wizardForm.pincode,
      });
      toast.success("Phase 2: Business & Tax Details saved (onboardingStatus = STEP_2)");
      setWizardStep(3);
    } else if (wizardStep === 3) {
      if (!wizardForm.accountNumber || !wizardForm.ifscCode) {
        toast.warning("Please provide Bank Account Number and IFSC code.");
        return;
      }
      await step3Bank(wizardForm.sellerId, {
        bankName: wizardForm.bankName,
        accountHolderName: wizardForm.accountHolderName || wizardForm.companyName || wizardForm.name,
        accountNumber: wizardForm.accountNumber,
        ifscCode: wizardForm.ifscCode,
        accountType: wizardForm.accountType,
      });
      toast.success("Phase 3: Bank & Settlement saved (onboardingStatus = STEP_3)");
      setWizardStep(4);
    } else if (wizardStep === 4) {
      // Upload all 3 mandatory documents
      await uploadDocument(wizardForm.sellerId, "PAN", wizardForm.panFileUrl, wizardForm.panNumber);
      await uploadDocument(wizardForm.sellerId, "AADHAAR", wizardForm.aadhaarFileUrl, wizardForm.aadhaarNumber);
      await uploadDocument(wizardForm.sellerId, "GST", wizardForm.gstFileUrl, wizardForm.gstin);
      toast.success("Phase 4: Mandatory Documents (PAN, Aadhaar, GST) uploaded.");
      setWizardStep(5);
    } else if (wizardStep === 5) {
      await finalSubmit(wizardForm.sellerId);
      toast.success("Phase 5: Final Submission Completed! Onboarding status is now PENDING_REVIEW.");
      setShowOnboardModal(false);
      setWizardStep(1);
      await loadData(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Seller ID,Company Name,Owner Name,Email,Phone,GSTIN,PAN,Overall Status,PAN Status,Aadhaar Status,GST Status,Submitted At",
    ];
    const rows = filteredVaults.map((v) => {
      const pan = v.documents?.find((d) => d.documentType === "PAN");
      const aadh = v.documents?.find((d) => d.documentType === "AADHAAR");
      const gst = v.documents?.find((d) => d.documentType === "GST");
      return [
        `"${v.sellerId}"`,
        `"${v.companyName || v.name || ""}"`,
        `"${v.name || ""}"`,
        `"${v.email || ""}"`,
        `"${v.phone || ""}"`,
        `"${v.gstin || ""}"`,
        `"${v.panNumber || ""}"`,
        `"${v.vaultMetrics?.overallStatus || "Not Uploaded"}"`,
        `"${pan?.verificationStatus || "Not Uploaded"}"`,
        `"${aadh?.verificationStatus || "Not Uploaded"}"`,
        `"${gst?.verificationStatus || "Not Uploaded"}"`,
        `"${v.submittedAt || ""}"`,
      ].join(",");
    });
    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `seller_compliance_vault_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Seller Compliance Vault CSV downloaded!");
  };

  const getDocBadge = (status) => {
    switch (status) {
      case "VERIFIED":
        return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0", label: "Verified", icon: <CheckCircle2 size={12} /> };
      case "PENDING":
        return { bg: "#fffbeb", color: "#b45309", border: "#fde68a", label: "Pending", icon: <Clock size={12} /> };
      case "REJECTED":
        return { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca", label: "Rejected", icon: <XCircle size={12} /> };
      default:
        return { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0", label: "Not Uploaded", icon: <AlertTriangle size={12} /> };
    }
  };

  const getOverallStatusBadge = (status) => {
    switch (status) {
      case "Verified":
        return (
          <span className="status-badge-glow status-approved" style={{ fontSize: "11px", padding: "3px 10px" }}>
            <span className="status-dot"></span> Verified
          </span>
        );
      case "Pending":
        return (
          <span className="status-badge-glow status-pending" style={{ fontSize: "11px", padding: "3px 10px" }}>
            <span className="status-dot"></span> Pending Review
          </span>
        );
      case "Rejected":
        return (
          <span className="status-badge-glow status-rejected" style={{ fontSize: "11px", padding: "3px 10px" }}>
            <span className="status-dot"></span> Rejected
          </span>
        );
      default:
        return (
          <span style={{ fontSize: "11px", background: "#f1f5f9", color: "#64748b", padding: "3px 10px", borderRadius: "12px", fontWeight: 700 }}>
            Not Uploaded
          </span>
        );
    }
  };

  return (
    <div className="categories-page">
      {/* 7-Phase Header Banner */}
      <div className="page-header">
        <div>
          <div className="header-eyebrow">
            <ShieldCheck size={14} />
            <span>7-PHASE SELLER ONBOARDING &bull; MANDATORY KYC COMPLIANCE VAULT</span>
          </div>
          <h1>Seller Documents & KYC Vault</h1>
          <p>
            Verify mandatory merchant documents (PAN, Aadhaar, GST Certificate), manage 7-phase onboarding pipeline, and review compliance audits.
          </p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleSyncWithDB} disabled={syncing}>
            <RotateCcw size={16} className={syncing ? "animate-spin" : ""} />
            <span>{syncing ? "Syncing DB..." : "Sync with Live DB"}</span>
          </button>
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export Audit CSV</span>
          </button>
          <button className="primary-button" onClick={() => { setWizardStep(1); setShowOnboardModal(true); }}>
            <Plus size={18} />
            <span>New Seller Onboarding</span>
          </button>
        </div>
      </div>

      {/* 7-Phase Flow Indicator Strip */}
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
          fontSize: "11.5px",
          color: "#64748b",
          overflowX: "auto",
        }}
      >
        <span style={{ fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
          Onboarding Architecture:
        </span>
        <span style={{ color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>1. Personal KYC</span>
        <ChevronRight size={13} />
        <span style={{ color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>2. Business & Tax</span>
        <ChevronRight size={13} />
        <span style={{ color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>3. Bank Settlement</span>
        <ChevronRight size={13} />
        <span style={{ color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>4. Mandatory 3-Doc Upload</span>
        <ChevronRight size={13} />
        <span style={{ color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>5. Final Submission</span>
        <ChevronRight size={13} />
        <span style={{ color: "#d97706", fontWeight: 700, whiteSpace: "nowrap" }}>6. Admin Decision</span>
        <ChevronRight size={13} />
        <span
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "2px 8px",
            borderRadius: "6px",
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          7. Compliance Vault [Active View]
        </span>
      </div>

      {/* Metric Cards Strip */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${statusFilter === "ALL" ? "stat-pill-selected" : ""}`}
          onClick={() => setStatusFilter("ALL")}
          role="button"
          tabIndex={0}
        >
          <span className="stat-pill-label">Total Onboarding Vaults</span>
          <strong className="stat-pill-value">{metrics.total}</strong>
        </div>

        <div
          className={`stat-pill active ${statusFilter === "VERIFIED" ? "stat-pill-selected" : ""}`}
          onClick={() => setStatusFilter("VERIFIED")}
          role="button"
          tabIndex={0}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Fully Verified (3/3 Docs)</span>
          <strong className="stat-pill-value">{metrics.verified}</strong>
        </div>

        <div
          className={`stat-pill pending ${statusFilter === "PENDING" ? "stat-pill-selected" : ""}`}
          onClick={() => setStatusFilter("PENDING")}
          role="button"
          tabIndex={0}
        >
          <span className="pulse-dot amber"></span>
          <span className="stat-pill-label">Pending Compliance Review</span>
          <strong className="stat-pill-value">{metrics.pending}</strong>
        </div>

        <div
          className={`stat-pill inactive ${statusFilter === "REJECTED" ? "stat-pill-selected" : ""}`}
          onClick={() => setStatusFilter("REJECTED")}
          role="button"
          tabIndex={0}
        >
          <span className="stat-pill-label">Rejected / Action Needed</span>
          <strong className="stat-pill-value">{metrics.rejected}</strong>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="content-card">
        {/* Table Toolbar */}
        <div className="table-toolbar" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div className="search-input" style={{ minWidth: "280px" }}>
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, owner, GSTIN, PAN, email..."
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")}>
                ×
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div className="sort-control">
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
                Business Type:
              </span>
              <select
                value={businessTypeFilter}
                onChange={(e) => setBusinessTypeFilter(e.target.value)}
              >
                <option value="ALL">All Business Structures</option>
                <option value="PRIVATE_LIMITED">Private Limited (Pvt Ltd)</option>
                <option value="PROPRIETORSHIP">Sole Proprietorship</option>
                <option value="LLP">Limited Liability Partnership (LLP)</option>
                <option value="PARTNERSHIP">Partnership Firm</option>
              </select>
            </div>

            {(statusFilter !== "ALL" || businessTypeFilter !== "ALL" || search !== "") && (
              <button
                className="filter-button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setBusinessTypeFilter("ALL");
                  setSearch("");
                }}
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="filter-tabs">
            {[
              { id: "ALL", label: "All Vaults", count: metrics.total },
              { id: "VERIFIED", label: "Verified", count: metrics.verified },
              { id: "PENDING", label: "Pending", count: metrics.pending },
              { id: "REJECTED", label: "Rejected", count: metrics.rejected },
            ].map((tab) => (
              <button
                key={tab.id}
                className={`filter-tab ${statusFilter === tab.id ? "active" : ""}`}
                onClick={() => setStatusFilter(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="filter-badge">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading seller compliance vaults...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Seller Entity & Contact</th>
                  <th>Onboarding Stage</th>
                  <th style={{ textAlign: "center" }}>🪪 PAN Card</th>
                  <th style={{ textAlign: "center" }}>🆔 Aadhaar Card</th>
                  <th style={{ textAlign: "center" }}>📑 GST Certificate</th>
                  <th>Vault Compliance</th>
                  <th>Submission Date</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVaults.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table">
                      <div className="empty-table-content" style={{ maxWidth: "480px", margin: "0 auto", padding: "32px 16px" }}>
                        <FileCheck size={44} className="empty-icon" style={{ color: "#f59e0b" }} />
                        <h3>No seller document vaults found in view</h3>
                        <p style={{ fontSize: "12.5px", color: "#64748b", marginBottom: "16px" }}>
                          {search
                            ? `No results matching "${search}" in current filter.`
                            : "New seller onboarding applications will sync from the live database."}
                        </p>
                        
                        <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "16px" }}>
                          <button
                            className="btn-secondary"
                            onClick={handleSyncWithDB}
                            disabled={syncing}
                            style={{ fontSize: "12px", padding: "7px 14px" }}
                          >
                            <RotateCcw size={14} className={syncing ? "animate-spin" : ""} />
                            <span>{syncing ? "Connecting to DB..." : "Refresh Live from Database"}</span>
                          </button>
                          {statusFilter !== "ALL" && (
                            <button
                              className="btn-secondary"
                              onClick={() => setStatusFilter("ALL")}
                              style={{ fontSize: "12px", padding: "7px 14px" }}
                            >
                              <span>Switch to "All Vaults"</span>
                            </button>
                          )}
                        </div>

                        {/* Quick DB Lookup Box */}
                        <div
                          style={{
                            background: "#f8fafc",
                            border: "1px dashed #cbd5e1",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            textAlign: "left",
                          }}
                        >
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                            🔍 Lookup Seller Documents by ID / Email from DB:
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input
                              type="text"
                              value={directSellerIdInput}
                              onChange={(e) => setDirectSellerIdInput(e.target.value)}
                              placeholder="e.g. 16, 4, seller@example.com..."
                              style={{
                                flex: 1,
                                padding: "6px 10px",
                                fontSize: "12px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleDirectLookupFromDB();
                              }}
                            />
                            <button
                              className="primary-button"
                              onClick={() => handleDirectLookupFromDB()}
                              disabled={syncing || !directSellerIdInput.trim()}
                              style={{ padding: "6px 12px", fontSize: "11.5px", whiteSpace: "nowrap" }}
                            >
                              <span>Fetch from DB</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVaults.map((vault) => {
                    const panDoc = vault.documents?.find((d) => d.documentType === "PAN");
                    const aadhaarDoc = vault.documents?.find((d) => d.documentType === "AADHAAR");
                    const gstDoc = vault.documents?.find((d) => d.documentType === "GST");

                    const panBadge = getDocBadge(panDoc?.verificationStatus);
                    const aadhaarBadge = getDocBadge(aadhaarDoc?.verificationStatus);
                    const gstBadge = getDocBadge(gstDoc?.verificationStatus);

                    return (
                      <tr key={vault.sellerId}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar" style={{ background: "#0f172a", color: "#f59e0b", fontWeight: 800 }}>
                              <Building2 size={16} />
                            </div>
                            <div className="user-info-text">
                              <strong className="user-primary-name">
                                {vault.companyName || vault.name}
                              </strong>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#64748b" }}>
                                <span>{vault.name}</span>
                                <span>•</span>
                                <span className="font-mono">{vault.sellerId}</span>
                              </div>
                              <div style={{ fontSize: "10.5px", color: "#94a3b8", marginTop: "2px" }}>
                                GSTIN: <strong style={{ color: "#334155" }}>{vault.gstin || "—"}</strong>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontWeight: 700,
                              background:
                                vault.onboardingStatus === "COMPLETED"
                                  ? "#ecfdf5"
                                  : vault.onboardingStatus === "PENDING_REVIEW"
                                  ? "#fef3c7"
                                  : "#f1f5f9",
                              color:
                                vault.onboardingStatus === "COMPLETED"
                                  ? "#047857"
                                  : vault.onboardingStatus === "PENDING_REVIEW"
                                  ? "#92400e"
                                  : "#475569",
                            }}
                          >
                            {vault.onboardingStatus || "STEP_1"}
                          </span>
                        </td>

                        {/* 3-Doc Compliance Columns */}
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: panBadge.bg,
                              color: panBadge.color,
                              border: `1px solid ${panBadge.border}`,
                              padding: "2px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            {panBadge.icon} {panBadge.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: aadhaarBadge.bg,
                              color: aadhaarBadge.color,
                              border: `1px solid ${aadhaarBadge.border}`,
                              padding: "2px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            {aadhaarBadge.icon} {aadhaarBadge.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: gstBadge.bg,
                              color: gstBadge.color,
                              border: `1px solid ${gstBadge.border}`,
                              padding: "2px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            {gstBadge.icon} {gstBadge.label}
                          </span>
                        </td>

                        <td>
                          {getOverallStatusBadge(vault.vaultMetrics?.overallStatus)}
                        </td>

                        <td style={{ fontSize: "11.5px", color: "#64748b" }}>
                          {vault.submittedAt
                            ? new Date(vault.submittedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Draft / In Progress"}
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            <button
                              className="btn-luxury-submit"
                              style={{ padding: "5px 10px", fontSize: "11.5px" }}
                              onClick={() => handleOpenInspectVault(vault)}
                            >
                              <ShieldCheck size={13} />
                              <span>Inspect Vault</span>
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
          LUXURY MODAL: COMPLIANCE VAULT INSPECTOR & ONBOARDING WIZARD
          ========================================================================= */}
      {selectedVault && (
        <div className="modal-overlay" onClick={() => setSelectedVault(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: "850px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box">
                  <ShieldCheck size={22} />
                </div>
                <div className="header-texts">
                  <h2>{selectedVault.companyName || selectedVault.name}</h2>
                  <p>
                    Seller ID: <span className="font-mono" style={{ color: "#f59e0b" }}>{selectedVault.sellerId}</span> • GSTIN: {selectedVault.gstin || "Unregistered"} • Status: {selectedVault.vaultMetrics?.overallStatus}
                  </p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setSelectedVault(null)}>
                ×
              </button>
            </div>

            {/* Nav Tabs */}
            <div
              style={{
                display: "flex",
                background: "#0b1120",
                borderBottom: "1px solid #1e293b",
                padding: "0 24px",
              }}
            >
              {[
                { id: "documents", label: "📑 Phase 6 & 7: Compliance Documents (PAN, Aadhaar, GST)" },
                { id: "wizard", label: "🚀 Phase 1–5: Onboarding Lifecycle" },
                { id: "bank", label: "🏦 Phase 3: Bank & Settlement" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveInspectorTab(t.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: activeInspectorTab === t.id ? "2px solid #f59e0b" : "2px solid transparent",
                    color: activeInspectorTab === t.id ? "#f59e0b" : "#94a3b8",
                    fontWeight: 700,
                    fontSize: "12.5px",
                    padding: "12px 16px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Body Content */}
            <div className="luxury-modal-body" style={{ maxHeight: "68vh", overflowY: "auto" }}>
              {activeInspectorTab === "documents" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "14px", color: "#0f172a", display: "block" }}>
                        Vault Compliance Status: {selectedVault.vaultMetrics?.overallStatus}
                      </strong>
                      <span style={{ fontSize: "12px", color: "#64748b" }}>
                        {selectedVault.vaultMetrics?.verifiedCount} of 3 required KYC documents verified.
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-bulk-action success"
                        onClick={() => handleBulkApprove(selectedVault.sellerId)}
                      >
                        <CheckCircle2 size={14} /> Approve All (3/3)
                      </button>
                      <button
                        className="btn-bulk-action danger"
                        onClick={() => setShowBulkRejectModal(true)}
                      >
                        <XCircle size={14} /> Reject Seller
                      </button>
                    </div>
                  </div>

                  {/* 3 Document Cards */}
                  {[
                    {
                      type: "PAN",
                      title: "1. PAN Card Document",
                      docNumber: selectedVault.panNumber || selectedVault.documents?.find((d) => d.documentType === "PAN")?.documentNumber,
                      defaultUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
                    },
                    {
                      type: "AADHAAR",
                      title: "2. Aadhaar Card (Authorized Signatory)",
                      docNumber: selectedVault.aadhaarNumber || selectedVault.documents?.find((d) => d.documentType === "AADHAAR")?.documentNumber,
                      defaultUrl: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=600&auto=format&fit=crop&q=80",
                    },
                    {
                      type: "GST",
                      title: "3. GST Registration Certificate (REG-06)",
                      docNumber: selectedVault.gstin || selectedVault.documents?.find((d) => d.documentType === "GST")?.documentNumber,
                      defaultUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80",
                    },
                  ].map((docConfig) => {
                    const doc = selectedVault.documents?.find((d) => d.documentType === docConfig.type);
                    const badge = getDocBadge(doc?.verificationStatus || "Not Uploaded");
                    const imgUrl = doc?.fileUrl || docConfig.defaultUrl;

                    return (
                      <div
                        key={docConfig.type}
                        className="form-section-card"
                        style={{
                          border: doc?.verificationStatus === "REJECTED" ? "1px solid #fecaca" : "1px solid #e2e8f0",
                          background: doc?.verificationStatus === "REJECTED" ? "#fef2f2" : "#ffffff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div className="section-card-title" style={{ marginBottom: "4px" }}>
                              <FileCheck size={16} /> {docConfig.title}
                            </div>
                            <span style={{ fontSize: "12px", color: "#64748b" }}>
                              Document Number: <strong style={{ color: "#0f172a" }}>{docConfig.docNumber || "Not Provided"}</strong>
                            </span>
                          </div>

                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              fontWeight: 800,
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              padding: "4px 10px",
                              borderRadius: "8px",
                            }}
                          >
                            {badge.icon} {badge.label}
                          </span>
                        </div>

                        {/* Document Preview & Details */}
                        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "16px", marginTop: "14px" }}>
                          <div
                            style={{
                              height: "120px",
                              borderRadius: "8px",
                              overflow: "hidden",
                              border: "1px solid #cbd5e1",
                              position: "relative",
                              cursor: "pointer",
                              background: "#0f172a",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            onClick={() => {
                              if (imgUrl.toLowerCase().endsWith(".pdf") || imgUrl.includes("pdf")) {
                                window.open(imgUrl, "_blank");
                              } else {
                                setZoomDocUrl(imgUrl);
                              }
                            }}
                            title="Click to view full document"
                          >
                            {imgUrl.toLowerCase().endsWith(".pdf") || imgUrl.includes("pdf") ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", color: "#f8fafc" }}>
                                <FileText size={32} color="#f59e0b" />
                                <span style={{ fontSize: "11px", fontWeight: 600 }}>PDF Document</span>
                                <span style={{ fontSize: "10px", color: "#94a3b8" }}>Click to Open ↗</span>
                              </div>
                            ) : (
                              <img
                                src={imgUrl}
                                alt={docConfig.title}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            )}
                            <div
                              style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,0.3)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#ffffff",
                                opacity: 0,
                                transition: "opacity 0.2s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = 0)}
                            >
                              <Eye size={20} />
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                                <strong>File Name:</strong> {doc?.fileName || `${docConfig.type.toLowerCase()}_file.pdf`} {doc?.fileSize ? `(${doc.fileSize})` : ""}
                              </div>
                              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>
                                <strong>Remarks:</strong> {doc?.remarks || "Awaiting compliance officer evaluation."}
                              </div>
                              {doc?.fileUrl && (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ fontSize: "11.5px", color: "#2563eb", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "6px", fontWeight: 600 }}
                                >
                                  <ExternalLink size={12} /> Open Document in New Window
                                </a>
                              )}
                              {doc?.verifiedAt && (
                                <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                                  Verified on: {new Date(doc.verifiedAt).toLocaleString("en-IN")} by {doc.verifiedBy || "Compliance Officer"}
                                </div>
                              )}
                            </div>

                            {/* Phase 6 Option A Action Buttons */}
                            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                              <button
                                className="btn-bulk-action success"
                                style={{ padding: "6px 12px", fontSize: "12px" }}
                                onClick={() => handleVerifySingleDoc(selectedVault.sellerId, docConfig.type)}
                              >
                                <Check size={14} /> Verify (OK)
                              </button>
                              <button
                                className="btn-bulk-action danger"
                                style={{ padding: "6px 12px", fontSize: "12px" }}
                                onClick={() => {
                                  setRejectingDocType(docConfig.type);
                                  setDocRejectRemarks("");
                                }}
                              >
                                <X size={14} /> Reject Document
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeInspectorTab === "wizard" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="form-section-card">
                    <div className="section-card-title">
                      <Sparkles size={16} /> 7-Phase Onboarding Summary
                    </div>
                    <div className="luxury-form-grid">
                      <div className="input-field-wrap">
                        <label>Phase 1: Personal Contact</label>
                        <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "12.5px" }}>
                          <strong>{selectedVault.name}</strong> • {selectedVault.phone} • {selectedVault.email}
                        </div>
                      </div>
                      <div className="input-field-wrap">
                        <label>Phase 2: Business Structure</label>
                        <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "12.5px" }}>
                          <strong>{selectedVault.companyName}</strong> ({selectedVault.businessType})
                        </div>
                      </div>
                      <div className="input-field-wrap">
                        <label>Phase 3: Settlement Status</label>
                        <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "12.5px" }}>
                          {selectedVault.bankName} • A/C: {selectedVault.accountNumber} • IFSC: {selectedVault.ifscCode}
                        </div>
                      </div>
                      <div className="input-field-wrap">
                        <label>Phase 4: Document Uploads</label>
                        <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: "8px", fontSize: "12.5px" }}>
                          {selectedVault.documents?.length || 0} of 3 KYC documents submitted
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeInspectorTab === "bank" && (
                <div className="form-section-card">
                  <div className="section-card-title">
                    <CreditCard size={16} /> Settlement Bank Account Details (Phase 3)
                  </div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Bank Name</label>
                      <input readOnly value={selectedVault.bankName || "HDFC Bank"} />
                    </div>
                    <div className="input-field-wrap">
                      <label>Account Holder Name</label>
                      <input readOnly value={selectedVault.accountHolderName || selectedVault.companyName || selectedVault.name} />
                    </div>
                    <div className="input-field-wrap">
                      <label>Account Number</label>
                      <input readOnly value={selectedVault.accountNumber || "50200049281920"} className="font-mono" />
                    </div>
                    <div className="input-field-wrap">
                      <label>IFSC Code</label>
                      <input readOnly value={selectedVault.ifscCode || "HDFC0001234"} className="font-mono" />
                    </div>
                    <div className="input-field-wrap">
                      <label>Account Type</label>
                      <input readOnly value={selectedVault.accountType || "CURRENT"} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="luxury-modal-footer">
              <button className="btn-luxury-cancel" onClick={() => setSelectedVault(null)}>
                Close Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          REJECT SINGLE DOCUMENT REMARKS MODAL
          ========================================================================= */}
      {rejectingDocType && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="product-form-modal-luxury modal-animated" style={{ maxWidth: "460px" }}>
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "#dc2626" }}>
                  <XCircle size={20} />
                </div>
                <div className="header-texts">
                  <h2>Reject {rejectingDocType} Document</h2>
                  <p>Provide rejection remarks for the merchant</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setRejectingDocType(null)}>×</button>
            </div>

            <div className="luxury-modal-body">
              <div className="input-field-wrap full-width">
                <label>Rejection Reason / Remarks <span className="required-star">*</span></label>
                <textarea
                  rows={4}
                  placeholder="e.g. Document copy is blurred, name does not match PAN database, expired GSTIN..."
                  value={docRejectRemarks}
                  onChange={(e) => setDocRejectRemarks(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button className="btn-luxury-cancel" onClick={() => setRejectingDocType(null)}>
                Cancel
              </button>
              <button
                className="btn-luxury-submit"
                style={{ background: "#dc2626", borderColor: "#dc2626" }}
                onClick={handleRejectSingleDoc}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BULK REJECT ENTIRE SELLER MODAL
          ========================================================================= */}
      {showBulkRejectModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="product-form-modal-luxury modal-animated" style={{ maxWidth: "460px" }}>
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "#dc2626" }}>
                  <ShieldAlert size={20} />
                </div>
                <div className="header-texts">
                  <h2>Reject Merchant Compliance Application</h2>
                  <p>Decline entire onboarding for {selectedVault?.companyName}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setShowBulkRejectModal(false)}>×</button>
            </div>

            <div className="luxury-modal-body">
              <div className="input-field-wrap full-width">
                <label>Rejection Reason <span className="required-star">*</span></label>
                <textarea
                  rows={4}
                  placeholder="e.g. Failed compliance due to fraudulent documentation..."
                  value={bulkRejectReason}
                  onChange={(e) => setBulkRejectReason(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button className="btn-luxury-cancel" onClick={() => setShowBulkRejectModal(false)}>
                Cancel
              </button>
              <button
                className="btn-luxury-submit"
                style={{ background: "#dc2626", borderColor: "#dc2626" }}
                onClick={handleBulkReject}
              >
                Confirm Bulk Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DOCUMENT IMAGE ZOOM VIEWER
          ========================================================================= */}
      {zoomDocUrl && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setZoomDocUrl(null)}>
          <div
            style={{
              maxWidth: "80vw",
              maxHeight: "85vh",
              background: "#0b1120",
              padding: "12px",
              borderRadius: "12px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomDocUrl(null)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(0,0,0,0.6)",
                border: "none",
                color: "#ffffff",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ×
            </button>
            <img
              src={zoomDocUrl}
              alt="KYC Document Preview"
              style={{ maxHeight: "80vh", maxWidth: "78vw", borderRadius: "8px", objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          NEW SELLER ONBOARDING 5-PHASE WIZARD MODAL
          ========================================================================= */}
      {showOnboardModal && (
        <div className="modal-overlay" onClick={() => setShowOnboardModal(false)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: "720px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box">
                  <Sparkles size={20} />
                </div>
                <div className="header-texts">
                  <h2>New Seller Onboarding Pipeline</h2>
                  <p>Phase {wizardStep} of 5 &bull; {wizardStep === 1 ? "Personal Details" : wizardStep === 2 ? "Business & Tax" : wizardStep === 3 ? "Bank Details" : wizardStep === 4 ? "Document Uploads" : "Final Submit"}</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setShowOnboardModal(false)}>×</button>
            </div>

            {/* Stepper Progress */}
            <div style={{ display: "flex", background: "#0b1120", borderBottom: "1px solid #1e293b", padding: "12px 24px", gap: "8px", overflowX: "auto" }}>
              {[
                { step: 1, label: "1. Personal" },
                { step: 2, label: "2. Business" },
                { step: 3, label: "3. Bank" },
                { step: 4, label: "4. Documents" },
                { step: 5, label: "5. Submit" },
              ].map((s) => (
                <div
                  key={s.step}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    background: wizardStep === s.step ? "#f59e0b" : wizardStep > s.step ? "#1e293b" : "#0f172a",
                    color: wizardStep === s.step ? "#111827" : wizardStep > s.step ? "#10b981" : "#64748b",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </div>
              ))}
            </div>

            {/* Body */}
            <form onSubmit={handleNextWizardStep}>
              <div className="luxury-modal-body">
                {wizardStep === 1 && (
                  <div className="form-section-card">
                    <div className="section-card-title">
                      <User size={16} /> Phase 1: Personal & Primary KYC
                    </div>
                    <div className="luxury-form-grid">
                      <div className="input-field-wrap full-width">
                        <label>Authorized Signatory Name <span className="required-star">*</span></label>
                        <input
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={wizardForm.name}
                          onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>Email Address <span className="required-star">*</span></label>
                        <input
                          required
                          type="email"
                          placeholder="ramesh@company.com"
                          value={wizardForm.email}
                          onChange={(e) => setWizardForm({ ...wizardForm, email: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>Phone Number <span className="required-star">*</span></label>
                        <input
                          required
                          placeholder="+91 98765 43210"
                          value={wizardForm.phone}
                          onChange={(e) => setWizardForm({ ...wizardForm, phone: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>PAN Card Number <span className="required-star">*</span></label>
                        <input
                          required
                          placeholder="ABCDE1234F"
                          className="font-mono"
                          value={wizardForm.panNumber}
                          onChange={(e) => setWizardForm({ ...wizardForm, panNumber: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>Aadhaar Card Number</label>
                        <input
                          placeholder="1234 5678 9012"
                          className="font-mono"
                          value={wizardForm.aadhaarNumber}
                          onChange={(e) => setWizardForm({ ...wizardForm, aadhaarNumber: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="form-section-card">
                    <div className="section-card-title">
                      <Building2 size={16} /> Phase 2: Business & Tax Details
                    </div>
                    <div className="luxury-form-grid">
                      <div className="input-field-wrap full-width">
                        <label>Registered Legal Company Name <span className="required-star">*</span></label>
                        <input
                          required
                          placeholder="e.g. Ramesh Steels & Infra Pvt Ltd"
                          value={wizardForm.companyName}
                          onChange={(e) => setWizardForm({ ...wizardForm, companyName: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>Business Structure <span className="required-star">*</span></label>
                        <select
                          value={wizardForm.businessType}
                          onChange={(e) => setWizardForm({ ...wizardForm, businessType: e.target.value })}
                        >
                          <option value="PRIVATE_LIMITED">Private Limited (Pvt Ltd)</option>
                          <option value="PROPRIETORSHIP">Sole Proprietorship</option>
                          <option value="LLP">Limited Liability Partnership (LLP)</option>
                          <option value="PARTNERSHIP">Partnership Firm</option>
                        </select>
                      </div>
                      <div className="input-field-wrap">
                        <label>GSTIN Code <span className="required-star">*</span></label>
                        <input
                          required
                          placeholder="27ABCDE1234F1Z5"
                          className="font-mono"
                          value={wizardForm.gstin}
                          onChange={(e) => setWizardForm({ ...wizardForm, gstin: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap full-width">
                        <label>Registered Business Address</label>
                        <input
                          placeholder="Plot 12, GIDC Industrial Estate, Vatva"
                          value={wizardForm.businessAddress}
                          onChange={(e) => setWizardForm({ ...wizardForm, businessAddress: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>City</label>
                        <input
                          value={wizardForm.city}
                          onChange={(e) => setWizardForm({ ...wizardForm, city: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>State</label>
                        <input
                          value={wizardForm.state}
                          onChange={(e) => setWizardForm({ ...wizardForm, state: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>Pincode</label>
                        <input
                          value={wizardForm.pincode}
                          onChange={(e) => setWizardForm({ ...wizardForm, pincode: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="form-section-card">
                    <div className="section-card-title">
                      <CreditCard size={16} /> Phase 3: Bank & Settlement Details
                    </div>
                    <div className="luxury-form-grid">
                      <div className="input-field-wrap">
                        <label>Bank Name</label>
                        <input
                          value={wizardForm.bankName}
                          onChange={(e) => setWizardForm({ ...wizardForm, bankName: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>Account Holder Name</label>
                        <input
                          placeholder="As per bank passbook"
                          value={wizardForm.accountHolderName}
                          onChange={(e) => setWizardForm({ ...wizardForm, accountHolderName: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>Bank Account Number <span className="required-star">*</span></label>
                        <input
                          required
                          className="font-mono"
                          placeholder="50200012345678"
                          value={wizardForm.accountNumber}
                          onChange={(e) => setWizardForm({ ...wizardForm, accountNumber: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>IFSC Code <span className="required-star">*</span></label>
                        <input
                          required
                          className="font-mono"
                          placeholder="HDFC0000123"
                          value={wizardForm.ifscCode}
                          onChange={(e) => setWizardForm({ ...wizardForm, ifscCode: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>Account Type</label>
                        <select
                          value={wizardForm.accountType}
                          onChange={(e) => setWizardForm({ ...wizardForm, accountType: e.target.value })}
                        >
                          <option value="CURRENT">Current Account</option>
                          <option value="SAVINGS">Savings Account</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 4 && (
                  <div className="form-section-card">
                    <div className="section-card-title">
                      <FileCheck size={16} /> Phase 4: Mandatory Document Uploads (PAN, Aadhaar, GST)
                    </div>
                    <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 16px 0" }}>
                      Three compliance documents are required for marketplace KYC verification.
                    </p>

                    <div className="luxury-form-grid">
                      <div className="input-field-wrap">
                        <label>1. PAN Card Document URL / Sample</label>
                        <input
                          value={wizardForm.panFileUrl}
                          onChange={(e) => setWizardForm({ ...wizardForm, panFileUrl: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap">
                        <label>2. Aadhaar Card Document URL / Sample</label>
                        <input
                          value={wizardForm.aadhaarFileUrl}
                          onChange={(e) => setWizardForm({ ...wizardForm, aadhaarFileUrl: e.target.value })}
                        />
                      </div>
                      <div className="input-field-wrap full-width">
                        <label>3. GST Certificate Document URL / Sample</label>
                        <input
                          value={wizardForm.gstFileUrl}
                          onChange={(e) => setWizardForm({ ...wizardForm, gstFileUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 5 && (
                  <div className="form-section-card">
                    <div className="section-card-title">
                      <CheckCircle2 size={16} /> Phase 5: Final Submission Confirmation
                    </div>
                    <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <p style={{ fontSize: "13px", color: "#0f172a", margin: "0 0 8px 0", fontWeight: 700 }}>
                        Ready to submit onboarding package for compliance review?
                      </p>
                      <ul style={{ fontSize: "12px", color: "#475569", margin: 0, paddingLeft: "18px", lineHeight: 1.8 }}>
                        <li>✓ Phase 1: Signatory {wizardForm.name} ({wizardForm.email})</li>
                        <li>✓ Phase 2: {wizardForm.companyName} (GSTIN: {wizardForm.gstin})</li>
                        <li>✓ Phase 3: Bank Account {wizardForm.accountNumber} ({wizardForm.ifscCode})</li>
                        <li>✓ Phase 4: 3 Mandatory KYC Documents attached</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="luxury-modal-footer">
                {wizardStep > 1 && (
                  <button type="button" className="btn-luxury-cancel" onClick={() => setWizardStep(wizardStep - 1)}>
                    Back
                  </button>
                )}
                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                  <button type="button" className="btn-luxury-cancel" onClick={() => setShowOnboardModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-luxury-submit">
                    {wizardStep === 5 ? "Submit for Review (Phase 5)" : "Save & Continue →"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
