import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Building2,
  Store,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  Lock,
} from "lucide-react";
import { getInvoiceById } from "../api/invoiceApi";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";

export default function InvoiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getInvoiceById(id);
      if (!data) {
        setError("Invoice not found.");
      } else {
        setInvoice(data);
      }
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to view this invoice.");
      } else {
        setError("Unable to load invoice details from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="loading-state-container">
        <div className="spinner"></div>
        <p>Loading tax invoice from backend...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="content-card" style={{ padding: 40, textAlign: "center" }}>
        <AlertCircle size={48} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>{error || "Invoice Not Found"}</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          The requested invoice record could not be loaded from the backend.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn-secondary" onClick={() => navigate("/admin/invoices")}>
            <ArrowLeft size={16} /> Back to Invoices
          </button>
          <button className="primary-button" onClick={loadInvoice}>
            <RotateCcw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const status = (invoice.status || "Generated").toUpperCase();

  return (
    <div className="invoice-details-container">
      {/* Top Bar */}
      <div className="review-top-bar">
        <button className="btn-back" onClick={() => navigate("/admin/invoices")}>
          <ArrowLeft size={17} /> Back to Invoices
        </button>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print Tax Invoice
          </button>
          <span className={`status-badge-glow ${status === "PAID" ? "status-delivered" : "status-pending"}`}>
            <span className="status-dot"></span>
            Invoice Status: {invoice.status || "Generated"}
          </span>
        </div>
      </div>

      {/* Invoice Banner */}
      <div className="content-card order-summary-banner">
        <div className="order-summary-header-left">
          <div className="order-number-title">
            <FileText size={22} className="text-amber" />
            <h2>Tax Invoice {invoice.invoiceNumber || invoice.id}</h2>
          </div>
          <div className="order-meta-row">
            <span>Invoice Date: <strong>{invoice.date || (invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-IN") : "Today")}</strong></span>
            <span>•</span>
            <span className="price-protection-tag">
              <Lock size={12} /> Statutory GST Record
            </span>
          </div>
        </div>

        <div className="order-summary-header-right">
          <span className="total-amount-label">Total Invoice Value (INR)</span>
          <strong className="total-amount-display font-mono">
            ₹{Number(invoice.total || 0).toLocaleString("en-IN")}
          </strong>
        </div>
      </div>

      {/* Linked Order Ref */}
      <div className="content-card order-party-card" style={{ background: "#fffdf8", borderColor: "#fde68a" }}>
        <div className="card-section-title">
          <ShoppingBag size={18} className="text-amber" />
          <h3>Associated Wholesale Order</h3>
        </div>

        <div className="party-details-body">
          <div className="party-row">
            <span className="party-label">Order Number Reference</span>
            <strong className="party-val font-mono" style={{ color: "#2563eb", fontSize: 15 }}>
              {invoice.orderNumber}
            </strong>
          </div>
          <div className="party-row">
            <span className="party-label">Trace Order Action</span>
            <button
              className="btn-secondary"
              onClick={() => navigate(`/admin/orders/${invoice.orderId || invoice.orderNumber}`)}
              style={{ padding: "6px 14px", fontSize: 12.5 }}
            >
              <ExternalLink size={14} /> View Order & Line Items
            </button>
          </div>
        </div>
      </div>

      {/* Buyer & Seller GST Dossiers */}
      <div className="order-info-two-col">
        {/* Buyer (Billed To) */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <Building2 size={18} />
            <h3>Billed To (Buyer)</h3>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Legal Entity</span>
              <strong className="party-val">{invoice.buyer?.company || invoice.buyer?.name || invoice.buyerName}</strong>
            </div>
            <div className="party-row">
              <span className="party-label">Buyer GSTIN</span>
              <span className="party-val font-mono">{invoice.buyer?.gstin || "24AAACA9876E1Z1"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Billing Address</span>
              <span className="party-val">{invoice.buyer?.address || "Registered Business Address"}</span>
            </div>
          </div>
        </div>

        {/* Seller (Billed From) */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <Store size={18} />
            <h3>Billed From (Supplying Merchant)</h3>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Merchant Name</span>
              <strong className="party-val">{invoice.seller?.company || invoice.seller?.name || invoice.sellerName}</strong>
            </div>
            <div className="party-row">
              <span className="party-label">Seller GSTIN</span>
              <span className="party-val font-mono">{invoice.seller?.gstin || invoice.seller?.gst || "27AABCA1234F1Z8"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Facility Address</span>
              <span className="party-val">{invoice.seller?.address || "MIDC Industrial Estate Facility"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GST & Financial Summary */}
      <div className="content-card order-party-card">
        <div className="card-section-title">
          <FileText size={18} />
          <h3>Taxable Value & Statutory GST Breakdown</h3>
        </div>

        <div className="party-details-body">
          <div className="party-row">
            <span className="party-label">Taxable Goods Value</span>
            <span className="party-val font-mono">₹{Number(invoice.taxableAmount || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="party-row">
            <span className="party-label">Applicable GST Rate</span>
            <span className="party-val">{invoice.gstRate || "18%"}</span>
          </div>
          {invoice.cgst !== undefined && invoice.cgst > 0 && (
            <div className="party-row">
              <span className="party-label">CGST (9%)</span>
              <span className="party-val font-mono">₹{Number(invoice.cgst).toLocaleString("en-IN")}</span>
            </div>
          )}
          {invoice.sgst !== undefined && invoice.sgst > 0 && (
            <div className="party-row">
              <span className="party-label">SGST (9%)</span>
              <span className="party-val font-mono">₹{Number(invoice.sgst).toLocaleString("en-IN")}</span>
            </div>
          )}
          {invoice.igst !== undefined && invoice.igst > 0 && (
            <div className="party-row">
              <span className="party-label">IGST (Integrated Tax 18%)</span>
              <span className="party-val font-mono">₹{Number(invoice.igst).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="party-row">
            <span className="party-label">Total GST Component</span>
            <strong className="party-val font-mono" style={{ color: "#d97706" }}>₹{Number(invoice.gst || 0).toLocaleString("en-IN")}</strong>
          </div>
          <div className="dropdown-divider" style={{ margin: "10px 0" }}></div>
          <div className="party-row" style={{ fontSize: 16 }}>
            <strong style={{ color: "#0f172a" }}>Final Total Invoice Value</strong>
            <strong className="amount-highlight font-mono">₹{Number(invoice.total || 0).toLocaleString("en-IN")}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
