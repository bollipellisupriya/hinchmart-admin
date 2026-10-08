import { useEffect, useState } from "react";
import { Tag, Image as ImageIcon, ShieldCheck, Upload, Loader2, Check } from "lucide-react";
import "../styles/products.css";

import { validateImageFile } from "../utils/imageValidation";
import { compressImage } from "../utils/imageStore";
import { uploadCategoryImage } from "../api/imageApi";

const EMPTY_CATEGORY_FORM = {
  name: "",
  slug: "",
  description: "",
  sortOrder: 0,
  imageURL: "",
  imageUrl: "",
  image: null,
  active: true,
};

const slugify = (text) =>
  (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function CategoryModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData = null,
  loading = false 
}) {
  const [form, setForm] = useState(initialData || EMPTY_CATEGORY_FORM);
  const [imageError, setImageError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const initialName = initialData?.name || "";
    const existingImg = initialData?.imageURL || initialData?.imageUrl || initialData?.image || "";
    setForm({
      ...EMPTY_CATEGORY_FORM,
      ...initialData,
      imageURL: existingImg,
      imageUrl: existingImg,
      image: existingImg,
      slug: initialData?.slug || (initialName ? slugify(initialName) : ""),
    });
    setImageError("");
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setForm((prev) => {
      const prevAutoSlug = slugify(prev.name || "");
      const shouldAutoUpdateSlug = !prev.slug || prev.slug === prevAutoSlug;
      return {
        ...prev,
        name: newName,
        slug: shouldAutoUpdateSlug ? slugify(newName) : prev.slug,
      };
    });
  };

  const [imageUploadStatus, setImageUploadStatus] = useState("idle");

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = await validateImageFile(file);
    if (error) {
      setImageError(error);
      setImageUploadStatus("idle");
      e.target.value = "";
      return;
    }
    setImageError("");
    setUploadingImage(true);
    setImageUploadStatus("idle");

    try {
      // 1. Immediately compress locally and display (takes <50ms)
      const compressed = await compressImage(file, 600, 0.82);
      setForm((prev) => ({
        ...prev,
        image: compressed,
        imageUrl: compressed,
        imageURL: compressed,
      }));

      // 2. Upload directly to S3 backend endpoint (fast fail if offline)
      const uploadedUrl = await uploadCategoryImage(file);
      if (uploadedUrl) {
        setForm((prev) => ({
          ...prev,
          imageURL: uploadedUrl,
          image: uploadedUrl,
          imageUrl: uploadedUrl,
        }));
        setImageUploadStatus("s3");
        setImageError("");
      }
    } catch (err) {
      console.warn("Category image upload to S3 notice (using local artwork):", err?.message || err);
      setImageUploadStatus("local");
      // Do not show alarming error since artwork is safely stored locally and ready to save
      setImageError("");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (uploadingImage) return;
    const finalSlug = form.slug?.trim() || slugify(form.name);
    const finalImage = form.imageURL || form.imageUrl || form.image || "";
    onSubmit({ ...form, slug: finalSlug, imageURL: finalImage, imageUrl: finalImage, image: finalImage });
  };


  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="product-form-modal-luxury modal-animated"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Luxury Header */}
        <div className="luxury-modal-header">
          <div className="header-title-wrap">
            <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              <Tag size={20} style={{ color: "#111827" }} />
            </div>
            <div className="header-texts">
              <h2>{initialData ? "Edit Category Classification" : "Create New Catalog Category"}</h2>
              <p>{initialData ? `Updating ${initialData.name}` : "Add a category taxonomy to classify B2B industrial products"}</p>
            </div>
          </div>
          <button className="header-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="luxury-modal-body">
            {/* Identity Card */}
            <div className="form-section-card">
              <div className="section-card-title">
                <Tag size={13} /> Category Identity & Hierarchy
              </div>
              <div className="luxury-form-grid">
                <div className="input-field-wrap full-width">
                  <label>Category Title <span className="required-star">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleNameChange}
                    placeholder="e.g. Industrial Machinery & Parts"
                    required
                  />
                </div>

                <div className="input-field-wrap">
                  <label>URL Slug <span className="required-star">*</span></label>
                  <input
                    type="text"
                    name="slug"
                    value={form.slug || ""}
                    onChange={handleChange}
                    placeholder="e.g. industrial-machinery"
                    required
                  />
                  <small className="field-hint">Auto-generated from title, customizable SEO slug</small>
                </div>

                <div className="input-field-wrap">
                  <label>Display Sort Order</label>
                  <input
                    type="number"
                    name="sortOrder"
                    value={form.sortOrder || 0}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                  />
                  <small className="field-hint">Lower numbers display first (e.g. 0, 1, 2)</small>
                </div>

                <div className="input-field-wrap full-width">
                  <label>Category Description</label>
                  <textarea
                    name="description"
                    value={form.description || ""}
                    onChange={handleChange}
                    placeholder="Provide a comprehensive summary of product types categorized under this taxonomy group..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Media & Artwork */}
            <div className="form-section-card">
              <div className="section-card-title">
                <ImageIcon size={13} /> Visual Representation & Iconography
              </div>
              <div className="image-upload-flex">
                <div className="image-preview-large">
                  {form.image || form.imageUrl ? (
                    <img src={form.image || form.imageUrl} alt="Preview" />
                  ) : (
                    <div className="image-empty-placeholder">
                      <ImageIcon size={32} />
                      <span>No Artwork Attached</span>
                    </div>
                  )}
                </div>
                <div className="image-controls-right">
                  <p className="image-guideline-text">
                    Attach category artwork. Any resolution or format is supported.
                  </p>
                  <label className={`upload-file-btn ${uploadingImage ? "disabled" : ""}`} style={{ pointerEvents: uploadingImage ? "none" : "auto" }}>
                    {uploadingImage ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Uploading image...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>{form.image || form.imageUrl ? "Change Category Artwork" : "Choose Category Artwork"}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={uploadingImage}
                      style={{ display: "none" }}
                    />
                  </label>
                  {imageError ? (
                    <span className="image-validation-error">
                      {imageError}
                    </span>
                  ) : (form.image || form.imageUrl) && !uploadingImage ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        color: "#059669",
                        background: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        marginTop: "4px",
                      }}
                    >
                      <Check size={12} />
                      {imageUploadStatus === "s3" ? "Uploaded to Cloud (S3)" : "Artwork attached & ready to save"}
                    </span>
                  ) : null}
                  {(form.image || form.imageUrl) && !uploadingImage && (
                    <button
                      type="button"
                      className="btn-remove-image"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, image: null, imageUrl: "", imageURL: "" }));
                        setImageUploadStatus("idle");
                        setImageError("");
                      }}
                    >
                      Remove Artwork
                    </button>
                  )}


                </div>
              </div>
            </div>

            {/* Catalog Activation */}
            <div className="form-section-card">
              <div className="section-card-title">
                <ShieldCheck size={13} /> Marketplace Catalog Visibility
              </div>
              <label className="luxury-checkbox-item">
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active ?? true}
                  onChange={handleChange}
                />
                <div className="checkbox-text-info">
                  <strong>Active in Marketplace Taxonomy</strong>
                  <span>When enabled, this category will be publicly accessible to buyers for product browsing and search filters.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Luxury Footer */}
          <div className="luxury-modal-footer">
            <button type="button" className="btn-luxury-cancel" onClick={onClose} disabled={loading || uploadingImage}>
              Cancel
            </button>
            <button type="submit" className="btn-luxury-submit" disabled={loading || uploadingImage}>
              {uploadingImage ? "Uploading Artwork..." : loading ? "Saving Category..." : initialData ? "Save Category Changes" : "Create Marketplace Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
