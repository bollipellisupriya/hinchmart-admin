import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  ImagePlus,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Link as LinkIcon,
  Sparkles,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video,
  Film,
  Play,
  CheckCircle,
  Tag,
} from "lucide-react";
import {
  createBanner,
  deleteBanner,
  getBanners,
  toggleBannerActive,
  updateBanner,
  getStoredBanners,
  uploadBannerVideo,
  POSITION_MAP,
} from "../api/bannerApi";
import { useToast } from "../components/ToastContext";
import { subscribeDataUpdate } from "../api/dataStore";
import { validateImageFile } from "../utils/imageValidation";
import { uploadBannerImage } from "../api/imageApi";
import "../styles/banners.css";

const BANNER_PRESETS = [
  {
    name: "Polymak Power Tools & Industrial Deals",
    url: "https://cdn.moglix.com/cms/flyout/Image_2026-09-07_16:25:08.224_LOPrimarydesktop.png",
    category: "equipment-scaffolding-tools",
  },
  {
    name: "Civil & Structural Steel",
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format&fit=crop&q=80",
    category: "civil-structural",
  },
  {
    name: "Electrical & Industrial Switchgear",
    url: "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=1200&auto=format&fit=crop&q=80",
    category: "electrical-power",
  },
  {
    name: "Plumbing & Piping Infrastructure",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&auto=format&fit=crop&q=80",
    category: "plumbing-piping",
  },
  {
    name: "Heavy Machinery & Scaffolding",
    url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&auto=format&fit=crop&q=80",
    category: "equipment-scaffolding-tools",
  },
];

const EMPTY_BANNER = {
  title: "",
  subtitle: "",
  badge: "24-HOUR DISPATCH",
  ctaText: "Explore 24H Catalog",
  position: "HOME_HERO",
  mediaType: "IMAGE",
  linkType: "SCREEN",
  linkValue: "TwentyFourHourDelivery",
  imageUrl: "",
  image: "",
  posterUrl: "",
  videoUrl: "",
  active: true,
  sortOrder: 1,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: `${new Date().getFullYear() + 1}-12-31`,
};

const getBannerList = (data) => (Array.isArray(data) ? data : data?.banners || data?.data || []);

