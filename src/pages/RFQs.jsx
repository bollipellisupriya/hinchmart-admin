import { useEffect, useState, useMemo } from "react";
import { Search, Eye, X, Clock, FileText, User, Package, RotateCcw, Download, CheckCircle2, IndianRupee } from "lucide-react";
import { getRFQs, closeRFQ } from "../api/rfqApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";


export default function RFQs() {
  const toast = useToast();
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedRFQ, setSelectedRFQ] = useState(null);

  const loadRFQs = async () => {
    try {
      setLoading(true);
      const data = await getRFQs();
      const list = Array.isArray(data) ? data : data.rfqs || data.data || [];
      setRfqs(list);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load RFQs from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRFQs();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "rfqs") {
        loadRFQs();
      }
    });
    return unsub;
  }, []);

  const handleClose = async (rfq) => {
    const id = rfq.id || rfq._id;
    if (!window.confirm(`Close quotation request for "${rfq.productName || rfq.title}"?`)) return;
    try {
      await closeRFQ(id);
      toast.info(`RFQ #${rfq.rfqNumber || id} marked as closed.`);
      await loadRFQs();
      if (selectedRFQ && (selectedRFQ.id || selectedRFQ._id) === id) {
        setSelectedRFQ((prev) => ({ ...prev, status: "CLOSED" }));
      }
    } catch (err) {
      toast.error("Failed to close RFQ.");
    }
  };

  const getStatus = (rfq) => {
    return (rfq.status || "OPEN").toUpperCase();
  };

  const filteredRFQs = useMemo(() => {
    return rfqs.filter((rfq) => {
      const text = `${rfq.productName || rfq.title || ""} ${rfq.buyer?.name || rfq.buyerName || ""} ${rfq.rfqNumber || ""}`.toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const status = getStatus(rfq);
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rfqs, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: rfqs.length,
      open: rfqs.filter((r) => getStatus(r) === "OPEN").length,
      quoted: rfqs.filter((r) => getStatus(r) === "QUOTED").length,
      closed: rfqs.filter((r) => getStatus(r) === "CLOSED").length,
    };
  }, [rfqs]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Requests for Quotation (RFQs)</h1>
          <p>Manage custom bulk purchasing demands, procurement briefs & merchant quotes</p>
        </div>
      </div>

      <div className="header-stats-strip">
        <div
          className={`stat-pill ${statusFilter === "ALL" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <span className="stat-pill-label">Total RFQs</span>
          <strong className="stat-pill-value">{counts.total}</strong>
        </div>

        <div
          className={`stat-pill active ${statusFilter === "OPEN" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("OPEN")}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Active / Open</span>
          <strong className="stat-pill-value">{counts.open}</strong>
        </div>

        <div
          className={`stat-pill pending ${statusFilter === "QUOTED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("QUOTED")}
        >
          <span className="pulse-dot amber"></span>
          <span className="stat-pill-label">Quotes Submitted</span>
          <strong className="stat-pill-value">{counts.quoted}</strong>
        </div>

        <div
          className={`stat-pill inactive ${statusFilter === "CLOSED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("CLOSED")}
        >
          <span className="stat-pill-label">Closed</span>
          <strong className="stat-pill-value">{counts.closed}</strong>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button onClick={loadRFQs}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      <div className="content-card">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Search RFQs by requirement, buyer, RFQ code..."
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
              { id: "ALL", label: "All RFQs", count: counts.total },
              { id: "OPEN", label: "Open", count: counts.open },
              { id: "QUOTED", label: "Quoted", count: counts.quoted },
              { id: "CLOSED", label: "Closed", count: counts.closed },
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

        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading procurement RFQs...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>RFQ Identifier</th>
                  <th>Product / Specification</th>
                  <th>Requesting Buyer</th>
                  <th>Required Quantity</th>
                  <th>Target Deadline</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRFQs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-table">
                      <div className="empty-table-content">
                        <FileText size={40} className="empty-icon" />
                        <h3>No RFQs found</h3>
                        <p>{search ? `No RFQs matching "${search}"` : "No quotation briefs under this filter."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRFQs.map((rfq) => {
                    const status = getStatus(rfq);
                    const id = rfq.id || rfq._id;
                    return (
                      <tr key={id}>
                        <td>
                          <span className="rfq-number font-mono">
                            <FileText size={13} />
                            {rfq.rfqNumber || rfq.number || `#${id?.slice(-6) || "—"}`}
                          </span>
                        </td>
                        <td>
                          <div className="product-need-cell">
                            <Package size={14} />
                            <strong>{rfq.productName || rfq.title || "—"}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="user-cell compact">
                            <User size={13} />
                            <span>{rfq.buyer?.name || rfq.buyerName || "—"}</span>
                          </div>
                        </td>
                        <td>
                          <strong>{rfq.quantity || "—"}</strong> <small>{rfq.unit || "Units"}</small>
                        </td>
                        <td className="date-cell">
                          {rfq.deadline || rfq.deliveryDate
                            ? new Date(rfq.deadline || rfq.deliveryDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td>
                          <span className={`status-badge-glow status-${status.toLowerCase()}`}>
                            <span className="status-dot"></span>
                            {status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
                            <button className="icon-action" title="View RFQ" onClick={() => setSelectedRFQ(rfq)}>
                              <Eye size={16} />
                            </button>
                            {status === "OPEN" && (
                              <button className="icon-action danger" title="Close RFQ" onClick={() => handleClose(rfq)}>
                                <X size={16} />
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

      {/* =========================================================================
          DYNAMIC LUXURY POPUP MODAL: RFQ SPECIFICATIONS DOSSIER
          ========================================================================= */}
      {selectedRFQ && (
        <div className="modal-overlay" onClick={() => setSelectedRFQ(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Dark Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                  <FileText size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>RFQ Brief #{selectedRFQ.rfqNumber || selectedRFQ.number || selectedRFQ.id}</h2>
                  <p>
                    Requested by <strong>{selectedRFQ.buyer?.name || selectedRFQ.buyerName || "Enterprise Buyer"}</strong>
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`status-badge-glow status-${getStatus(selectedRFQ).toLowerCase()}`}>
                  <span className="status-dot"></span>
                  {getStatus(selectedRFQ)}
                </span>
                <button className="header-close-btn" onClick={() => setSelectedRFQ(null)}>×</button>
              </div>
            </div>

            <div className="luxury-modal-body">
              {/* Product & Volume Highlight */}
              <div className="form-section-card" style={{ background: "#fffdf5", borderColor: "#fde68a" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Requested SKU / Material</span>
                    <strong style={{ display: "block", fontSize: 18, color: "#0f172a", marginTop: 2 }}>
                      {selectedRFQ.productName || selectedRFQ.title || "Custom Bulk Material"}
                    </strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Bulk Volume</span>
                    <strong className="font-mono" style={{ display: "block", fontSize: 20, color: "#d97706" }}>
                      {selectedRFQ.quantity || "—"} {selectedRFQ.unit || "Units"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* RFQ Parameters Grid */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <FileText size={13} /> Quotation Parameters & Timeline
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Requesting Enterprise</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                      {selectedRFQ.buyer?.name || selectedRFQ.buyerName || "—"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Target Delivery / Deadline</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>
                      {(selectedRFQ.deadline || selectedRFQ.deliveryDate)
                        ? new Date(selectedRFQ.deadline || selectedRFQ.deliveryDate).toLocaleDateString("en-IN", { dateStyle: "long" })
                        : "Immediate fulfillment"}
                    </div>
                  </div>

                  <div className="input-field-wrap full-width">
                    <label>Technical Specifications & Custom Requirements</label>
                    <div style={{ padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, lineHeight: 1.6, color: "#334155" }}>
                      {selectedRFQ.description || selectedRFQ.requirements || "Standard manufacturer compliance and test certificate required."}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <div className="footer-tip-text">
                <Clock size={13} /> Published to verified suppliers matching category taxonomy
              </div>
              <div className="footer-action-buttons">
                {getStatus(selectedRFQ) === "OPEN" && (
                  <button
                    className="btn-luxury-cancel"
                    style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                    onClick={() => {
                      handleClose(selectedRFQ);
                      setSelectedRFQ(null);
                    }}
                  >
                    <X size={13} /> Close RFQ
                  </button>
                )}
                <button className="btn-luxury-cancel" onClick={() => setSelectedRFQ(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

