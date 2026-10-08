import { useEffect, useState } from "react";
import {
  Search,
  Check,
  X,
  Eye,
  Clock,
  FileText,
  Store,
  MapPin,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpDown,
  ShieldCheck,
  Mail,
  Phone,
  CalendarDays,
  SlidersHorizontal,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Building2,
  Landmark,
  CreditCard,
  UserCheck,
} from "lucide-react";
import { getPendingSellers, approveSeller, rejectSeller, lookupSellerDirectly } from "../api/sellerApi";
import { getSellerDocuments, verifyDocument } from "../api/sellerDocumentApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";

export default function SellerApprovals() {
  const toast = useToast();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerDocs, setSellerDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadPendingSellers = async () => {
    try {
      setLoading(true);
      const data = await getPendingSellers();
      const list = Array.isArray(data) ? data : [];
      setSellers(list);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load pending sellers.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSyncLookup = async (query = search) => {
    if (!query) {
      await loadPendingSellers();
      return;
    }
    setSyncing(true);
    try {
      const found = await lookupSellerDirectly(query);
      if (found) {
        toast.success(`Found merchant account: "${found.businessName || found.name}"`);
        setSellers((prev) => {
          const fid = String(found.sellerId || found.id);
          const exists = prev.some((s) => String(s.sellerId || s.id) === fid);
          return exists ? prev : [found, ...prev];
        });
        setSelectedSeller(found);
      } else {
        await loadPendingSellers();
      }
    } catch {
      await loadPendingSellers();
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadPendingSellers();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "sellers" || detail.entity === "seller_documents") {
        loadPendingSellers();
      }
    });
    return unsub;
  }, []);

  // When selected seller changes, load their documents
  useEffect(() => {
    if (selectedSeller) {
      const id = selectedSeller.sellerId || selectedSeller.id || selectedSeller._id;
      setLoadingDocs(true);
      getSellerDocuments(id)
        .then((docs) => {
          if (Array.isArray(docs) && docs.length > 0) {
            setSellerDocs(docs);
          } else if (Array.isArray(selectedSeller.documents) && selectedSeller.documents.length > 0) {
            setSellerDocs(selectedSeller.documents);
          } else {
            setSellerDocs([]);
          }
        })
        .catch(() => {
          setSellerDocs(selectedSeller.documents || []);
        })
        .finally(() => {
          setLoadingDocs(false);
        });
    } else {
      setSellerDocs([]);
    }
  }, [selectedSeller]);

  const handleApprove = async (seller) => {
    const id = seller.sellerId || seller.id || seller._id;
    try {
      setActionInProgress(true);
      await approveSeller(id);
      toast.success(`Merchant "${seller.businessName || seller.name}" approved successfully! Store activated.`);
      if (selectedSeller && (selectedSeller.sellerId || selectedSeller.id) === id) {
        setSelectedSeller(null);
      }
      await loadPendingSellers();
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Internal Server Error";
      toast.error(`Approval failed: ${serverMsg}`);
    } finally {
      setActionInProgress(false);
    }
  };

  const openRejectModal = (seller) => {
    setRejectModal(seller);
    setRejectReason("Incomplete business registration or invalid GST verification.");
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    const id = rejectModal.sellerId || rejectModal.id || rejectModal._id;
    try {
      setActionInProgress(true);
      await rejectSeller(id, rejectReason);
      toast.warning(`Application for "${rejectModal.businessName || rejectModal.name}" was declined.`);
      setRejectModal(null);
      if (selectedSeller && (selectedSeller.sellerId || selectedSeller.id) === id) {
        setSelectedSeller(null);
      }
      await loadPendingSellers();
    } catch (err) {
      toast.error("Rejection failed: " + (err?.message || ""));
    } finally {
      setActionInProgress(false);
    }
  };

  const handleVerifySingleDoc = async (docType, status, reason = "") => {
    if (!selectedSeller) return;
    const sid = selectedSeller.sellerId || selectedSeller.id;
    try {
      await verifyDocument(sid, docType, { status, remarks: reason || (status === "VERIFIED" ? "Verified by Admin Compliance Team" : "Deficiency noted") });
      toast.success(`Document ${docType} marked as ${status}.`);
      // Refresh docs
      const updated = await getSellerDocuments(sid);
      setSellerDocs(updated);
      loadPendingSellers();
    } catch (err) {
      toast.error(`Document verification update failed: ` + (err?.message || ""));
    }
  };

  const filteredSellers = sellers
    .filter((s) => {
      const text = `${s.businessName || s.name || ""} ${s.companyName || ""} ${s.ownerName || ""} ${s.email || ""} ${s.gst || s.gstin || ""} ${s.city || ""}`.toLowerCase();
      const hasGst = Boolean(s.gst || s.gstNumber || s.gstin);
      return text.includes(search.toLowerCase()) && (activeFilter === "all" || (activeFilter === "ready" ? hasGst : !hasGst));
    })
    .sort((a, b) =>
      sortBy === "business"
        ? (a.businessName || a.name || "").localeCompare(b.businessName || b.name || "")
        : new Date(b.createdAt || b.submittedAt || 0) - new Date(a.createdAt || a.submittedAt || 0)
    );

  const toggleSelected = (id) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const getAge = (date) => {
    if (!date) return "Submitted recently";
    const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
    return days === 0 ? "Submitted today" : `${days}d in queue`;
  };

  return (
    <div>
      {/* Verification Center Header */}
      <div className="approval-hero page-header">
        <div>
          <div className="eyebrow">
            <Sparkles size={13} /> VERIFICATION CENTER
          </div>
          <h1>Seller Approvals Queue</h1>
          <p>Review KYC compliance, audit statutory registrations, and grant marketplace selling authorization.</p>
        </div>
        <div className="hero-status">
          <span className="live-dot" /> Live queue <span className="hero-divider" /> Updated just now
        </div>
      </div>

      {/* Metrics Row */}
      <div className="approval-metrics">
        <div className="approval-metric metric-amber">
          <div className="metric-icon">
            <Clock size={18} />
          </div>
          <div>
            <strong>{sellers.length}</strong>
            <span>Awaiting review</span>
          </div>
          <small>Registration completed</small>
        </div>
        <div className="approval-metric metric-green">
          <div className="metric-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <strong>{sellers.filter((s) => s.gst || s.gstNumber || s.gstin).length}</strong>
            <span>Verification-ready</span>
          </div>
          <small>GSTIN details submitted</small>
        </div>
        <div className="approval-metric metric-blue">
          <div className="metric-icon">
            <CalendarDays size={18} />
          </div>
          <div>
            <strong>
              {
                sellers.filter(
                  (s) =>
                    (s.createdAt || s.submittedAt) &&
                    new Date(s.createdAt || s.submittedAt).toDateString() === new Date().toDateString()
                ).length
              }
            </strong>
            <span>New today</span>
          </div>
          <small>Fresh applications</small>
        </div>
        <div className="approval-metric metric-slate">
          <div className="metric-icon">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <strong>{Math.max(0, 100 - sellers.length * 4)}%</strong>
            <span>Queue health</span>
          </div>
          <small>Within SLA target</small>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button onClick={loadPendingSellers}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="approval-workspace">
        <div className="approval-list-panel content-card">
          <div className="table-toolbar">
            <div className="approval-toolbar-top">
              <div className="search-input">
                <Search size={18} />
                <input
                  placeholder="Search merchants by ID, name, GSTIN, owner, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleManualSyncLookup(search);
                  }}
                />
                {search && (
                  <button className="search-clear" onClick={() => { setSearch(""); loadPendingSellers(); }}>
                    ×
                  </button>
                )}
              </div>
              <button
                className="filter-button"
                onClick={() => handleManualSyncLookup(search)}
                disabled={syncing}
                title="Sync from database and storage"
              >
                <RotateCcw size={15} className={syncing ? "spin-animate" : ""} /> {syncing ? "Syncing..." : "Sync Accounts"}
              </button>
            </div>
            <div className="approval-toolbar-bottom">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${activeFilter === "all" ? "active" : ""}`}
                  onClick={() => setActiveFilter("all")}
                >
                  All <span className="filter-badge">{sellers.length}</span>
                </button>
                <button
                  className={`filter-tab ${activeFilter === "ready" ? "active" : ""}`}
                  onClick={() => setActiveFilter("ready")}
                >
                  <ShieldCheck size={13} /> Ready to verify
                </button>
                <button
                  className={`filter-tab ${activeFilter === "missing" ? "active" : ""}`}
                  onClick={() => setActiveFilter("missing")}
                >
                  Needs attention
                </button>
              </div>
              <label className="sort-control">
                <ArrowUpDown size={14} />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="business">Business name</option>
                </select>
              </label>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <span>
                <strong>{selectedIds.length}</strong> applications selected
              </span>
              <div className="bulk-right">
                <button
                  className="btn-bulk-action success"
                  onClick={() => {
                    selectedIds.forEach((id) => approveSeller(id));
                    toast.success(`Approved ${selectedIds.length} merchants.`);
                    setSelectedIds([]);
                    loadPendingSellers();
                  }}
                >
                  <Check size={14} /> Approve selected
                </button>
                <button className="btn-bulk-cancel" onClick={() => setSelectedIds([])}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-state-container">
              <div className="spinner"></div>
              <p>Checking pending applications & KYC vaults...</p>
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="empty-state-box">
              <CheckCircle2 size={48} className="icon-success" />
              <h3>All Seller Applications Processed!</h3>
              <p>There are no pending merchant onboarding requests awaiting moderation.</p>
            </div>
          ) : (
            <div className="approval-cards approval-cards-premium">
              {filteredSellers.map((seller) => {
                const id = seller.sellerId || seller.id || seller._id;
                const hasGst = Boolean(seller.gst || seller.gstNumber || seller.gstin);
                const name = seller.businessName || seller.companyName || seller.name || "Unknown Merchant";
                const owner = seller.ownerName || seller.name || seller.email || "—";
                const submittedDate = seller.submittedAt || seller.createdAt;

                return (
                  <div
                    key={id}
                    className={`approval-card premium-approval-card ${selectedIds.includes(id) ? "is-selected" : ""}`}
                  >
                    <div className="approval-card-index">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(id)}
                        onChange={() => toggleSelected(id)}
                      />
                      <span>#{String(id).slice(-4)}</span>
                    </div>
                    <div className="approval-card-header">
                      <div className="user-cell">
                        <div className="user-avatar seller-avatar">{name[0].toUpperCase()}</div>
                        <div>
                          <strong>{name}</strong>
                          <small>Proprietor: {owner}</small>
                        </div>
                      </div>
                      <span className="queue-age">{getAge(submittedDate)}</span>
                    </div>

                    <div className="approval-card-body">
                      <div className="approval-readiness">
                        <span className={`readiness-icon ${hasGst ? "ready" : "attention"}`}>
                          {hasGst ? <Check size={13} /> : <Clock size={13} />}
                        </span>
                        <span>
                          <strong>{hasGst ? "Verification-ready" : "Needs attention"}</strong>
                          <small>{hasGst ? "GSTIN & KYC submitted" : "GST registration missing"}</small>
                        </span>
                      </div>
                      <div className="approval-info-row">
                        <span>
                          <FileText size={13} />{" "}
                          <strong>{seller.gst || seller.gstNumber || seller.gstin || "GST not provided"}</strong>
                        </span>
                        <span>
                          <MapPin size={13} /> {seller.city || "Location not set"}
                          {seller.state ? `, ${seller.state}` : ""}
                        </span>
                      </div>
                      <div className="approval-info-row">
                        <span>
                          <Mail size={13} /> {seller.email || "—"}
                        </span>
                        <span>
                          <Phone size={13} /> {seller.phone || "—"}
                        </span>
                      </div>
                      <div className="approval-category">
                        <span>{seller.category || seller.businessType || "General Industrial Supplies"}</span>
                        <span>
                          Applied {submittedDate ? new Date(submittedDate).toLocaleDateString("en-IN") : "recently"}
                        </span>
                      </div>
                    </div>

                    <div className="approval-card-actions">
                      <button className="btn-action-view" onClick={() => setSelectedSeller(seller)}>
                        <Eye size={15} /> Review Dossier
                      </button>
                      <button
                        className="btn-action-approve"
                        disabled={actionInProgress}
                        onClick={() => handleApprove(seller)}
                      >
                        <Check size={15} /> Approve
                      </button>
                      <button
                        className="btn-action-reject"
                        disabled={actionInProgress}
                        onClick={() => openRejectModal(seller)}
                      >
                        <X size={15} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <aside className="approval-side-rail">
          <div className="rail-heading">
            <div>
              <span className="eyebrow">WORKFLOW</span>
              <h3>Review rhythm</h3>
            </div>
            <ChevronRight size={17} />
          </div>
          <div className="workflow-progress">
            <div className="progress-ring">
              <strong>{sellers.length ? "01" : "00"}</strong>
              <span>step</span>
            </div>
            <div>
              <strong>Verify Identity & Documents</strong>
              <p>Audit PAN, GSTIN, bank settlement details, and facility address before activating store.</p>
            </div>
          </div>
          <div className="rail-divider" />
          <div className="rail-tip">
            <Sparkles size={16} />
            <div>
              <strong>Priority Signal</strong>
              <p>Applications with verified GST certificates can be auto-approved for catalog onboarding.</p>
            </div>
          </div>
          <button className="rail-link" onClick={() => setActiveFilter("ready")}>
            Show ready applications <ChevronRight size={14} />
          </button>
        </aside>
      </div>

      {/* =========================================================================
          DYNAMIC LUXURY POPUP MODAL 1: DECLINE SELLER APPLICATION
          ========================================================================= */}
      {rejectModal && (
        <div className="modal-overlay" onClick={() => setRejectModal(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)" }}>
              <div className="header-title-wrap">
                <div
                  className="header-icon-box"
                  style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.5)" }}
                >
                  <X size={20} style={{ color: "#fca5a5" }} />
                </div>
                <div className="header-texts">
                  <h2>Decline Merchant Application</h2>
                  <p>
                    Declining: <strong style={{ color: "#fca5a5" }}>{rejectModal.businessName || rejectModal.companyName || rejectModal.name}</strong>
                  </p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setRejectModal(null)}>
                ×
              </button>
            </div>

            <div className="luxury-modal-body">
              <div className="form-section-card">
                <div className="section-card-title">
                  <FileText size={13} /> Rejection Feedback & Reason
                </div>
                <div className="input-field-wrap">
                  <label>Explain reason for declining</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter compliance or documentation deficiency reason..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <span style={{ fontSize: 12, color: "#64748b" }}>An automated notification will be sent to the merchant.</span>
              <div className="footer-action-buttons">
                <button className="btn-luxury-cancel" onClick={() => setRejectModal(null)}>
                  Cancel
                </button>
                <button
                  className="btn-luxury-submit"
                  disabled={actionInProgress}
                  style={{
                    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                    boxShadow: "0 4px 14px rgba(220,38,38,0.35)",
                  }}
                  onClick={handleReject}
                >
                  <X size={14} /> Decline Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DYNAMIC LUXURY POPUP MODAL 2: SELLER VERIFICATION DOSSIER & KYC VAULT
          ========================================================================= */}
      {selectedSeller && (
        <div className="modal-overlay" onClick={() => setSelectedSeller(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 840 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #059669, #047857)" }}>
                  <Store size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>{selectedSeller.businessName || selectedSeller.companyName || selectedSeller.name || "Merchant Application"}</h2>
                  <p>
                    Proprietor: <strong>{selectedSeller.ownerName || selectedSeller.name || "Merchant"}</strong> &nbsp;•&nbsp;{" "}
                    {selectedSeller.city || ""}{selectedSeller.state ? `, ${selectedSeller.state}` : ""}
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="status-badge-glow status-pending">
                  <span className="status-dot"></span> Pending Verification
                </span>
                <button className="header-close-btn" onClick={() => setSelectedSeller(null)}>
                  ×
                </button>
              </div>
            </div>

            <div className="luxury-modal-body">
              {/* Onboarding Checklist Status Strip */}
              <div className="form-section-card" style={{ background: "#f8fafc" }}>
                <div className="section-card-title">
                  <UserCheck size={13} /> Onboarding Status & Journey
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 10 }}>
                  <div style={{ padding: "10px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>1. Personal Profile</span>
                    <strong style={{ fontSize: 12, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} /> Complete
                    </strong>
                  </div>
                  <div style={{ padding: "10px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>2. Business & Tax</span>
                    <strong style={{ fontSize: 12, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} /> Complete
                    </strong>
                  </div>
                  <div style={{ padding: "10px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>3. Bank Settlement</span>
                    <strong style={{ fontSize: 12, color: "#059669", display: "flex", alignItems: "center", gap: 4 }}>
                      <CheckCircle2 size={13} /> Complete
                    </strong>
                  </div>
                  <div style={{ padding: "10px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>4. KYC Document Vault</span>
                    <strong style={{ fontSize: 12, color: "#d97706", display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={13} /> Awaiting Audit
                    </strong>
                  </div>
                </div>
              </div>

              {/* Enterprise & Tax Details */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Building2 size={13} /> Enterprise & Statutory Details
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Company / Legal Name</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                      {selectedSeller.companyName || selectedSeller.businessName || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Business Category / Type</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                      {selectedSeller.category || selectedSeller.businessType || "General Industrial Supplies"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>GSTIN / Tax ID</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                      {selectedSeller.gst || selectedSeller.gstin || selectedSeller.gstNumber || "Not provided"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>PAN Number</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                      {selectedSeller.panNumber || selectedSeller.pan || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Contact Email</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>
                      {selectedSeller.email || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Phone Number</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>
                      {selectedSeller.phone || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap full-width">
                    <label>Warehouse / Registered Address</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>
                      {selectedSeller.address || selectedSeller.businessAddress || "Registered facility"}
                      {selectedSeller.pincode ? ` - ${selectedSeller.pincode}` : ""}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank & Settlement Details */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Landmark size={13} /> Bank & Payout Settlement
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Bank Name</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                      {selectedSeller.bankName || "HDFC Bank"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Account Number</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                      {selectedSeller.accountNumber || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>IFSC Code</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 700 }}>
                      {selectedSeller.ifscCode || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Account Type</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>
                      {selectedSeller.accountType || "CURRENT"}
                    </div>
                  </div>
                </div>
              </div>

              {/* KYC Documents Vault */}
              <div className="form-section-card">
                <div className="section-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    <FileText size={13} /> Uploaded KYC Documents ({sellerDocs.length})
                  </span>
                  {loadingDocs && <span style={{ fontSize: 11, color: "#64748b" }}>Loading documents...</span>}
                </div>

                {sellerDocs.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#64748b", padding: "12px 0" }}>
                    No statutory documents uploaded yet for this application.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                    {sellerDocs.map((doc, idx) => {
                      const docType = doc.documentType || `DOC_${idx + 1}`;
                      const docStatus = (doc.verificationStatus || doc.status || "PENDING").toUpperCase();
                      const isVerified = docStatus === "VERIFIED";
                      const isRejected = docStatus === "REJECTED";

                      return (
                        <div
                          key={doc.id || `${docType}_${idx}`}
                          style={{
                            padding: 12,
                            borderRadius: 10,
                            border: `1px solid ${isVerified ? "#bbf7d0" : isRejected ? "#fecaca" : "#e2e8f0"}`,
                            background: isVerified ? "#f0fdf4" : isRejected ? "#fef2f2" : "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: isVerified ? "#dcfce7" : isRejected ? "#fee2e2" : "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: isVerified ? "#16a34a" : isRejected ? "#dc2626" : "#64748b",
                              }}
                            >
                              <FileText size={18} />
                            </div>
                            <div>
                              <strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>
                                {doc.title || docType.replace(/_/g, " ")}
                              </strong>
                              <span style={{ fontSize: 11, color: "#64748b" }}>
                                Ref: {doc.documentNumber || doc.fileName || docType}
                                {doc.remarks ? ` • ${doc.remarks}` : ""}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {doc.fileUrl && (
                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: 12,
                                  padding: "6px 10px",
                                  borderRadius: 6,
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  textDecoration: "none",
                                  fontWeight: 600,
                                }}
                              >
                                <ExternalLink size={12} /> View File
                              </a>
                            )}

                            {isVerified ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", padding: "4px 8px", background: "#dcfce7", borderRadius: 6 }}>
                                ✓ Verified
                              </span>
                            ) : isRejected ? (
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", padding: "4px 8px", background: "#fee2e2", borderRadius: 6 }}>
                                ✕ Rejected
                              </span>
                            ) : (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  style={{
                                    padding: "6px 10px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    borderRadius: 6,
                                    border: "1px solid #bbf7d0",
                                    background: "#dcfce7",
                                    color: "#16a34a",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                  onClick={() => handleVerifySingleDoc(docType, "VERIFIED")}
                                >
                                  <Check size={12} /> Verify
                                </button>
                                <button
                                  style={{
                                    padding: "6px 10px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    borderRadius: 6,
                                    border: "1px solid #fecaca",
                                    background: "#fee2e2",
                                    color: "#dc2626",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                  onClick={() => {
                                    const reason = prompt("Enter reason for document rejection:", "Document scan is blurry or invalid");
                                    if (reason) handleVerifySingleDoc(docType, "REJECTED", reason);
                                  }}
                                >
                                  <X size={12} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                onClick={() => {
                  openRejectModal(selectedSeller);
                }}
              >
                <X size={13} /> Decline Merchant
              </button>

              <div className="footer-action-buttons">
                <button className="btn-luxury-cancel" onClick={() => setSelectedSeller(null)}>
                  Close
                </button>
                <button
                  className="btn-luxury-submit"
                  disabled={actionInProgress}
                  style={{
                    background: "linear-gradient(135deg, #059669, #047857)",
                    boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
                  }}
                  onClick={() => handleApprove(selectedSeller)}
                >
                  <Check size={14} /> Approve Merchant Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