export default function Banners() {
  const toast = useToast();
  const [banners, setBanners] = useState(() => getStoredBanners());
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState("video");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_BANNER);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [error, setError] = useState("");

  const loadBanners = async () => {
    try {
      setError("");
      const res = await getBanners();
      setBanners(getBannerList(res));
    } catch (requestError) {
      console.warn("Unable to load banners from the API.", requestError);
      setError("Banners could not be loaded. Please check the API connection and try again.");
    }
  };

  useEffect(() => {
    loadBanners();
    const unsubscribe = subscribeDataUpdate((event) => {
      if (event.entity === "banners") {
        loadBanners();
      }
    });
    return () => unsubscribe();
  }, []);

  const openEditor = (banner = null) => {
    setEditing(banner);
    setVideoFile(null);
    if (banner) {
      const bannerImg = banner.imageUrl || banner.imageURL || banner.image || banner.posterUrl || BANNER_PRESETS[0].url;
      const hasVid = Boolean(banner.videoUrl && banner.videoUrl.trim());
      setForm({
        ...EMPTY_BANNER,
        ...banner,
        imageUrl: bannerImg,
        image: bannerImg,
        posterUrl: banner.posterUrl || bannerImg,
        videoUrl: banner.videoUrl || "",
        mediaType: hasVid ? "VIDEO" : "IMAGE",
        badge: banner.badge || "",
        ctaText: banner.ctaText || "Explore 24H Catalog",
        linkType: banner.linkType || "SCREEN",
        linkValue: banner.linkValue || banner.link || "TwentyFourHourDelivery",
        position: banner.position || (hasVid ? "HOME_VIDEO" : "HOME_HERO"),
      });
    } else {
      setForm({
        ...EMPTY_BANNER,
        position: "HOME_HERO",
        mediaType: "IMAGE",
        videoUrl: "",
        sortOrder: banners.length + 1,
      });
    }
    setEditorOpen(true);
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const updated = { ...current, [name]: value };
      if (name === "imageUrl") {
        updated.image = value;
        if (!updated.posterUrl) updated.posterUrl = value;
      }
      return updated;
    });
  };

  const handleSelectPreset = (preset) => {
    setForm((current) => ({
      ...current,
      imageUrl: preset.url,
      image: preset.url,
      posterUrl: preset.url,
      linkValue: current.linkValue || preset.category,
    }));
  };

  // Image Upload Handler (PNG/JPG)
  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = await validateImageFile(file);
    if (validationError) {
      toast.warning(validationError);
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    try {
      const preview = URL.createObjectURL(file);
      setForm((prev) => ({
        ...prev,
        imageUrl: preview,
        image: preview,
        posterUrl: preview,
      }));

      const uploadedUrl = await uploadBannerImage(file);
      if (uploadedUrl) {
        setForm((prev) => ({
          ...prev,
          imageUrl: uploadedUrl,
          image: uploadedUrl,
          posterUrl: uploadedUrl,
        }));
        toast.success(`Banner poster "${file.name}" uploaded successfully!`);
      } else {
        throw new Error("No image URL returned from S3 endpoint");
      }
    } catch (err) {
      console.warn("Banner image upload failed:", err);
      toast.error("Poster image upload failed. Please try again.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  // Video Upload Handler (MP4/WebM up to 50MB) -> POST /api/banners/{bannerId}/video
  const handleVideoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(mp4|webm)$/i)) {
      toast.warning("Please select a valid MP4 or WebM video file.");
      event.target.value = "";
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.warning("Video size exceeds the maximum limit of 50MB.");
      event.target.value = "";
      return;
    }

    setVideoFile(file);

    const bannerId = editing?.bannerId || editing?.id;
    if (bannerId) {
      // Editing existing banner: Direct live S3 upload
      setUploadingVideo(true);
      try {
        toast.info("Uploading video to S3 storage...");
        const videoUrl = await uploadBannerVideo(bannerId, file);
        if (videoUrl) {
          setForm((prev) => ({
            ...prev,
            videoUrl,
            mediaType: "VIDEO",
            position: prev.position === "HOME_HERO" ? "HOME_VIDEO" : prev.position,
          }));
          toast.success("Video uploaded to S3 successfully!");
        }
      } catch (err) {
        toast.error("Video upload failed: " + (err?.response?.data?.message || err?.message));
      } finally {
        setUploadingVideo(false);
        event.target.value = "";
      }
    } else {
      // New banner creation: store local preview URL, upload to S3 upon banner creation
      const localPreview = URL.createObjectURL(file);
      setForm((prev) => ({
        ...prev,
        videoUrl: localPreview,
        mediaType: "VIDEO",
        position: prev.position === "HOME_HERO" ? "HOME_VIDEO" : prev.position,
        _localPreview: true,
      }));
      toast.info(`Video "${file.name}" selected. It will upload to S3 upon saving.`);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (uploadingImage || uploadingVideo) return;
    if (!form.title?.trim()) {
      toast.error("Please enter a Banner Title.");
      return;
    }

    setSaving(true);
    try {
      const cleanFormData = {
        ...form,
        videoUrl: form.mediaType === "IMAGE" ? "" : (form.videoUrl || ""),
      };

      let savedBanner;
      if (editing) {
        const id = editing.bannerId || editing.id || editing._id;
        savedBanner = await updateBanner(id, cleanFormData);
        toast.success("Banner updated successfully!");
      } else {
        // Create new banner
        savedBanner = await createBanner(cleanFormData);
        const bannerId = savedBanner.bannerId || savedBanner.id;

        // If a video file was selected during creation, upload it to S3 immediately
        if (videoFile && bannerId && form.mediaType === "VIDEO") {
          try {
            toast.info("Uploading video to S3 storage...");
            const uploadedVideoUrl = await uploadBannerVideo(bannerId, videoFile);
            if (uploadedVideoUrl) {
              await updateBanner(bannerId, { videoUrl: uploadedVideoUrl });
            }
          } catch (videoErr) {
            console.warn("Video upload error following creation:", videoErr);
            toast.warning("Banner created, but S3 video upload encountered an issue.");
          }
        }
        toast.success("Banner created successfully!");
      }

      setVideoFile(null);
      setEditorOpen(false);
      await loadBanners();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save banner.";
      toast.error(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (banner) => {
    try {
      const id = banner.bannerId || banner.id || banner._id;
      await toggleBannerActive(id, banner);
      await loadBanners();
      const isNowActive = !(banner.active !== false && banner.isActive !== false && banner.status !== "PAUSED");
      toast.success(`Banner ${isNowActive ? "activated" : "paused"} on live store.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to toggle status.");
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Delete banner "${banner.title}" permanently from database?`)) return;
    try {
      const id = banner.bannerId || banner.id || banner._id;
      await deleteBanner(id);
      await loadBanners();
      toast.info("Banner removed from marketplace database.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete banner.");
    }
  };

  const filteredBanners = useMemo(() => {
    return banners.filter((banner) => {
      const isLive = banner.active !== false && banner.isActive !== false && banner.status !== "PAUSED";
      const statusTag = isLive ? "LIVE" : "PAUSED";
      const matchesFilter = activeFilter === "ALL" || statusTag === activeFilter || banner.status === activeFilter;
      const query = search.toLowerCase();
      return (
        matchesFilter &&
        `${banner.title} ${banner.subtitle || ""} ${banner.badge || ""} ${banner.position || ""}`
          .toLowerCase()
          .includes(query)
      );
    });
  }, [activeFilter, banners, search]);

  const liveCount = banners.filter((b) => b.active !== false && b.isActive !== false && b.status !== "PAUSED").length;

  return (
    <div className="banners-page">
      <div className="page-header banner-page-header">
        <div>
          <span className="banner-eyebrow">
            <Megaphone size={13} /> MERCHANDISING CONTROL
          </span>
          <h1>Banner Studio</h1>
          <p>Manage and broadcast video banners, 24-hour dispatch campaigns, and homepage hero carousels.</p>
        </div>
        <button className="primary-button" onClick={() => openEditor()}>
          <Plus size={18} /> Create Banner
        </button>
      </div>

      <div className="banner-metrics">
        <div>
          <span>Campaigns</span>
          <strong>{banners.length}</strong>
          <small>Database total</small>
        </div>
        <div className="metric-live">
          <span>Live now</span>
          <strong>{liveCount}</strong>
          <small>Visible in buyer app</small>
        </div>
        <div>
          <span>Paused / Scheduled</span>
          <strong>{banners.length - liveCount}</strong>
          <small>Hidden from feed</small>
        </div>
      </div>

      <div className="banner-toolbar">
        <div className="banner-tabs">
          {["ALL", "LIVE", "PAUSED"].map((filter) => (
            <button
              key={filter}
              className={activeFilter === filter ? "selected" : ""}
              onClick={() => setActiveFilter(filter)}
            >
              {filter === "ALL" ? "All campaigns" : filter}
            </button>
          ))}
        </div>
        <label className="banner-search">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search campaigns..."
          />
        </label>
      </div>

      {error && (
        <div className="error-box">
          <span>{error}</span>
          <button onClick={loadBanners}>Retry</button>
        </div>
      )}

      <div className="banner-grid">
        {filteredBanners.map((banner) => {
          const isLive = banner.active !== false && banner.isActive !== false && banner.status !== "PAUSED";
          const bannerImg = banner.imageUrl || banner.posterUrl || banner.image;
          const hasVideo = Boolean(banner.videoUrl && banner.videoUrl.trim());

          return (
            <article className="banner-card" key={banner.bannerId || banner.id || banner._id}>
              <div className="banner-card-image">
                {hasVideo ? (
                  <div className="banner-card-video-container">
                    <video
                      src={banner.videoUrl}
                      muted
                      autoPlay
                      loop
                      playsInline
                      className="banner-card-inline-video"
                    />
                  </div>
                ) : (
                  <div
                    className="banner-card-img-surface"
                    style={{ backgroundImage: `url(${bannerImg})` }}
                  />
                )}

                <span className={`banner-status ${isLive ? "live" : "paused"}`}>{isLive ? "LIVE" : "PAUSED"}</span>

                {banner.badge && <span className="banner-badge-tag">{banner.badge}</span>}

                {hasVideo ? (
                  <span className="banner-video-badge">
                    <Video size={11} /> VIDEO STREAM
                  </span>
                ) : (
                  <span className="banner-image-badge">
                    <ImageIcon size={11} /> IMAGE
                  </span>
                )}

                <button
                  className="preview-button"
                  title={hasVideo ? "Open full video player" : "Preview banner artwork"}
                  onClick={() => {
                    setForm({ ...EMPTY_BANNER, ...banner });
                    setPreviewTab(hasVideo ? "video" : "image");
                    setPreviewOpen(true);
                  }}
                >
                  <Eye size={15} />
                </button>
              </div>

              <div className="banner-card-body">
                <div className="banner-card-heading">
                  <div>
                    <h3>{banner.title}</h3>
                    <span>{banner.position || banner.placement || "HOME_VIDEO"}</span>
                  </div>
                  <button
                    className="toggle-icon"
                    title={isLive ? "Deactivate banner" : "Activate banner"}
                    onClick={() => handleToggle(banner)}
                  >
                    {isLive ? <ToggleRight size={26} color="#17805c" /> : <ToggleLeft size={26} color="#94a3b8" />}
                  </button>
                </div>

                <p>{banner.subtitle || `Link: ${banner.linkType || "SCREEN"} -> ${banner.linkValue || "N/A"}`}</p>

                {banner.ctaText && (
                  <div style={{ marginBottom: "8px" }}>
                    <span className="banner-cta-tag">CTA: {banner.ctaText}</span>
                  </div>
                )}

                <div className="banner-card-footer">
                  <small>
                    {banner.startDate || "Ongoing"}
                    {banner.endDate ? ` - ${banner.endDate}` : ""}
                  </small>
                  <div>
                    <button className="icon-action" title="Edit banner" onClick={() => openEditor(banner)}>
                      <Pencil size={15} />
                    </button>
                    <button className="icon-action danger" title="Delete banner" onClick={() => handleDelete(banner)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {filteredBanners.length === 0 && (
        <div className="banner-empty">
          <ImagePlus size={34} />
          <h3>No campaigns match this view</h3>
          <p>Create a banner to broadcast promotional deals or video banners to all buyers.</p>
          <button className="primary-button" onClick={() => openEditor()}>
            <Plus size={16} /> Create Banner
          </button>
        </div>
      )}

      {/* Banner Creation / Edit Modal */}
      {editorOpen && (
        <div className="modal-overlay" onClick={() => setEditorOpen(false)}>
          <div className="banner-editor" onClick={(event) => event.stopPropagation()}>
            <div className="banner-editor-header">
              <div>
                <span className="banner-eyebrow">{editing ? "REFINE CAMPAIGN" : "NEW LIVE CAMPAIGN"}</span>
                <h2>{editing ? "Edit Banner / Video Campaign" : "Create Banner / Video Campaign"}</h2>
              </div>
              <button onClick={() => setEditorOpen(false)}>
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="banner-editor-layout">
                {/* Form Fields */}
                <div className="banner-form-fields">
                  {/* Campaign Format Selector */}
                  <div className="banner-media-type-toggle">
                    <button
                      type="button"
                      className={`media-type-btn ${form.mediaType === "IMAGE" ? "active" : ""}`}
                      onClick={() => {
                        setVideoFile(null);
                        setForm((prev) => ({
                          ...prev,
                          mediaType: "IMAGE",
                          videoUrl: "",
                          position: prev.position === "HOME_VIDEO" ? "HOME_HERO" : prev.position,
                        }));
                      }}
                    >
                      <ImageIcon size={18} color={form.mediaType === "IMAGE" ? "#d9232d" : "#64748b"} />
                      <div>
                        <strong>Static Image Banner</strong>
                        <small>Standard hero artwork, promotions & spotlights</small>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`media-type-btn ${form.mediaType === "VIDEO" ? "active" : ""}`}
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          mediaType: "VIDEO",
                          position: "HOME_VIDEO",
                        }));
                      }}
                    >
                      <Video size={18} color={form.mediaType === "VIDEO" ? "#d9232d" : "#0284c7"} />
                      <div>
                        <strong>Video Banner Campaign</strong>
                        <small>MP4 / WebM stream + poster thumbnail</small>
                      </div>
                    </button>
                  </div>

                  <label>
                    <span className="field-label-text">
                      Banner Title <span className="required-star">*</span>
                    </span>
                    <input
                      name="title"
                      value={form.title}
                      onChange={updateField}
                      placeholder="e.g. Need Materials Urgently on Site?"
                      required
                    />
                  </label>

                  <label>
                    <span className="field-label-text">Supporting Copy / Subtitle</span>
                    <textarea
                      name="subtitle"
                      value={form.subtitle}
                      onChange={updateField}
                      placeholder="e.g. Order essential building, electrical & plumbing materials before 4 PM..."
                      rows="2"
                    />
                  </label>

                  <div className="form-two-col">
                    <label>
                      <span className="field-label-text">Badge (Pill Label)</span>
                      <input
                        name="badge"
                        value={form.badge || ""}
                        onChange={updateField}
                        placeholder="e.g. 24-HOUR DISPATCH, HOT DEAL"
                      />
                    </label>
                    <label>
                      <span className="field-label-text">CTA Button Text</span>
                      <input
                        name="ctaText"
                        value={form.ctaText || ""}
                        onChange={updateField}
                        placeholder="e.g. Explore 24H Catalog"
                      />
                    </label>
                  </div>

                  <div className="form-two-col">
                    <label>
                      <span className="field-label-text">Placement Position</span>
                      <select name="position" value={form.position || (form.mediaType === "VIDEO" ? "HOME_VIDEO" : "HOME_HERO")} onChange={updateField}>
                        <option value="HOME_HERO">HOME_HERO (Standard Carousel)</option>
                        <option value="HOME_VIDEO">HOME_VIDEO (Video Hero Banner)</option>
                        <option value="HOME_TOP">HOME_TOP (Top Banner)</option>
                        <option value="CATEGORY_SPOTLIGHT">CATEGORY_SPOTLIGHT</option>
                        <option value="DEALS_CAROUSEL">DEALS_CAROUSEL</option>
                        <option value="BUYER_DASHBOARD">BUYER_DASHBOARD</option>
                      </select>
                    </label>
                    <label>
                      <span className="field-label-text">
                        <LinkIcon size={12} /> Target Link Type
                      </span>
                      <select name="linkType" value={form.linkType || "SCREEN"} onChange={updateField}>
                        <option value="SCREEN">SCREEN (App Screen Route)</option>
                        <option value="CATEGORY">CATEGORY (Category Slug)</option>
                        <option value="PRODUCT">PRODUCT (Product ID / SKU)</option>
                        <option value="URL">URL (External Link)</option>
                      </select>
                    </label>
                  </div>

                  <div className="form-two-col">
                    <label>
                      <span className="field-label-text">Link Destination / Value</span>
                      <input
                        name="linkValue"
                        value={form.linkValue || ""}
                        onChange={updateField}
                        placeholder={
                          form.linkType === "SCREEN"
                            ? "e.g. TwentyFourHourDelivery"
                            : form.linkType === "CATEGORY"
                            ? "e.g. civil-structural"
                            : form.linkType === "PRODUCT"
                            ? "e.g. 101"
                            : "https://..."
                        }
                      />
                    </label>
                    <label>
                      <span className="field-label-text">Display Sort Order</span>
                      <input
                        type="number"
                        name="sortOrder"
                        min="1"
                        value={form.sortOrder || 1}
                        onChange={updateField}
                      />
                    </label>
                  </div>

                  <div className="form-two-col">
                    <label>
                      <span className="field-label-text">Status</span>
                      <select
                        name="active"
                        value={form.active ? "true" : "false"}
                        onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.value === "true" }))}
                      >
                        <option value="true">Active (Live in App)</option>
                        <option value="false">Inactive / Paused</option>
                      </select>
                    </label>
                    <label>
                      <span className="field-label-text">Start Date</span>
                      <input type="date" name="startDate" value={form.startDate} onChange={updateField} />
                    </label>
                  </div>

                  <label>
                    <span className="field-label-text">End Date</span>
                    <input type="date" name="endDate" value={form.endDate} onChange={updateField} />
                  </label>

                  {/* S3 Video Upload Section (shown when Video Campaign or when videoUrl is present) */}
                  {form.mediaType === "VIDEO" ? (
                    <div className="video-upload-box">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="field-label-text">
                          <Video size={14} color="#0284c7" />
                          Video Asset (MP4 / WebM, Up to 50MB)
                        </span>
                        <span
                          style={{
                            background: "#e0f2fe",
                            color: "#0369a1",
                            fontSize: "9px",
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          S3 UPLOAD /api/banners/video
                        </span>
                      </div>

                      <div style={{ marginTop: "4px" }}>
                        <label className={`moglix-upload-btn ${uploadingVideo ? "disabled" : ""}`} style={{ background: "#0369a1" }}>
                          {uploadingVideo ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span>Uploading Video to S3...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={15} />
                              <span>Choose Video File (.mp4 / .webm)</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            onChange={handleVideoUpload}
                            disabled={uploadingVideo}
                            style={{ display: "none" }}
                          />
                        </label>
                      </div>

                      <div style={{ marginTop: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#64748B" }}>Or direct Video S3 URL:</span>
                        <input
                          name="videoUrl"
                          value={form.videoUrl || ""}
                          onChange={updateField}
                          placeholder="https://...s3.ap-south-2.amazonaws.com/banners/promo.mp4"
                          style={{ marginTop: "4px" }}
                        />
                      </div>

                      {form.videoUrl && (
                        <div style={{ marginTop: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "11px", color: "#0369a1", fontWeight: 600 }}>
                              {videoFile ? `Selected: ${videoFile.name}` : "Attached S3 Video"}
                            </span>
                            <button
                              type="button"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#e11d48",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: "2px 4px",
                              }}
                              onClick={() => {
                                setVideoFile(null);
                                setForm((prev) => ({
                                  ...prev,
                                  videoUrl: "",
                                  mediaType: "IMAGE",
                                  position: prev.position === "HOME_VIDEO" ? "HOME_HERO" : prev.position,
                                }));
                                toast.info("Video detached. Converted to Static Image Banner.");
                              }}
                            >
                              Remove Video & Make Image Banner
                            </button>
                          </div>
                          <div className="banner-video-preview-wrapper">
                            <video src={form.videoUrl} controls autoPlay muted loop style={{ width: "100%", height: "100%" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "8px 12px", background: "#f0fdf4", border: "1px dashed #86efac", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                        <ImageIcon size={14} /> Campaign Type: Static Image Banner (No video will play).
                      </span>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "#0284c7", fontSize: "11px", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => setForm((prev) => ({ ...prev, mediaType: "VIDEO", position: "HOME_VIDEO" }))}
                      >
                        + Add Video
                      </button>
                    </div>
                  )}

                  {/* Poster & Image Artwork Section */}
                  <div className="moglix-banner-upload-box">
                    <div className="moglix-upload-header">
                      <span className="field-label-text">
                        <ImageIcon size={14} color="#d9232d" />
                        Poster / Banner Artwork (Primary Desktop) <span className="required-star">*</span>
                      </span>
                      <span className="moglix-spec-badge">LOPrimarydesktop</span>
                    </div>

                    <div className="moglix-upload-action-row">
                      <label className={`moglix-upload-btn ${uploadingImage ? "disabled" : ""}`}>
                        {uploadingImage ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>Uploading to S3 / CDN...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={15} />
                            <span>Choose Poster Artwork File (PNG/JPG)</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/jpg"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>

                    <div className="moglix-url-field-wrap">
                      <span className="sub-label">Or direct Image / Poster URL:</span>
                      <input
                        name="imageUrl"
                        value={form.imageUrl || form.posterUrl || ""}
                        onChange={updateField}
                        placeholder="https://...s3.amazonaws.com/banners/poster.jpg"
                        required={form.mediaType !== "VIDEO"}
                      />
                    </div>
                  </div>
                </div>

                {/* Artwork Presets and Live Preview */}
                <div className="banner-upload-column">
                  <div className="preset-selector-header">
                    <Sparkles size={13} color="#d8872f" />
                    <span>Or choose high-res marketplace artwork:</span>
                  </div>

                  <div className="preset-grid">
                    {BANNER_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        className={`preset-thumb-btn ${form.imageUrl === preset.url ? "selected" : ""}`}
                        onClick={() => handleSelectPreset(preset)}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} />
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>

                  <div className="banner-mini-preview">
                    <div className="banner-preview-label-row">
                      <span>LIVE BANNER PREVIEW</span>
                      <small>{form.position || "HOME_VIDEO"}</small>
                    </div>
                    <div className="moglix-hero-frame">
                      {form.videoUrl ? (
                        <div style={{ width: "100%", height: "140px", background: "#000" }}>
                          <video src={form.videoUrl} autoPlay muted loop controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      ) : (
                        <div
                          className="moglix-hero-slide"
                          style={{ backgroundImage: `url(${form.imageUrl || form.posterUrl || form.image})` }}
                        >
                          <div className="moglix-nav-btn prev">
                            <ChevronLeft size={14} />
                          </div>
                          <div className="moglix-nav-btn next">
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      )}
                      <div className="moglix-progress-bar">
                        <div className="moglix-progress-active" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="banner-editor-actions">
                <button
                  type="button"
                  className="btn-luxury-cancel"
                  onClick={() => setEditorOpen(false)}
                  disabled={saving || uploadingImage || uploadingVideo}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-luxury-submit"
                  disabled={saving || uploadingImage || uploadingVideo}
                >
                  {uploadingVideo
                    ? "Uploading Video to S3..."
                    : uploadingImage
                    ? "Uploading Artwork..."
                    : saving
                    ? "Saving to live database..."
                    : editing
                    ? "Save Changes"
                    : "Publish Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewOpen && (
        <div className="modal-overlay" onClick={() => setPreviewOpen(false)}>
          <div className="banner-preview-modal moglix-preview-modal" onClick={(event) => event.stopPropagation()}>
            <button className="banner-preview-close" onClick={() => setPreviewOpen(false)}>
              <X size={18} />
            </button>

            {form.videoUrl && (
              <div className="preview-modal-tabs">
                <button
                  type="button"
                  className={previewTab === "video" ? "active" : ""}
                  onClick={() => setPreviewTab("video")}
                >
                  <Video size={14} /> Video Stream
                </button>
                <button
                  type="button"
                  className={previewTab === "image" ? "active" : ""}
                  onClick={() => setPreviewTab("image")}
                >
                  <ImageIcon size={14} /> Poster Thumbnail Artwork
                </button>
              </div>
            )}

            <div className="moglix-modal-hero-wrapper">
              {form.videoUrl && previewTab === "video" ? (
                <div style={{ width: "100%", maxHeight: "450px", background: "#000" }}>
                  <video src={form.videoUrl} autoPlay controls style={{ width: "100%", maxHeight: "450px", objectFit: "contain" }} />
                </div>
              ) : (
                <div
                  className="moglix-modal-hero-slide"
                  style={{ backgroundImage: `url(${form.imageUrl || form.posterUrl || form.image})` }}
                >
                  <div className="moglix-nav-btn-lg prev">
                    <ChevronLeft size={20} />
                  </div>
                  <div className="moglix-nav-btn-lg next">
                    <ChevronRight size={20} />
                  </div>
                </div>
              )}
              <div className="moglix-modal-footer-bar">
                <div className="moglix-banner-info-tag">
                  <strong>{form.title || "Banner Campaign"}</strong>
                  <span>
                    {form.badge ? `[${form.badge}] ` : ""}
                    {form.videoUrl ? "🎥 Video Campaign" : "🖼 Image Banner"} • {form.position || "HOME_HERO"} • CTA: {form.ctaText || "Explore"} • Link: {form.linkType}:{" "}
                    {form.linkValue || "N/A"}
                  </span>
                </div>
                <div className="moglix-progress-bar-lg">
                  <div className="moglix-progress-active" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
