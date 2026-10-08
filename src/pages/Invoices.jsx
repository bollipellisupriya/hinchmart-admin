import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Search,
  Eye,
  Filter,
  RotateCcw,
  Download,
  Building2,
  Store,
  CheckCircle2,
  Clock,
  IndianRupee,
  AlertCircle,
  ExternalLink,
  Printer,
  Lock,
} from "lucide-react";
import {
  getInvoices,
  previewOrderInvoicePdf,
  downloadOrderInvoicePdf,
} from "../api/invoiceApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";


export default function Invoices() {
  const navigate = useNavigate();
  const toast = useToast();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Dynamic View Invoice Popup Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const data = await getInvoices(params);
      setInvoices(Array.isArray(data) ? data : data.invoices || data.data || []);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to view invoices.");
      } else {
        setError("Unable to load invoices from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "invoices" || detail.entity === "orders") {
        loadInvoices();
      }
    });
    return unsub;
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      const q = search.toLowerCase();
      const text = `${item.invoiceNumber || ""} ${item.orderNumber || ""} ${item.buyer?.name || item.buyerName || ""} ${item.seller?.name || item.sellerName || ""}`.toLowerCase();
      const matchesSearch = text.includes(q);
      const status = (item.status || "").toUpperCase();
      const matchesStatus = statusFilter === "ALL" || status === statusFilter.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const handleExportCSV = () => {
    const headers = ["Invoice No,Order No,Buyer,Seller,Taxable Amount,GST,Total,Status,Date"];
    const rows = filteredInvoices.map((inv) =>
      [
        `"${inv.invoiceNumber}"`,
        `"${inv.orderNumber}"`,
        `"${inv.buyer?.name || inv.buyerName || ""}"`,
        `"${inv.seller?.name || inv.sellerName || ""}"`,
        inv.taxableAmount || 0,
        inv.gst || 0,
        inv.total || 0,
        `"${inv.status || "Generated"}"`,
        `"${inv.date || ""}"`,
      ].join(",")
    );
    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_invoices_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Invoices records exported to CSV!");
  };

  return (
    <div className="invoices-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Invoice & GST Compliance Management</h1>
          <p>Audit tax invoices, GST breakdowns & B2B compliance billing across marketplace orders</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${statusFilter === "ALL" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <span className="stat-pill-label">Total Invoices</span>
          <strong className="stat-pill-value">{invoices.length}</strong>
        </div>

        <div
          className={`stat-pill active ${statusFilter === "PAID" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("PAID")}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Paid Invoices</span>
          <strong className="stat-pill-value">{invoices.filter((i) => (i.status || "").toUpperCase() === "PAID").length}</strong>
        </div>

        <div
          className={`stat-pill pending ${statusFilter === "GENERATED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("GENERATED")}
        >
          <span className="pulse-dot amber"></span>
          <span className="stat-pill-label">Generated / Pending</span>
          <strong className="stat-pill-value">{invoices.filter((i) => (i.status || "").toUpperCase() === "GENERATED").length}</strong>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={loadInvoices}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="content-card">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Search by Invoice No, Order No, Buyer, Seller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch("")}>
                ×
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading invoice records from backend...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Order No</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Taxable Amount</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="empty-table">
                      <div className="empty-table-content">
                        <FileText size={42} style={{ color: "#94a3b8" }} />
                        <h3>No invoices found.</h3>
                        <p>{search ? `No invoices matching "${search}"` : "No invoices have been generated yet."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const id = inv.id || inv.invoiceNumber;
                    const status = (inv.status || "Generated").toUpperCase();

                    return (
                      <tr key={id}>
                        <td>
                          <span className="order-number font-mono">
                            <FileText size={13} />
                            {inv.invoiceNumber}
                          </span>
                        </td>
                        <td>
                          <span
                            className="font-mono text-link"
                            onClick={() => navigate(`/admin/orders/${inv.orderId || inv.orderNumber}`)}
                            title="Trace Order"
                            style={{ cursor: "pointer", color: "#2563eb", fontWeight: 700 }}
                          >
                            {inv.orderNumber}
                          </span>
                        </td>
                        <td>
                          <div className="user-subtext">
                            <Building2 size={13} />
                            <strong>{inv.buyer?.name || inv.buyerName || "—"}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="seller-subtext">
                            <Store size={13} />
                            <span>{inv.seller?.name || inv.sellerName || "—"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-mono">
                            ₹{Number(inv.taxableAmount || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td>
                          <span className="font-mono" style={{ color: "#d97706", fontWeight: 700 }}>
                            ₹{Number(inv.gst || 0).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td>
                          <strong className="amount-cell font-mono">
                            ₹{Number(inv.total || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <span
                            className={`status-badge-glow ${
                              status === "PAID" ? "status-delivered" : "status-pending"
                            }`}
                          >
                            <span className="status-dot"></span>
                            {inv.status || "Generated"}
                          </span>
                        </td>
                        <td className="date-cell">
                          <span>{inv.date || (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—")}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              className="btn-table-action view"
                              onClick={() => setSelectedInvoice(inv)}
                              title="Dynamic Tax Invoice Popup View"
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              className="btn-table-action"
                              style={{ borderColor: "#bfdbfe", color: "#2563eb", background: "#eff6ff" }}
                              onClick={() => previewOrderInvoicePdf(inv.orderId)}
                              title="Preview PDF (Inline)"
                            >
                              <Printer size={13} /> PDF
                            </button>
                            <button
                              className="btn-table-action"
                              style={{ borderColor: "#cbd5e1", color: "#475569" }}
                              onClick={() => downloadOrderInvoicePdf(inv.orderId)}
                              title="Download PDF Invoice"
                            >
                              <Download size={13} /> Download
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
          DYNAMIC POPUP MODAL: TAX INVOICE & GST BREAKDOWN
          ========================================================================= */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 740 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Dark Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  <FileText size={20} style={{ color: "#111827" }} />
                </div>
                <div className="header-texts">
                  <h2>Tax Invoice #{selectedInvoice.invoiceNumber || selectedInvoice.id}</h2>
                  <p>
                    Order: <strong>{selectedInvoice.orderNumber}</strong> &nbsp;•&nbsp; Billing Date: {selectedInvoice.date || "Today"}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`status-badge-glow ${(selectedInvoice.status || "").toUpperCase() === "PAID" ? "status-delivered" : "status-pending"}`}>
                  <span className="status-dot"></span>
                  {selectedInvoice.status || "Generated"}
                </span>
                <button className="header-close-btn" onClick={() => setSelectedInvoice(null)}>×</button>
              </div>
            </div>

            <div className="luxury-modal-body">
              {/* Total Invoice Value Banner */}
              <div className="form-section-card" style={{ background: "#fffdf5", borderColor: "#fde68a" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Statutory GST Invoice Value</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                      <Lock size={12} style={{ color: "#d97706" }} />
                      <span style={{ fontSize: 12, color: "#475569" }}>Official GST Compliant Billing</span>
                    </div>
                  </div>

                  <strong className="font-mono" style={{ fontSize: 28, color: "#0f172a" }}>
                    ₹{Number(selectedInvoice.total || 0).toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              {/* Billed To vs Billed From */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Building2 size={13} /> Invoice Parties
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Billed To (Buyer)</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                      <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedInvoice.buyer?.company || selectedInvoice.buyer?.name || selectedInvoice.buyerName}</strong>
                      <span className="font-mono" style={{ fontSize: 11.5, color: "#2563eb", marginTop: 2, display: "block" }}>
                        GSTIN: {selectedInvoice.buyer?.gstin || "24AAACA9876E1Z1"}
                      </span>
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Billed From (Seller)</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                      <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedInvoice.seller?.company || selectedInvoice.seller?.name || selectedInvoice.sellerName}</strong>
                      <span className="font-mono" style={{ fontSize: 11.5, color: "#2563eb", marginTop: 2, display: "block" }}>
                        GSTIN: {selectedInvoice.seller?.gstin || selectedInvoice.seller?.gst || "27AABCA1234F1Z8"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GST & Tax Breakdown */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <IndianRupee size={13} /> Statutory GST Breakdown (18%)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>Taxable Goods Subtotal:</span>
                    <strong className="font-mono">₹{Number(selectedInvoice.taxableAmount || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "#64748b" }}>Integrated GST (IGST 18%):</span>
                    <strong className="font-mono" style={{ color: "#d97706" }}>₹{Number(selectedInvoice.gst || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0" }}></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16 }}>
                    <strong>Final Invoice Total:</strong>
                    <strong className="amount-highlight font-mono" style={{ fontSize: 18 }}>₹{Number(selectedInvoice.total || 0).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                onClick={() => {
                  navigate(`/admin/invoices/${selectedInvoice.id || selectedInvoice.invoiceNumber}`);
                  setSelectedInvoice(null);
                }}
              >
                <ExternalLink size={13} /> Full Invoice Page
              </button>

              <button
                className="btn-luxury-cancel"
                onClick={() => previewOrderInvoicePdf(selectedInvoice.orderId)}
              >
                <Printer size={13} /> Inline PDF Preview
              </button>

              <button
                className="btn-luxury-cancel"
                onClick={() => downloadOrderInvoicePdf(selectedInvoice.orderId)}
              >
                <Download size={13} /> Download PDF
              </button>

              <button className="btn-luxury-submit" onClick={() => window.print()}>
                <Printer size={14} /> Print Tax Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

