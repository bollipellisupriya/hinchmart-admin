import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Check,
  X,
  Eye,
  Clock,
  Package,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Store,
  Tag,
  ShieldCheck,
  Building2,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  getPendingProducts,
  approveProduct,
  rejectProduct,
} from "../api/productApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/products.css";
import "../styles/pages.css";

export default function ProductApprovals() {
  const navigate = useNavigate();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Dynamic View & Review Popup Modal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Confirmation & Action Modals
  const [approveConfirmProduct, setApproveConfirmProduct] = useState(null);
  const [rejectModalProduct, setRejectModalProduct] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadPending = async () => {
    try {
      setLoading(true);
      setError("");
      const list = await getPendingProducts();
      setProducts(list || []);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to access product approvals.");
      } else {
        setError("Unable to load pending products.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "products") {
        loadPending();
      }
    });
    return unsub;
  }, []);

  const handleConfirmApprove = async (productToApprove = approveConfirmProduct) => {
    if (!productToApprove) return;
    const id = productToApprove.id || productToApprove._id;
    try {
      setActionLoading(true);
      await approveProduct(id);
      toast.success(`Product "${productToApprove.name || "Item"}" approved successfully!`);
      setApproveConfirmProduct(null);
      setSelectedProduct(null);
      await loadPending();
    } catch (err) {
      const msg =
        err?.response?.status === 403
          ? "You do not have permission to approve products."
          : err?.response?.data?.message || "Product approval failed.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async (productToReject = rejectModalProduct) => {
    if (!productToReject) return;
    const id = productToReject.id || productToReject._id;
    try {
      setActionLoading(true);
      await rejectProduct(id, rejectReason);
      toast.warning(`Product "${productToReject.name || "Item"}" was rejected.`);
      setRejectModalProduct(null);
      setSelectedProduct(null);
      await loadPending();
    } catch (err) {
      const msg =
        err?.response?.status === 403
          ? "You do not have permission to reject products."
          : err?.response?.data?.message || "Product rejection failed.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const text = `${p.name || ""} ${p.sku || ""} ${p.brand || ""} ${p.seller?.name || p.sellerName || ""} ${p.category?.name || p.category || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="product-approvals-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Product Approvals</h1>
          <p>Review supplier submissions, verify product details & approve items for the B2B marketplace</p>
        </div>

        <div className="header-stats">
          <span className="header-stat pending">
            <Clock size={15} />
            <strong>{products.length}</strong> Pending Approval
          </span>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={loadPending}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="content-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Search by product name, SKU, seller, category..."
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

        {/* Table Content */}
        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading pending products from backend...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>MOQ</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-table">
                      <div className="empty-table-content">
                        <CheckCircle2 size={42} style={{ color: "#10b981" }} />
                        <h3>No pending products for approval.</h3>
                        <p>{search ? `No results matching "${search}"` : "All supplier catalog submissions have been reviewed."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const id = product.id || product._id;
                    const price = Number(product.price ?? product.sellingPrice ?? product.basePrice ?? 0);
                    const sellerName = product.seller?.name || product.sellerName || "Direct Supplier";
                    const categoryName = product.category?.name || product.category || "General";
                    const submitted = product.submittedAt || (product.createdAt ? new Date(product.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "Today");

                    return (
                      <tr key={id}>
                        <td>
                          <div className="user-cell">
                            {product.image || (product.images && product.images[0]) ? (
                              <img
                                src={product.image || product.images[0]}
                                alt={product.name}
                                className="product-thumb"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop&q=60";
                                }}
                              />
                            ) : (
                              <div className="user-avatar product-avatar">
                                <Package size={18} />
                              </div>
                            )}
                            <div className="user-info-text">
                              <strong className="user-primary-name">{product.name || "Untitled Product"}</strong>
                              {product.brand && (
                                <span className="owner-subtext">Brand: {product.brand}</span>
                              )}
                              {product.sku && (
                                <span className="sku-tag font-mono">SKU: {product.sku}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="seller-subtext">
                            <Store size={13} />
                            <strong>{sellerName}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="category-pill-tag">
                            {categoryName}
                          </span>
                        </td>
                        <td>
                          <strong className="amount-cell font-mono">
                            ₹{price.toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <span>{product.moq || "1 Unit"}</span>
                        </td>
                        <td className="date-cell">
                          <span className="submitted-badge">{submitted}</span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: "flex-end" }}>
                            <button
                              className="btn-table-action view"
                              title="Dynamic Popup Inspection"
                              onClick={() => {
                                setSelectedProduct(product);
                                setActiveImageIdx(0);
                              }}
                            >
                              <Eye size={14} /> VIEW
                            </button>

                            <button
                              className="btn-table-action approve"
                              title="Approve Product"
                              onClick={() => setApproveConfirmProduct(product)}
                            >
                              <Check size={14} /> APPROVE
                            </button>

                            <button
                              className="btn-table-action reject"
                              title="Reject Product"
                              onClick={() => {
                                setRejectModalProduct(product);
                                setRejectReason("Incomplete product specifications or missing documentation.");
                              }}
                            >
                              <X size={14} /> REJECT
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
          DYNAMIC POPUP MODAL: PRODUCT VERIFICATION & APPROVAL SCREEN
          ========================================================================= */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 780 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  <Package size={20} style={{ color: "#111827" }} />
                </div>
                <div className="header-texts">
                  <h2>{selectedProduct.name}</h2>
                  <p>
                    Submitted by <strong>{selectedProduct.seller?.name || selectedProduct.sellerName || "Merchant"}</strong> &nbsp;•&nbsp; SKU: <span className="font-mono" style={{ color: "#fbbf24" }}>{selectedProduct.sku || "—"}</span>
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="status-badge-glow status-pending">
                  <span className="status-dot"></span> Pending Approval
                </span>
                <button className="header-close-btn" onClick={() => setSelectedProduct(null)}>×</button>
              </div>
            </div>

            <div className="luxury-modal-body">
              {/* Product Gallery & Hero Section */}
              <div className="form-section-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex" }}>
                  <div style={{ width: 170, height: 170, background: "#0f172a", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img
                      src={
                        selectedProduct.images && selectedProduct.images[activeImageIdx]
                          ? selectedProduct.images[activeImageIdx]
                          : selectedProduct.image || "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80"
                      }
                      alt={selectedProduct.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>

                  <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Wholesale Unit Selling Price</span>
                      <strong className="font-mono" style={{ display: "block", fontSize: 26, color: "#0f172a", lineHeight: 1.1 }}>
                        ₹{Number(selectedProduct.price ?? selectedProduct.sellingPrice ?? 0).toLocaleString("en-IN")}
                      </strong>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>MOQ</span>
                        <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedProduct.moq || "1 Ton"}</strong>
                      </div>
                      <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Stock</span>
                        <strong style={{ display: "block", fontSize: 13, color: "#059669" }}>{selectedProduct.stock || "25 Tons"}</strong>
                      </div>
                      <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>GST Rate</span>
                        <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedProduct.gst || "18%"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <FileText size={13} /> Specifications & Compliance
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Brand / Manufacturer</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {selectedProduct.brand || "Standard B2B Grade"}
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>HSN Code</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                      {selectedProduct.hsn || "7214"}
                    </div>
                  </div>

                  <div className="input-field-wrap full-width">
                    <label>Category Taxonomy</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f172a" }}>
                      {selectedProduct.category?.name || selectedProduct.category || "Industrial Supplies"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Package size={13} /> Technical Description & Overview
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", margin: 0 }}>
                  {selectedProduct.description || "Industrial-grade structural material manufactured to standard compliance tolerances. Certified for commercial and construction application."}
                </p>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                onClick={() => {
                  setRejectModalProduct(selectedProduct);
                  setRejectReason("Incomplete specifications or missing compliance paperwork.");
                }}
              >
                <X size={13} /> Reject Submission
              </button>

              <div className="footer-action-buttons">
                <button className="btn-luxury-cancel" onClick={() => setSelectedProduct(null)}>
                  Close
                </button>
                <button
                  className="btn-luxury-submit"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 14px rgba(16,185,129,0.35)", color: "#ffffff" }}
                  onClick={() => handleConfirmApprove(selectedProduct)}
                  disabled={actionLoading}
                >
                  <Check size={14} /> Approve Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Approval */}
      {approveConfirmProduct && (
        <div className="modal-overlay" onClick={() => setApproveConfirmProduct(null)}>
          <div className="product-form-modal-luxury modal-animated" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #065f46, #047857)" }}>
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "rgba(16,185,129,0.3)", border: "1px solid rgba(16,185,129,0.5)" }}>
                  <Check size={20} style={{ color: "#a7f3d0" }} />
                </div>
                <div className="header-texts">
                  <h2>Confirm Product Approval</h2>
                  <p>Publish SKU to live catalog</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setApproveConfirmProduct(null)}>×</button>
            </div>
            <div className="luxury-modal-body">
              <div className="form-section-card">
                <p style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5, margin: 0 }}>
                  Are you sure you want to approve <strong>"{approveConfirmProduct.name}"</strong>?
                </p>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, marginBottom: 0 }}>
                  The product will immediately be published and made visible to buyers on the HinchMart B2B marketplace.
                </p>
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                onClick={() => setApproveConfirmProduct(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn-luxury-submit"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "#ffffff" }}
                onClick={() => handleConfirmApprove()}
                disabled={actionLoading}
              >
                {actionLoading ? "Approving..." : "Confirm & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal with Reason */}
      {rejectModalProduct && (
        <div className="modal-overlay" onClick={() => setRejectModalProduct(null)}>
          <div className="product-form-modal-luxury modal-animated" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)" }}>
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "rgba(239,68,68,0.3)", border: "1px solid rgba(239,68,68,0.5)" }}>
                  <X size={20} style={{ color: "#fca5a5" }} />
                </div>
                <div className="header-texts">
                  <h2>Reject Product Submission</h2>
                  <p>Declining: <strong>{rejectModalProduct.name}</strong></p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setRejectModalProduct(null)}>×</button>
            </div>
            <div className="luxury-modal-body">
              <div className="form-section-card">
                <div className="input-field-wrap">
                  <label>Reason for Rejection / Feedback for Seller</label>
                  <textarea
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason or required modifications..."
                  />
                </div>
              </div>
            </div>
            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                onClick={() => setRejectModalProduct(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn-luxury-submit"
                style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "#ffffff" }}
                onClick={() => handleConfirmReject()}
                disabled={actionLoading}
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
