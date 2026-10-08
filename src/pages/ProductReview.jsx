import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Tag,
  Package,
  Layers,
  FileText,
  IndianRupee,
  Store,
  Clock,
  Check,
  X,
  HelpCircle,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import {
  getProductById,
  approveProduct,
  rejectProduct,
} from "../api/productApi";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";

export default function ProductReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Modals / Confirmation
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getProductById(id);
      if (!data) {
        setError("Product not found or unavailable.");
      } else {
        setProduct(data);
      }
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to perform this action.");
      } else if (err?.response?.status === 404) {
        setError("Product not found (404).");
      } else {
        setError(err?.response?.data?.message || "Unable to load product details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadProduct();
  }, [id]);

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await approveProduct(id);
      toast.success(`Product "${product.name || "Item"}" approved successfully!`);
      setShowApproveConfirm(false);
      navigate("/admin/product-approvals");
    } catch (err) {
      const msg =
        err?.response?.status === 403
          ? "You do not have permission to approve this product."
          : err?.response?.data?.message || "Product approval failed.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      await rejectProduct(id, rejectReason);
      toast.warning(`Product "${product.name || "Item"}" was rejected.`);
      setShowRejectModal(false);
      navigate("/admin/product-approvals");
    } catch (err) {
      const msg =
        err?.response?.status === 403
          ? "You do not have permission to reject this product."
          : err?.response?.data?.message || "Product rejection failed.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Image Gallery helpers
  const images = Array.isArray(product?.images) && product.images.length > 0
    ? product.images
    : product?.image
    ? [product.image]
    : [];

  const mainImage = images[selectedImageIndex] || images[0] || null;

  if (loading) {
    return (
      <div className="loading-state-container">
        <div className="spinner"></div>
        <p>Loading product review data from backend...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="content-card" style={{ padding: 40, textAlign: "center" }}>
        <AlertCircle size={48} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>{error || "Product Not Found"}</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          The product ID could not be loaded from the backend.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn-secondary" onClick={() => navigate("/admin/product-approvals")}>
            <ArrowLeft size={16} /> Back to Approvals
          </button>
          <button className="primary-button" onClick={loadProduct}>
            <RotateCcw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const isPending = (product.approvalStatus || product.status || "").toUpperCase() === "PENDING";

  return (
    <div className="product-review-container">
      {/* Top Navigation Bar */}
      <div className="review-top-bar">
        <button
          className="btn-back"
          onClick={() => navigate("/admin/product-approvals")}
        >
          <ArrowLeft size={17} /> Back to Product Approvals
        </button>

        <div className="review-header-badge">
          <span className={`status-badge-glow status-${(product.approvalStatus || product.status || "PENDING").toLowerCase()}`}>
            <span className="status-dot"></span>
            Status: {product.approvalStatus || product.status || "PENDING"}
          </span>
        </div>
      </div>

      <div className="review-main-grid">
        {/* Left Column: Image Gallery */}
        <div className="review-gallery-card content-card">
          <div className="main-image-viewport">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name || "Product"}
                className="main-image-display"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=60";
                }}
              />
            ) : (
              <div className="no-image-placeholder">
                <ImageIcon size={48} />
                <span>No images provided by seller</span>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="thumbnail-strip">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`thumb-item ${selectedImageIndex === idx ? "active" : ""}`}
                  onClick={() => setSelectedImageIndex(idx)}
                >
                  <img
                    src={img}
                    alt={`Thumb ${idx + 1}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop&q=60";
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Complete Product & Pricing Review Fields */}
        <div className="review-details-card content-card">
          <div className="review-title-section">
            <span className="category-pill-tag">
              <Tag size={12} /> {product.category?.name || product.category || "General Category"}
            </span>
            <h1 className="review-product-title">{product.name || "Unnamed Product"}</h1>
            {product.brand && (
              <span className="brand-label">Brand: <strong>{product.brand}</strong></span>
            )}
          </div>

          {/* Supplier Section */}
          <div className="review-supplier-banner">
            <Store size={20} className="supplier-icon" />
            <div className="supplier-info-text">
              <span className="sub-label">Supplying Merchant / Seller</span>
              <strong>{product.seller?.name || product.sellerName || "Direct Supplier"}</strong>
              {product.seller?.company && <small>{product.seller.company}</small>}
            </div>
          </div>

          {/* Specifications Grid */}
          <div className="specs-card-grid">
            <div className="spec-card-item">
              <span className="spec-label">SKU Code</span>
              <span className="spec-value font-mono">{product.sku || "—"}</span>
            </div>

            <div className="spec-card-item">
              <span className="spec-label">HSN Code</span>
              <span className="spec-value font-mono">{product.hsn || "7214"}</span>
            </div>

            <div className="spec-card-item">
              <span className="spec-label">Applicable GST</span>
              <span className="spec-value">{product.gst || "18%"}</span>
            </div>

            <div className="spec-card-item">
              <span className="spec-label">MRP (Max Retail Price)</span>
              <span className="spec-value text-muted" style={{ textDecoration: "line-through" }}>
                ₹{Number(product.mrp || product.price || 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="spec-card-item highlight-selling">
              <span className="spec-label">Wholesale Selling Price</span>
              <span className="spec-value selling-price-val">
                ₹{Number(product.sellingPrice ?? product.price ?? product.basePrice ?? 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="spec-card-item">
              <span className="spec-label">Minimum Order Quantity (MOQ)</span>
              <span className="spec-value">{product.moq || "1 Unit"}</span>
            </div>

            <div className="spec-card-item">
              <span className="spec-label">Available Inventory / Stock</span>
              <span className="spec-value">{product.stock ?? product.inventory ?? "0"}</span>
            </div>

            <div className="spec-card-item">
              <span className="spec-label">Submission Date</span>
              <span className="spec-value">
                {product.submittedAt || (product.createdAt ? new Date(product.createdAt).toLocaleDateString("en-IN") : "Today")}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="review-description-section">
            <h4>Description & Specifications</h4>
            <p>{product.description || "No detailed technical description supplied."}</p>
          </div>

          {/* Review Action Buttons */}
          <div className="review-actions-footer">
            <button
              className="btn-action-reject-large"
              onClick={() => setShowRejectModal(true)}
              disabled={!isPending || actionLoading}
            >
              <X size={17} /> REJECT
            </button>

            <button
              className="btn-action-request-changes"
              title="Request changes from seller"
              onClick={() => toast.info("Change request notes can be included in the Rejection feedback.")}
            >
              <HelpCircle size={17} /> REQUEST CHANGES
            </button>

            <button
              className="btn-action-approve-large"
              onClick={() => setShowApproveConfirm(true)}
              disabled={!isPending || actionLoading}
            >
              <Check size={17} /> APPROVE PRODUCT
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Approval */}
      {showApproveConfirm && (
        <div className="modal-overlay" onClick={() => setShowApproveConfirm(false)}>
          <div className="modal-content modal-animated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Product Approval</h2>
              <button className="close-btn" onClick={() => setShowApproveConfirm(false)}>×</button>
            </div>
            <div className="modal-form" style={{ padding: "20px 24px" }}>
              <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.5 }}>
                Are you sure you want to approve <strong>"{product.name}"</strong>?
              </p>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
                Once approved, this SKU will become live on the B2B catalog and available for wholesale buyers to purchase.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowApproveConfirm(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn-submit"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? "Approving..." : "Confirm & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal with Reason */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content modal-animated" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reject Product Submission</h2>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-form" style={{ padding: "20px 24px" }}>
              <p className="text-muted" style={{ marginBottom: 12 }}>
                Rejecting: <strong>{product.name}</strong>
              </p>
              <div className="form-group">
                <label>Reason for Rejection / Feedback for Seller</label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why the product was rejected or what changes are required..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn-submit danger-btn"
                onClick={handleReject}
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
