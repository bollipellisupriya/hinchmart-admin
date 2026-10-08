import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  Check,
  X,
  Eye,
  Plus,
  Download,
  Edit2,
  Trash2,
  Package,
  Store,
  Tag,
  IndianRupee,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Upload,
  Image as ImageIcon,
  Link,
  Sparkles,
  ShieldCheck,
  Building2,
  FileText,
  AlertCircle,
  Lock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import { getHotDeals, addHotDeal, deleteHotDeal } from "../api/hotDealApi";
import {
  getProducts,
  getAdminProducts,
  createProduct,
  createProductForSeller,
  updateProduct,
  approveProduct,
  rejectProduct,
  activateProduct,
  deactivateProduct,
  toggleProductActive,
  deleteProduct,
  getStoredProducts,
} from "../api/productApi";
import { getCategories, getStoredCategories, getStoredSubcategories } from "../api/categoryApi";
import { getSubcategories } from "../api/subcategoryApi";
import { getBrands, getStoredBrands, createBrand } from "../api/brandApi";
import { getCategorySpecifications } from "../api/specificationApi";
import { getSellers } from "../api/sellerApi";
import { useToast } from "../components/ToastContext";
import { subscribeDataUpdate } from "../api/dataStore";
import "../styles/products.css";
import "../styles/pages.css";
import { validateImageFile } from "../utils/imageValidation";
import { compressImage } from "../utils/imageStore";
import { uploadProductImage } from "../api/imageApi";


const STANDARD_UNITS = [
  { value: "unit", label: "Unit" },
  { value: "piece", label: "Piece (Pcs)" },
  { value: "MT", label: "Metric Ton (MT / Ton)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "gram", label: "Gram (g)" },
  { value: "litre", label: "Litre (L)" },
  { value: "metre", label: "Metre (m)" },
  { value: "sq.ft", label: "Square Feet (sq.ft)" },
  { value: "bag", label: "Bag (e.g. Cement 50kg)" },
  { value: "box", label: "Box / Carton" },
  { value: "set", label: "Set" },
  { value: "bundle", label: "Bundle" },
  { value: "roll", label: "Roll" },
  { value: "drum", label: "Drum" },
  { value: "cylinder", label: "Cylinder" },
];

const slugify = (value = "") =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function Products() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState(() => getStoredProducts());
  const [hotDealsList, setHotDealsList] = useState([]);
  const [categories, setCategories] = useState(() => getStoredCategories());
  const [subcategories, setSubcategories] = useState(() => getStoredSubcategories());
  const [brands, setBrands] = useState(() => (getStoredBrands() || []).filter(Boolean));
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(() => Math.max(1, Number(searchParams.get("page")) || 1));
  const [limit, setLimit] = useState(() => Math.max(1, Number(searchParams.get("limit")) || 20));
  const [pagination, setPagination] = useState({
    page: Math.max(1, Number(searchParams.get("page")) || 1),
    limit: Math.max(1, Number(searchParams.get("limit")) || 20),
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [jumpPageInput, setJumpPageInput] = useState("");
  const isInitialMount = useRef(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("categoryId") || "ALL");
  const [subcategoryFilter, setSubcategoryFilter] = useState(searchParams.get("subcategoryId") || "ALL");
  const [brandFilter, setBrandFilter] = useState(searchParams.get("brandId") || "ALL");
  const [error, setError] = useState("");

  // Dynamic Popup Modals State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editModalProduct, setEditModalProduct] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddForSellerModal, setShowAddForSellerModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Quick Brand Creation in Modal
  const [showQuickAddBrand, setShowQuickAddBrand] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState("");
  const [creatingBrand, setCreatingBrand] = useState(false);

  // Image Upload Tab State (upload | presets | url)
  const [imageUploadMode, setImageUploadMode] = useState("upload");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingSellerImage, setUploadingSellerImage] = useState(false);

  // Seller Modal Dynamic State (Upload Mode, Specs Builder & Volume Discount Tiers)
  const sellerFileInputRef = useRef(null);
  const [sellerImageUploadMode, setSellerImageUploadMode] = useState("upload");
  const [sellerIsDragOver, setSellerIsDragOver] = useState(false);
  const [sellerSpecRows, setSellerSpecRows] = useState([
    { id: "s1", key: "Grade / Standard", value: "Prime 550D (IS 1786:2008)" },
    { id: "s2", key: "Purity / Material", value: "High-Tensile Thermo-Mechanically Treated Steel" },
    { id: "s3", key: "Packaging Standard", value: "Factory Bundles (Strapped & Tagged)" },
  ]);
  const [sellerTierRows, setSellerTierRows] = useState([
    { id: "t1", minQty: 10, discountPercentage: 5 },
    { id: "t2", minQty: 50, discountPercentage: 12 },
    { id: "t3", minQty: 100, discountPercentage: 18 },
  ]);

  // Dynamic Category Specifications Schema & Value Mappings
  const [categorySpecs, setCategorySpecs] = useState([]);
  const [productSpecs, setProductSpecs] = useState({});
  const [loadingCategorySpecs, setLoadingCategorySpecs] = useState(false);

  // Form State with 4-Tier Hierarchy Fields
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    slug: "",
    sku: "",
    price: "",
    moq: "1",
    stock: "50",
    stockQty: 50,
    categoryId: "",
    subcategoryId: "",
    brandId: "",
    brand: "",
    brandName: "",
    unit: "unit",
    hsn: "7214",
    gst: "18%",
    description: "",
    image: "",
    imageUrl: "",
    imageKey: "",
    images: [],
    imageName: "",
    status: "APPROVED",
    active: true,
    is24HourDelivery: false,
  });

  // Dedicated Form State for Assisted Seller Catalog (POST /api/admin/products/sellers/{sellerId})
  const [sellerFormData, setSellerFormData] = useState({
    sellerId: "",
    storeId: "",
    title: "",
    name: "",
    slug: "",
    sku: "",
    description: "",
    price: "",
    mrp: "",
    unit: "unit",
    moq: "1",
    stockQty: 100,
    categoryId: "",
    subcategoryId: "",
    brandId: "",
    brandName: "",
    hsn: "7214",
    gst: "18%",
    is24HourDelivery: true,
    image: "",
    imageUrl: "",
    imageURL: "",
    images: [],
    bulkPricingTiers: [
      { minQty: 10, discountPercentage: 5.0 },
      { minQty: 50, discountPercentage: 12.0 },
    ],
    specifications: {
      "Standard Grade": "Commercial Prime Grade",
      "HSN": "7214",
    },
  });

  const getPageNumbers = (currentPage, totalPages) => {
    if (!totalPages || totalPages <= 1) return [1];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("...");
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const fetchPaginatedProducts = async (
    targetPage = page,
    targetLimit = limit,
    targetSearch = search,
    catId = categoryFilter,
    subcatId = subcategoryFilter,
    bId = brandFilter,
    status = statusFilter,
    showLoader = true
  ) => {
    try {
      if (showLoader) setLoading(true);
      const res = await getAdminProducts({
        page: targetPage,
        limit: targetLimit,
        search: targetSearch,
        categoryId: catId,
        subcategoryId: subcatId,
        brandId: bId,
        status: status,
        paginated: true,
      });

      if (res && res.products) {
        setProducts(res.products);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } else if (Array.isArray(res)) {
        setProducts(res);
      }
      setError("");
    } catch (err) {
      console.error("Products pagination error:", err);
      setError("Unable to load products from backend.");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const loadData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const [prodRes, catRes, subRes, brandRes, sellerRes] = await Promise.allSettled([
        getAdminProducts({
          page,
          limit,
          search,
          categoryId: categoryFilter,
          subcategoryId: subcategoryFilter,
          brandId: brandFilter,
          status: statusFilter,
          paginated: true,
        }),
        getCategories(),
        getSubcategories(),
        getBrands(),
        getSellers(),
        getHotDeals(),
      ]);

      if (prodRes.status === "fulfilled" && prodRes.value) {
        if (prodRes.value?.products) {
          setProducts(prodRes.value.products);
          if (prodRes.value.pagination) {
            setPagination(prodRes.value.pagination);
          }
        } else {
          const prodList = Array.isArray(prodRes.value)
            ? prodRes.value
            : prodRes.value?.products || prodRes.value?.data || [];
          setProducts(prodList);
        }
      }

      if (catRes.status === "fulfilled" && catRes.value) {
        const catList = Array.isArray(catRes.value)
          ? catRes.value
          : catRes.value?.categories || catRes.value?.data || [];
        setCategories(catList);
      }

      if (subRes.status === "fulfilled" && subRes.value) {
        const subList = Array.isArray(subRes.value)
          ? subRes.value
          : subRes.value?.subcategories || subRes.value?.data || [];
        setSubcategories(subList);
      }

      if (brandRes.status === "fulfilled" && brandRes.value) {
        const brandList = Array.isArray(brandRes.value)
          ? brandRes.value
          : brandRes.value?.brands || brandRes.value?.data || [];
        setBrands(brandList);
      }

      if (sellerRes.status === "fulfilled" && sellerRes.value) {
        const sellerList = Array.isArray(sellerRes.value)
          ? sellerRes.value
          : sellerRes.value?.sellers || sellerRes.value?.data || [];
        setSellers(sellerList);
      }

      const hdRes = await getHotDeals().catch(() => []);
      if (Array.isArray(hdRes)) {
        setHotDealsList(hdRes);
      }

      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load products from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeDataUpdate((event) => {
      if (
        event.entity === "products" ||
        event.entity === "categories" ||
        event.entity === "subcategories" ||
        event.entity === "brands"
      ) {
        loadData(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Synchronize URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (limit !== 20) params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (categoryFilter !== "ALL") params.set("categoryId", categoryFilter);
    if (subcategoryFilter !== "ALL") params.set("subcategoryId", subcategoryFilter);
    if (brandFilter !== "ALL") params.set("brandId", brandFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    setSearchParams(params, { replace: true });
  }, [page, limit, search, categoryFilter, subcategoryFilter, brandFilter, statusFilter]);

  // Handle page or limit navigation
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchPaginatedProducts(page, limit, search, categoryFilter, subcategoryFilter, brandFilter, statusFilter, true);
  }, [page, limit]);

  // Handle search or filter updates with debounced reset to page 1
  const isFirstFilterRun = useRef(true);
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      fetchPaginatedProducts(1, limit, search, categoryFilter, subcategoryFilter, brandFilter, statusFilter, true);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, subcategoryFilter, brandFilter, statusFilter]);

  // Fetch active Category Specifications dynamically when category changes
  useEffect(() => {
    if (!formData.categoryId) {
      setCategorySpecs([]);
      return;
    }
    let cancelled = false;
    const fetchCategorySpecs = async () => {
      try {
        setLoadingCategorySpecs(true);
        const res = await getCategorySpecifications(formData.categoryId, { activeOnly: true });
        if (!cancelled) {
          const list = Array.isArray(res) ? res : res?.data || [];
          setCategorySpecs(list);
        }
      } catch (err) {
        console.warn("Failed to load category specifications schema:", err);
      } finally {
        if (!cancelled) setLoadingCategorySpecs(false);
      }
    };
    fetchCategorySpecs();
    return () => {
      cancelled = true;
    };
  }, [formData.categoryId]);

  // Compute clean, structured Subcategory Options with parent categories
  const subcategoryOptions = useMemo(() => {
    const map = new Map();

    // 1. From subcategories array:
    (subcategories || []).forEach((sub) => {
      const id = sub.subcategoryId || sub.id;
      if (id) {
        const parentCat = (categories || []).find(
          (c) => String(c.categoryId || c.id) === String(sub.categoryId)
        );
        map.set(String(id), {
          id,
          categoryId: sub.categoryId || parentCat?.categoryId || parentCat?.id || 1,
          name: sub.name,
          label: parentCat ? `${parentCat.name} / ${sub.name}` : sub.name,
        });
      }
    });

    // 2. From categories nested lists:
    (categories || []).forEach((cat) => {
      (cat.subcategories || []).forEach((sub) => {
        const id = typeof sub === "string" ? sub : sub.subcategoryId || sub.id;
        const name = typeof sub === "string" ? sub : sub.name;
        if (id && !map.has(String(id))) {
          map.set(String(id), {
            id,
            categoryId: cat.categoryId || cat.id,
            name,
            label: `${cat.name} / ${name}`,
          });
        }
      });
    });

    return Array.from(map.values());
  }, [categories, subcategories]);

  const getStatus = (product) => {
    if (!product) return "PENDING";
    const rawStatus = (
      product.approvalStatus ||
      product.approval_status ||
      product.status ||
      (product.active ? "APPROVED" : "PENDING")
    ).toUpperCase();
    if (product.active === false && rawStatus !== "PENDING" && rawStatus !== "REJECTED") {
      return "INACTIVE";
    }
    return rawStatus;
  };

  const handleToggleActivate = async (product) => {
    const id = product.productId || product.id || product._id;
    const currentStatus = getStatus(product);
    const currentActive = product.active !== undefined ? Boolean(product.active) : (currentStatus === "APPROVED" || currentStatus === "ACTIVE");
    const nextActive = !currentActive;
    const nextStatus = nextActive ? "APPROVED" : "INACTIVE";

    try {
      if (currentStatus === "PENDING") {
        const approved = await approveProduct(id, product);
        setProducts((current) =>
          current.map((item) =>
            (item.productId || item.id || item._id) === id
              ? { ...item, ...approved, active: true, status: "APPROVED", approvalStatus: "APPROVED" }
              : item
          )
        );
        toast.success(`Product "${product.name}" approved & activated.`);
        if (selectedProduct && (selectedProduct.productId || selectedProduct.id || selectedProduct._id) === id) {
          setSelectedProduct((prev) => ({
            ...prev,
            ...approved,
            active: true,
            status: "APPROVED",
            approvalStatus: "APPROVED",
          }));
        }
      } else {
        const toggled = await toggleProductActive(id, product);
        setProducts((current) =>
          current.map((item) =>
            (item.productId || item.id || item._id) === id
              ? { ...item, ...toggled, active: nextActive, status: nextStatus, approvalStatus: nextStatus }
              : item
          )
        );
        if (nextActive) {
          toast.success(`Product "${product.name}" activated.`);
        } else {
          toast.warning(`Product "${product.name}" deactivated.`);
        }
        if (selectedProduct && (selectedProduct.productId || selectedProduct.id || selectedProduct._id) === id) {
          setSelectedProduct((prev) => ({
            ...prev,
            ...toggled,
            active: nextActive,
            status: nextStatus,
            approvalStatus: nextStatus,
          }));
        }
      }
    } catch (err) {
      toast.error("Failed to update product status.");
    }
  };

  const handleApprove = async (product) => {
    const id = product.productId || product.id || product._id;
    try {
      await approveProduct(id, product);
      setProducts((current) =>
        current.map((item) =>
          (item.productId || item.id || item._id) === id
            ? { ...item, active: true, status: "APPROVED", approvalStatus: "APPROVED" }
            : item
        )
      );
      toast.success(`Product "${product.name}" approved.`);
      await loadData(false);
    } catch (err) {
      toast.error("Unable to approve product.");
    }
  };

  const handleReject = async (product) => {
    const id = product.productId || product.id || product._id;
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      await rejectProduct(id, reason, product);
      setProducts((current) =>
        current.map((item) =>
          (item.productId || item.id || item._id) === id
            ? { ...item, active: false, status: "REJECTED", approvalStatus: "REJECTED", rejectionReason: reason }
            : item
        )
      );
      toast.warning(`Product "${product.name}" rejected.`);
      await loadData(false);
    } catch (err) {
      toast.error("Unable to reject product.");
    }
  };

  const handleDelete = async (product) => {
    const id = product.productId || product.id || product._id;
    if (!window.confirm(`Delete product "${product.name || product.title}" permanently?`)) return;
    
    // Immediate UI removal
    setProducts((prev) => prev.filter((p) => String(p.productId || p.id || p._id) !== String(id)));
    setSelectedIds((prev) => prev.filter((i) => String(i) !== String(id)));
    if (selectedProduct && (selectedProduct.productId || selectedProduct.id || selectedProduct._id) === id) {
      setSelectedProduct(null);
    }

    try {
      await deleteProduct(id, product);
      toast.info(`Product "${product.name || product.title}" deleted.`);
    } catch (err) {
      toast.error("Unable to delete product.");
    }
    await loadData(false);
  };

  // Image Upload File Handler
  const handleFileUpload = async (file) => {
    if (!file) return;
    const error = await validateImageFile(file);
    if (error) {
      toast.warning(error);
      return;
    }
    setUploadingImage(true);
    let tempPreview = "";
    try {
      // 1. Instant local preview
      tempPreview = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        image: tempPreview,
        imageUrl: tempPreview,
        imageURL: tempPreview,
        images: [tempPreview],
        imageName: file.name,
      }));

      // 2. Direct S3 backend upload: POST /api/images/products
      const uploadRes = await uploadProductImage(file);
      const s3Url = uploadRes.imageURL || uploadRes.imageUrl || (typeof uploadRes === "string" ? uploadRes : "");
      const s3Key = uploadRes.imageKey || "";

      if (s3Url) {
        setFormData((prev) => ({
          ...prev,
          imageURL: s3Url,
          image: s3Url,
          imageUrl: s3Url,
          imageKey: s3Key,
          images: [s3Url],
          imageName: file.name,
        }));
        toast.success(`Image "${file.name}" uploaded to S3!`);
      } else {
        throw new Error("No imageURL returned from S3 endpoint");
      }
    } catch (err) {
      console.warn("Product image upload to S3 failed:", err);
      toast.error("Image upload failed. Please try again.");
      setFormData((prev) => ({
        ...prev,
        image: "",
        imageUrl: "",
        imageURL: "",
        images: [],
        imageName: "",
      }));
    } finally {
      setUploadingImage(false);
    }
  };


  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // 4-Tier Modal Cascading Selection Memos (Standard Modal)
  const availableModalSubcategories = useMemo(() => {
    if (!formData.categoryId) return [];
    return subcategories.filter(
      (s) => String(s.categoryId || s.category_id) === String(formData.categoryId)
    );
  }, [subcategories, formData.categoryId]);

  const availableModalBrands = useMemo(() => {
    if (!formData.subcategoryId) return [];
    return brands.filter(
      (b) => String(b.subcategoryId || b.sub_category_id) === String(formData.subcategoryId)
    );
  }, [brands, formData.subcategoryId]);

  // 4-Tier Modal Cascading Selection Memos (Assisted Seller Modal)
  const availableSellerModalSubcategories = useMemo(() => {
    if (!sellerFormData.categoryId) return [];
    return subcategories.filter(
      (s) => String(s.categoryId || s.category_id) === String(sellerFormData.categoryId)
    );
  }, [subcategories, sellerFormData.categoryId]);

  const availableSellerModalBrands = useMemo(() => {
    if (!sellerFormData.subcategoryId) return [];
    return brands.filter(
      (b) => String(b.subcategoryId || b.sub_category_id) === String(sellerFormData.subcategoryId)
    );
  }, [brands, sellerFormData.subcategoryId]);

  // 4-Tier Filter Bar Cascading Memos
  const availableFilterSubcategories = useMemo(() => {
    if (categoryFilter === "ALL") return subcategories;
    return subcategories.filter(
      (s) => String(s.categoryId || s.category_id) === String(categoryFilter)
    );
  }, [subcategories, categoryFilter]);

  const availableFilterBrands = useMemo(() => {
    let list = brands;
    if (categoryFilter !== "ALL") {
      list = list.filter((b) => String(b.categoryId) === String(categoryFilter));
    }
    if (subcategoryFilter !== "ALL") {
      list = list.filter((b) => String(b.subcategoryId) === String(subcategoryFilter));
    }
    return list;
  }, [brands, categoryFilter, subcategoryFilter]);

  // Add / Edit Modal Openers
  const handleOpenAdd = () => {
    setFormData({
      name: "",
      title: "",
      slug: "",
      sku: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      price: "",
      moq: "1",
      stock: "100",
      stockQty: 100,
      categoryId: "",
      subcategoryId: "",
      brandId: "",
      brand: "",
      brandName: "",
      unit: "unit",
      hsn: "7214",
      gst: "18%",
      description: "",
      imageURL: "",
      image: "",
      imageUrl: "",
      imageKey: "",
      images: [],
      imageName: "",
      status: "APPROVED",
      active: true,
      is24HourDelivery: false,
    });
    setProductSpecs({});
    setImageUploadMode("upload");
    setShowQuickAddBrand(false);
    setQuickBrandName("");
    setShowAddModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditModalProduct(product);
    const prodStatus = getStatus(product);
    const currentImg = product.imageURL || product.imageUrl || product.image || (product.images && product.images[0]) || "";
    const matchedBrand = (brands || []).find((b) => b && Number(b.brandId || b.id) === Number(product.brandId)) ||
      (brands || []).find((b) => b && b.name?.toLowerCase() === (product.brandName || product.brand)?.toLowerCase());

    const catId = product.categoryId ? Number(product.categoryId) : (matchedBrand?.categoryId ? Number(matchedBrand.categoryId) : "");
    const subcatId = product.subcategoryId ? Number(product.subcategoryId) : (matchedBrand?.subcategoryId ? Number(matchedBrand.subcategoryId) : "");
    const bId = product.brandId ? Number(product.brandId) : (matchedBrand?.brandId || matchedBrand?.id ? Number(matchedBrand.brandId || matchedBrand.id) : "");

    const existingSpecs = typeof product.specifications === "object" && product.specifications !== null
      ? { ...product.specifications }
      : {};
    setProductSpecs(existingSpecs);

    setFormData({
      name: product.name || product.title || "",
      title: product.title || product.name || "",
      slug: product.slug || slugify(product.name || product.title || ""),
      sku: product.sku || "",
      price: product.price ?? product.basePrice ?? "",
      moq: product.moq ?? 1,
      stock: product.stockQty ?? product.stock ?? product.inventory ?? 0,
      stockQty: product.stockQty ?? product.stock ?? product.inventory ?? 0,
      categoryId: catId,
      subcategoryId: subcatId,
      brandId: bId,
      brand: product.brandName || product.brand || matchedBrand?.name || "",
      brandName: product.brandName || product.brand || matchedBrand?.name || "",
      unit: product.unit || "unit",
      hsn: product.hsnCode || product.hsn || "7214",
      gst: product.gstRate ? `${product.gstRate}%` : product.gst || "18%",
      description: product.description || "",
      imageURL: currentImg,
      image: currentImg,
      imageUrl: currentImg,
      imageKey: product.imageKey || "",
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : (currentImg ? [currentImg] : []),
      imageName: "existing_product_image.jpg",
      status: prodStatus,
      active: product.active !== undefined ? product.active : (prodStatus === "APPROVED" || prodStatus === "ACTIVE"),
      is24HourDelivery: Boolean(product.is24HourDelivery),
    });
    setImageUploadMode("upload");
    setShowQuickAddBrand(false);
    setQuickBrandName("");
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormData((prev) => {
      const prevAutoSlug = slugify(prev.name || "");
      const shouldAutoUpdateSlug = !prev.slug || prev.slug === prevAutoSlug;
      return {
        ...prev,
        name: newName,
        title: newName,
        slug: shouldAutoUpdateSlug ? slugify(newName) : prev.slug,
      };
    });
  };

  // Quick Brand Creator in Modal
  const handleQuickCreateBrand = async () => {
    if (!quickBrandName.trim()) {
      toast.warning("Please enter a Brand name.");
      return;
    }
    if (!formData.subcategoryId) {
      toast.warning("Please select a Subcategory before creating a brand.");
      return;
    }
    try {
      setCreatingBrand(true);
      const created = await createBrand({
        name: quickBrandName.trim(),
        subcategoryId: formData.subcategoryId,
        categoryId: formData.categoryId,
        active: true,
      });
      setBrands((prev) => [created, ...prev.filter((b) => String(b.brandId || b.id) !== String(created.brandId || created.id))]);
      setFormData((prev) => ({
        ...prev,
        brandId: created.brandId || created.id,
        brand: created.name,
        brandName: created.name,
      }));
      setQuickBrandName("");
      setShowQuickAddBrand(false);
      toast.success(`Brand "${created.name}" created and linked under subcategory!`);
    } catch (err) {
      console.error("Brand creation error:", err);
      toast.error("Failed to create brand: " + (err?.message || "Server Error"));
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const prodTitle = (formData.name || formData.title || "").trim();
    if (!prodTitle) {
      toast.warning("Please enter a Product Title.");
      return;
    }
    if (!formData.categoryId) {
      toast.warning("Please select a Category.");
      return;
    }
    if (!formData.subcategoryId) {
      toast.warning("Please select a Subcategory.");
      return;
    }
    if (!formData.brandId) {
      toast.warning("Please select or create a Brand.");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast.warning("Please provide a valid Product Price.");
      return;
    }
    if (!formData.unit?.trim()) {
      toast.warning("Please select a Unit of measurement.");
      return;
    }

    // Validate mandatory category specifications
    for (const spec of categorySpecs) {
      if (spec.required) {
        const val = productSpecs[spec.key] ?? productSpecs[spec.name];
        if (val === undefined || val === null || String(val).trim() === "") {
          toast.warning(`Please specify required technical attribute: "${spec.name}"`);
          return;
        }
      }
    }

    // Construct canonical specifications map
    const cleanSpecs = {};
    Object.entries(productSpecs).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        const matched = categorySpecs.find((s) => s.name === key || s.key === key);
        const canonKey = matched?.key || key;
        cleanSpecs[canonKey] = String(val).trim();
      }
    });

    // Strict number sanitization (preventing HttpMessageNotReadableException 500 error & Jackson integer overflow)
    const cleanPrice = parseFloat(String(formData.price).replace(/[^0-9.]/g, "")) || 0.01;
    const cleanMrp = formData.mrp ? (parseFloat(String(formData.mrp).replace(/[^0-9.]/g, "")) || cleanPrice * 1.15) : cleanPrice * 1.15;
    const cleanStockQty = Math.min(2147483647, parseInt(String(formData.stockQty ?? formData.stock ?? "0").replace(/[^0-9]/g, ""), 10) || 0);
    const cleanMoq = Math.min(2147483647, parseInt(String(formData.moq || "1").replace(/[^0-9]/g, ""), 10) || 1);
    const cleanGstRate = parseFloat(String(formData.gst || formData.gstRate || "18").replace(/[^0-9.]/g, "")) || 18.0;
    const cleanHsnCode = String(formData.hsn || formData.hsnCode || "7214").replace(/[^0-9]/g, "") || "7214";

    let finalBrandId = Number(formData.brandId);
    let finalSubcatId = Number(formData.subcategoryId);
    let finalCatId = Number(formData.categoryId);

    // If any ID was generated by Date.now() (> 2147483647), resolve it to a valid integer
    if (finalBrandId > 2147483647) {
      const matched = brands.find((b) => Number(b.brandId || b.id) <= 2147483647 && (Number(b.brandId || b.id) === finalBrandId || b.name?.toLowerCase() === formData.brand?.toLowerCase()));
      finalBrandId = matched ? Number(matched.brandId || matched.id) : 1;
    }
    if (finalSubcatId > 2147483647) {
      const matched = subcategories.find((s) => Number(s.subcategoryId || s.id) <= 2147483647);
      finalSubcatId = matched ? Number(matched.subcategoryId || matched.id) : 1;
    }
    if (finalCatId > 2147483647) {
      const matched = categories.find((c) => Number(c.categoryId || c.id) <= 2147483647);
      finalCatId = matched ? Number(matched.categoryId || matched.id) : 1;
    }

    const cleanPayload = {
      ...formData,
      title: prodTitle,
      name: prodTitle,
      brandId: finalBrandId,
      subcategoryId: finalSubcatId,
      categoryId: finalCatId,
      price: cleanPrice,
      mrp: cleanMrp,
      stockQty: cleanStockQty,
      unit: formData.unit.trim(),
      moq: cleanMoq,
      gstRate: cleanGstRate,
      hsnCode: cleanHsnCode,
      is24HourDelivery: Boolean(formData.is24HourDelivery),
      active: formData.active !== undefined ? Boolean(formData.active) : true,
      specifications: cleanSpecs,
    };

    try {
      if (editModalProduct) {
        const id = editModalProduct.productId || editModalProduct.id || editModalProduct._id;
        const updated = await updateProduct(id, cleanPayload);
        setProducts((prev) =>
          prev.map((item) => (String(item.productId || item.id) === String(id) ? { ...item, ...updated } : item))
        );
        toast.success(`Product "${prodTitle}" updated successfully.`);
        setEditModalProduct(null);
      } else {
        const created = cleanPayload.sellerId
          ? await createProductForSeller(cleanPayload.sellerId, cleanPayload)
          : await createProduct(cleanPayload);
        setProducts((prev) => [created, ...prev.filter((p) => String(p.productId || p.id) !== String(created.productId || created.id))]);
        toast.success(`Product "${prodTitle}" created successfully!`);
        setShowAddModal(false);
      }
      await loadData(false);
    } catch (err) {
      console.error("Save product failed:", err);
      toast.error("Operation failed: " + (err?.message || "Server error"));
    }
  };

  // ==========================================
  // Assisted Seller Product Creation Handler (POST /api/admin/products/sellers/{sellerId})
  // ==========================================
  const handleOpenAddForSeller = () => {
    const defaultSellerId = sellers[0]?.sellerId || sellers[0]?.id || "";
    setSellerFormData({
      sellerId: defaultSellerId,
      storeId: "",
      title: "",
      name: "",
      slug: "",
      sku: `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      description: "",
      price: "",
      mrp: "",
      unit: "unit",
      moq: "1",
      stockQty: 100,
      categoryId: "",
      subcategoryId: "",
      brandId: "",
      brandName: "",
      hsn: "7214",
      gst: "18%",
      is24HourDelivery: true,
      image: "",
      imageUrl: "",
      imageURL: "",
      images: [],
    });
    setSellerImageUploadMode("upload");
    setSellerSpecRows([
      { id: `spec-${Date.now()}-1`, key: "Grade / Standard", value: "Prime 550D (IS 1786:2008)" },
      { id: `spec-${Date.now()}-2`, key: "Purity / Material", value: "High-Tensile Thermo-Mechanically Treated Steel" },
      { id: `spec-${Date.now()}-3`, key: "Packaging Standard", value: "Factory Bundled & Strapped (50kg/bar standard)" },
    ]);
    setSellerTierRows([
      { id: `tier-${Date.now()}-1`, minQty: 10, discountPercentage: 5 },
      { id: `tier-${Date.now()}-2`, minQty: 50, discountPercentage: 12 },
      { id: `tier-${Date.now()}-3`, minQty: 100, discountPercentage: 18 },
    ]);
    setShowAddForSellerModal(true);
  };

  const handleSellerFileUpload = async (file) => {
    if (!file) return;
    const error = await validateImageFile(file);
    if (error) {
      toast.warning(error);
      return;
    }
    setUploadingSellerImage(true);
    let tempPreview = "";
    try {
      tempPreview = URL.createObjectURL(file);
      setSellerFormData((prev) => ({
        ...prev,
        image: tempPreview,
        imageUrl: tempPreview,
        imageURL: tempPreview,
        images: [tempPreview],
      }));

      const uploadRes = await uploadProductImage(file);
      const s3Url = uploadRes.imageURL || uploadRes.imageUrl || (typeof uploadRes === "string" ? uploadRes : "");
      if (s3Url) {
        setSellerFormData((prev) => ({
          ...prev,
          imageURL: s3Url,
          image: s3Url,
          imageUrl: s3Url,
          images: [s3Url],
        }));
        toast.success(`Image "${file.name}" uploaded to S3!`);
      }
    } catch (err) {
      console.warn("Seller product image upload failed:", err);
      toast.error("Image upload failed. Please try again.");
    } finally {
      setUploadingSellerImage(false);
    }
  };

  const handleSellerDrop = (e) => {
    e.preventDefault();
    setSellerIsDragOver(false);
    if (uploadingSellerImage) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSellerFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Dynamic Specification Helpers
  const handleAddSellerSpecRow = (defaultKey = "", defaultValue = "") => {
    setSellerSpecRows((prev) => [
      ...prev,
      { id: `spec-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, key: defaultKey, value: defaultValue },
    ]);
  };

  const handleRemoveSellerSpecRow = (id) => {
    setSellerSpecRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateSellerSpecRow = (id, field, val) => {
    setSellerSpecRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  // Dynamic Volume Discount Tier Helpers
  const handleAddSellerTierRow = () => {
    const lastQty = Number(sellerTierRows[sellerTierRows.length - 1]?.minQty || 0);
    const lastDisc = Number(sellerTierRows[sellerTierRows.length - 1]?.discountPercentage || 0);
    setSellerTierRows((prev) => [
      ...prev,
      {
        id: `tier-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        minQty: lastQty > 0 ? lastQty + 50 : 20,
        discountPercentage: Math.min(50, lastDisc > 0 ? lastDisc + 5 : 5),
      },
    ]);
  };

  const handleRemoveSellerTierRow = (id) => {
    setSellerTierRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateSellerTierRow = (id, field, val) => {
    setSellerTierRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const handleSaveProductForSeller = async (e) => {
    e.preventDefault();
    if (!sellerFormData.sellerId) {
      toast.warning("Please select a Seller / Store.");
      return;
    }
    const prodTitle = (sellerFormData.title || sellerFormData.name || "").trim();
    if (!prodTitle) {
      toast.warning("Please enter a Product Title.");
      return;
    }
    if (!sellerFormData.categoryId) {
      toast.warning("Please select a Category.");
      return;
    }
    if (!sellerFormData.subcategoryId) {
      toast.warning("Please select a Subcategory.");
      return;
    }
    if (!sellerFormData.brandId) {
      toast.warning("Please select a Brand.");
      return;
    }
    if (!sellerFormData.price || Number(sellerFormData.price) <= 0) {
      toast.warning("Please enter a valid Product Price.");
      return;
    }

    const cleanPrice = parseFloat(String(sellerFormData.price).replace(/[^0-9.]/g, "")) || 0.01;
    const cleanMrp = sellerFormData.mrp ? (parseFloat(String(sellerFormData.mrp).replace(/[^0-9.]/g, "")) || cleanPrice * 1.15) : cleanPrice * 1.15;
    const cleanStockQty = parseInt(String(sellerFormData.stockQty ?? "100").replace(/[^0-9]/g, ""), 10) || 100;
    const cleanMoq = parseInt(String(sellerFormData.moq || "1").replace(/[^0-9]/g, ""), 10) || 1;

    const matchedSeller = sellers.find((s) => String(s.sellerId || s.id) === String(sellerFormData.sellerId));
    const sellerName = matchedSeller?.name || matchedSeller?.companyName || matchedSeller?.storeName || `Seller #${sellerFormData.sellerId}`;

    // Construct specifications map
    const specsMap = {};
    sellerSpecRows.forEach((r) => {
      if (r.key && r.key.trim()) {
        specsMap[r.key.trim()] = (r.value || "").trim();
      }
    });

    // Construct valid bulk pricing tiers
    const cleanTiers = sellerTierRows
      .filter((t) => Number(t.minQty) > 0 && Number(t.discountPercentage) >= 0)
      .map((t) => ({
        minQty: Number(t.minQty),
        discountPercentage: Number(t.discountPercentage),
      }));

    const cleanPayload = {
      ...sellerFormData,
      sellerId: sellerFormData.sellerId,
      title: prodTitle,
      name: prodTitle,
      slug: sellerFormData.slug || slugify(prodTitle),
      brandId: Number(sellerFormData.brandId),
      subcategoryId: Number(sellerFormData.subcategoryId),
      categoryId: Number(sellerFormData.categoryId),
      price: cleanPrice,
      mrp: cleanMrp,
      stockQty: cleanStockQty,
      unit: (sellerFormData.unit || "unit").trim(),
      moq: cleanMoq,
      hsn: sellerFormData.hsn || "7214",
      gstRate: parseFloat(String(sellerFormData.gst || "18").replace(/[^0-9.]/g, "")) || 18,
      status: "APPROVED",
      approvalStatus: "APPROVED",
      active: true,
      is24HourDelivery: Boolean(sellerFormData.is24HourDelivery),
      images: sellerFormData.images?.length > 0 ? sellerFormData.images : (sellerFormData.image ? [sellerFormData.image] : []),
      imageURL: sellerFormData.imageUrl || sellerFormData.image || (sellerFormData.images && sellerFormData.images[0]) || "",
      imageUrl: sellerFormData.imageUrl || sellerFormData.image || (sellerFormData.images && sellerFormData.images[0]) || "",
      image: sellerFormData.imageUrl || sellerFormData.image || (sellerFormData.images && sellerFormData.images[0]) || "",
      bulkPricingTiers: cleanTiers,
      specifications: specsMap,
    };

    try {
      const created = await createProductForSeller(sellerFormData.sellerId, cleanPayload);
      setProducts((prev) => [created, ...prev.filter((p) => String(p.productId || p.id) !== String(created.productId || created.id))]);
      toast.success(`Product "${prodTitle}" published on behalf of ${sellerName}!`);
      setShowAddForSellerModal(false);
      await loadData(false);
    } catch (err) {
      console.error("Assisted product creation error:", err);
      toast.error("Failed to create product for seller: " + (err?.message || "Server error"));
    }
  };

  // Bulk Actions
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredProducts.map((p) => String(p.productId || p.id || p._id)));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    const sId = String(id);
    setSelectedIds((prev) =>
      prev.some((i) => String(i) === sId)
        ? prev.filter((i) => String(i) !== sId)
        : [...prev, sId]
    );
  };

  const handleBulkActivate = async () => {
    const ids = [...selectedIds];
    setSelectedIds([]);
    for (const id of ids) {
      try {
        const prod = products.find((p) => String(p.productId || p.id || p._id) === String(id));
        await activateProduct(id, prod);
      } catch (err) {
        console.warn(`Failed to activate product ${id}:`, err?.message);
      }
    }
    toast.success(`Activated ${ids.length} products.`);
    await loadData(false);
  };

  const handleBulkDeactivate = async () => {
    const ids = [...selectedIds];
    setSelectedIds([]);
    for (const id of ids) {
      try {
        const prod = products.find((p) => String(p.productId || p.id || p._id) === String(id));
        await deactivateProduct(id, prod);
      } catch (err) {
        console.warn(`Failed to deactivate product ${id}:`, err?.message);
      }
    }
    toast.warning(`Deactivated ${ids.length} products.`);
    await loadData(false);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected products?`)) return;
    const idsToDelete = [...selectedIds];
    
    // Immediate UI removal
    setProducts((prev) => prev.filter((p) => !idsToDelete.some((id) => String(id) === String(p.productId || p.id || p._id))));
    setSelectedIds([]);

    for (const id of idsToDelete) {
      const prod = products.find((p) => String(p.productId || p.id || p._id) === String(id));
      await deleteProduct(id, prod);
    }
    toast.info(`Deleted ${idsToDelete.length} products.`);
    await loadData(false);
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ["ID,Product Name,SKU,Brand,Subcategory,Category,Price (INR),MOQ,Stock,Status"];
    const rows = filteredProducts.map((p) =>
      [
        `"${p.id || p._id}"`,
        `"${p.name || p.title || ""}"`,
        `"${p.sku || ""}"`,
        `"${p.brandName || p.brand || ""}"`,
        `"${p.subcategoryName || ""}"`,
        `"${p.categoryName || p.category || ""}"`,
        p.price || 0,
        p.moq || 1,
        p.stock || 0,
        `"${getStatus(p)}"`,
      ].join(",")
    );
    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_products_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Products export downloaded!");
  };

  const filteredProducts = useMemo(() => {
    // When backend pagination is used, products are already fetched and filtered for the current page
    if (pagination.totalCount > 0) {
      if (statusFilter === "ALL") return products;
      return products.filter((product) => {
        const status = getStatus(product);
        return (
          status === statusFilter ||
          (statusFilter === "APPROVED" && (status === "APPROVED" || status === "ACTIVE"))
        );
      });
    }

    // Local / fallback filtering
    return products.filter((product) => {
      const q = search.toLowerCase();
      const searchText = `${product.name || ""} ${product.title || ""} ${product.sku || ""} ${product.brandName || product.brand || ""} ${product.seller?.name || product.sellerName || ""} ${product.category?.name || product.category || ""} ${product.subcategoryName || ""}`.toLowerCase();
      const matchesSearch = !q || searchText.includes(q);

      const status = getStatus(product);
      const isHotDeal = hotDealsList.some(
        (hd) => Number(hd.productId) === Number(product.productId || product.id || product._id)
      );

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "HOT_DEALS" ? isHotDeal : status === statusFilter) ||
        (statusFilter === "APPROVED" && (status === "APPROVED" || status === "ACTIVE"));

      let matchesCategory = true;
      if (categoryFilter !== "ALL") {
        matchesCategory = Number(product.categoryId) === Number(categoryFilter);
      }

      let matchesSubcategory = true;
      if (subcategoryFilter !== "ALL") {
        matchesSubcategory = Number(product.subcategoryId) === Number(subcategoryFilter);
      }

      let matchesBrand = true;
      if (brandFilter !== "ALL") {
        matchesBrand = Number(product.brandId) === Number(brandFilter);
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesSubcategory && matchesBrand;
    });
  }, [products, search, statusFilter, categoryFilter, subcategoryFilter, brandFilter, pagination.totalCount]);

  // Dynamic Autocomplete Search Suggestions
  const searchSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) =>
        (p.name || p.title || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.brandName || p.brand || "").toLowerCase().includes(q) ||
        (p.categoryName || p.category?.name || p.category || "").toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [products, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const counts = useMemo(() => {
    return {
      total: pagination.totalCount || products.length,
      approved: pagination.totalCount || products.filter((p) => (p.active ?? true) && (getStatus(p) === "APPROVED" || getStatus(p) === "ACTIVE")).length,
      pending: products.filter((p) => getStatus(p) === "PENDING").length,
      inactive: products.filter((p) => p.active === false || getStatus(p) === "INACTIVE").length,
      rejected: products.filter((p) => getStatus(p) === "REJECTED").length,
    };
  }, [pagination.totalCount, products]);

  return (
    <div className="products-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Products Catalog & Inventory</h1>
          <p>Manage marketplace SKU inventory, MOQ policies, pricing & live catalog activation</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button
            className="primary-button"
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              borderColor: "#4338ca",
              boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
            }}
            onClick={handleOpenAddForSeller}
          >
            <Store size={18} />
            <span>Add on Behalf of Seller</span>
          </button>
          <button className="primary-button" onClick={handleOpenAdd}>
            <Plus size={18} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${statusFilter === "ALL" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <span className="stat-pill-label">Total SKUs</span>
          <strong className="stat-pill-value">{counts.total}</strong>
        </div>

        <div
          className={`stat-pill active ${statusFilter === "APPROVED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("APPROVED")}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">Live / Active</span>
          <strong className="stat-pill-value">{counts.approved}</strong>
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
      </div>

      {error && (
        <div className="error-box">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={loadData}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* 4-Tier Hierarchy Breadcrumb Navigator */}
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
          fontSize: "12px",
          color: "#64748b",
        }}
      >
        <span style={{ fontWeight: 700, color: "#0f172a" }}>Catalog Hierarchy:</span>
        <span
          style={{ cursor: "pointer", color: "#d97706", fontWeight: 600 }}
          onClick={() => navigate("/admin/categories")}
        >
          1. Categories ({categories.length})
        </span>
        <ChevronRight size={14} />
        <span
          style={{ cursor: "pointer", color: "#d97706", fontWeight: 600 }}
          onClick={() => navigate("/admin/subcategories")}
        >
          2. Subcategories ({subcategories.length})
        </span>
        <ChevronRight size={14} />
        <span
          style={{ cursor: "pointer", color: "#d97706", fontWeight: 600 }}
          onClick={() => navigate("/admin/brands")}
        >
          3. Brands ({brands.length})
        </span>
        <ChevronRight size={14} />
        <span
          style={{
            background: "#fef3c7",
            color: "#92400e",
            padding: "2px 8px",
            borderRadius: "6px",
            fontWeight: 800,
          }}
        >
          4. Products ({counts.total}) [Active View]
        </span>
      </div>

      {/* Content Card */}
      <div className="content-card">
        {/* Table Toolbar with Multi-level 4-Tier Filters */}
        <div className="table-toolbar" style={{ flexWrap: "wrap", gap: "12px" }}>
          <div
            ref={searchContainerRef}
            className="search-input"
            style={{ minWidth: "300px", position: "relative" }}
          >
            <Search size={18} />
            <input
              value={search}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Search products by title, SKU, brand..."
            />
            {search && (
              <button
                className="search-clear"
                onClick={() => {
                  setSearch("");
                  setSearchFocused(false);
                }}
                title="Clear search"
              >
                ×
              </button>
            )}

            {/* Dynamic Real-Time Autocomplete Suggestions Dropdown */}
            {searchFocused && search.trim().length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  zIndex: 100,
                  overflow: "hidden",
                  maxHeight: "320px",
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    background: "#f8fafc",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#64748b",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>MATCHING PRODUCTS ({searchSuggestions.length})</span>
                  <span style={{ color: "#d97706" }}>⚡ Live Suggestions</span>
                </div>

                {searchSuggestions.length === 0 ? (
                  <div style={{ padding: "14px", textAlign: "center", color: "#94a3b8", fontSize: "12.5px" }}>
                    No products matching "{search}"
                  </div>
                ) : (
                  searchSuggestions.map((item) => (
                    <div
                      key={item.productId || item.id || item._id}
                      onClick={() => {
                        setSearch(item.name || item.title);
                        setSearchFocused(false);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f8fafc",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#fef3c7")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          background: "#0f172a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {item.image || (item.images && item.images[0]) ? (
                          <img
                            src={item.image || item.images[0]}
                            alt={item.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <Package size={16} style={{ color: "#f59e0b" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                          {item.name || item.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ color: "#d97706", fontWeight: 600 }}>{item.brandName || item.brand || "Standard"}</span>
                          <span>•</span>
                          <span>SKU: {item.sku || "—"}</span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "2px 7px",
                          borderRadius: "6px",
                          background: "#ecfdf5",
                          color: "#047857",
                          fontWeight: 700,
                        }}
                      >
                        ₹{Number(item.price ?? item.basePrice ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 3-Level Cascading Filter Controls (Category -> Subcategory -> Brand) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div className="sort-control">
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
                Category:
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setSubcategoryFilter("ALL");
                  setBrandFilter("ALL");
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => {
                  const id = c.categoryId || c.id;
                  return (
                    <option key={id} value={id}>
                      {c.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="sort-control">
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
                Subcategory:
              </span>
              <select
                value={subcategoryFilter}
                onChange={(e) => {
                  setSubcategoryFilter(e.target.value);
                  setBrandFilter("ALL");
                }}
              >
                <option value="ALL">All Subcategories</option>
                {availableFilterSubcategories.map((s) => {
                  const id = s.subcategoryId || s.id;
                  return (
                    <option key={id} value={id}>
                      {s.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="sort-control">
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginRight: "4px" }}>
                Brand:
              </span>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              >
                <option value="ALL">All Brands ({availableFilterBrands.length})</option>
                {availableFilterBrands.map((b) => {
                  const id = b.brandId || b.id;
                  return (
                    <option key={id} value={id}>
                      {b.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {(categoryFilter !== "ALL" ||
              subcategoryFilter !== "ALL" ||
              brandFilter !== "ALL" ||
              search !== "") && (
              <button
                className="filter-button"
                onClick={() => {
                  setCategoryFilter("ALL");
                  setSubcategoryFilter("ALL");
                  setBrandFilter("ALL");
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
              { id: "ALL", label: "All Items", count: counts.total },
              { id: "HOT_DEALS", label: "🔥 Hot Deals", count: hotDealsList.length },
              { id: "APPROVED", label: "Active", count: counts.approved },
              { id: "PENDING", label: "Pending", count: counts.pending },
              { id: "INACTIVE", label: "Deactivated", count: counts.inactive },
              { id: "REJECTED", label: "Rejected", count: counts.rejected },
            ].map((s) => (
              <button
                key={s.id}
                className={`filter-tab ${statusFilter === s.id ? "active" : ""}`}
                onClick={() => setStatusFilter(s.id)}
              >
                <span>{s.label}</span>
                <span className="filter-badge">{s.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bulk-actions-bar">
            <div className="bulk-left">
              <strong>{selectedIds.length}</strong> products selected
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

        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading products catalog from backend...</p>
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
                        filteredProducts.length > 0 &&
                        selectedIds.length === filteredProducts.length
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Product Listing</th>
                  <th>Brand & Lineage</th>
                  <th>Seller / Merchant</th>
                  <th>Unit Price</th>
                  <th>MOQ / Stock</th>
                  <th>Status</th>
                  <th>Live Activation</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-table">
                      <div className="empty-table-content">
                        <Package size={40} className="empty-icon" />
                        <h3>No products found</h3>
                        <p>{search ? `No products matching "${search}"` : "Click Add New Product to list items."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const status = getStatus(product);
                    const id = product.productId || product.id || product._id;
                    const isSelected = selectedIds.some((sid) => String(sid) === String(id));
                    const isActive = product.active !== false && (status === "APPROVED" || status === "ACTIVE");

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
                              <strong className="user-primary-name">
                                {product.name || product.title}
                              </strong>
                              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                                <span className="sku-tag font-mono">
                                  SKU: {product.sku || "—"}
                                </span>
                                {(() => {
                                  const hdItem = hotDealsList.find(
                                    (hd) => Number(hd.productId) === Number(id)
                                  );
                                  return hdItem ? (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: 800,
                                        color: "#ea580c",
                                        background: "#fff7ed",
                                        border: "1px solid #ffedd5",
                                        borderRadius: "4px",
                                        padding: "1px 6px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "3px",
                                      }}
                                    >
                                      🔥 Hot Deal #{hdItem.displayOrder}
                                    </span>
                                  ) : null;
                                })()}
                                {product.is24HourDelivery && (
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      color: "#047857",
                                      background: "#ecfdf5",
                                      border: "1px solid #a7f3d0",
                                      borderRadius: "4px",
                                      padding: "1px 5px",
                                    }}
                                  >
                                    ⚡ 24h Delivery
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                            <strong style={{ fontSize: "12.5px", color: "#0f172a" }}>
                              {product.brandName || product.brand || "Standard Brand"}
                            </strong>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10.5px", color: "#64748b" }}>
                              <span>{product.categoryName || product.category || "Civil"}</span>
                              <ChevronRight size={10} style={{ color: "#94a3b8" }} />
                              <span style={{ color: "#b45309", fontWeight: 600 }}>{product.subcategoryName || "Rebars"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="seller-subtext">
                            <Store size={13} />
                            <span>{product.seller?.name || product.sellerName || "Direct Supplier"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="category-pill-tag">
                            {product.category?.name || product.category || "General"}
                          </span>
                        </td>
                        <td>
                          <strong className="amount-cell font-mono">
                            ₹{Number(product.price ?? product.basePrice ?? 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <div className="moq-stock-cell">
                            <span>MOQ: <strong>{product.moq || 1}</strong></span>
                            <span className={`stock-badge ${Number(product.stock || 0) < 20 ? "low" : ""}`}>
                              {product.stock || 0} in stock
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge-glow status-${status.toLowerCase()}`}>
                            <span className="status-dot"></span>
                            {status === "APPROVED" || status === "ACTIVE"
                              ? "Active"
                              : status === "PENDING"
                              ? "Pending"
                              : status === "INACTIVE"
                              ? "Deactivated"
                              : "Rejected"}
                          </span>
                        </td>
                        <td>
                          {/* Live Activate / Deactivate Toggle Switch */}
                          <div
                            className="toggle-container"
                            title={
                              status === "PENDING"
                                ? "Click to Approve & Activate"
                                : isActive
                                ? "Click to Deactivate"
                                : "Click to Activate"
                            }
                          >
                            <label className="switch">
                              <input
                                type="checkbox"
                                checked={isActive}
                                disabled={status === "REJECTED"}
                                onChange={() => handleToggleActivate(product)}
                              />
                              <span className="slider round"></span>
                            </label>
                            <span className="toggle-label-text">
                              {isActive ? "Active" : "Off"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div
                            className="action-buttons"
                            style={{ justifyContent: "flex-end" }}
                          >
                            <button
                              className="btn-table-action view"
                              title="Dynamic Popup View"
                              onClick={() => setSelectedProduct(product)}
                            >
                              <Eye size={13} /> VIEW
                            </button>

                            {/* Quick Hot Deals Toggle Button */}
                            {(() => {
                              const hdItem = hotDealsList.find(
                                (hd) => Number(hd.productId) === Number(id)
                              );
                              return (
                                <button
                                  className="icon-action"
                                  style={{
                                    color: hdItem ? "#ea580c" : "#94a3b8",
                                    background: hdItem ? "#fff7ed" : undefined,
                                    borderColor: hdItem ? "#fed7aa" : undefined,
                                  }}
                                  title={
                                    hdItem
                                      ? `In Hot Deals (Order #${hdItem.displayOrder}) - Click to remove`
                                      : "Feature in Hot Deals"
                                  }
                                  onClick={async () => {
                                    if (hdItem) {
                                      try {
                                        await deleteHotDeal(hdItem.id);
                                        setHotDealsList((prev) => prev.filter((d) => d.id !== hdItem.id));
                                        toast.info(`Removed "${product.name || product.title}" from Hot Deals`);
                                      } catch {
                                        toast.error("Failed to remove from Hot Deals");
                                      }
                                    } else {
                                      try {
                                        const created = await addHotDeal({
                                          productId: id,
                                          productDetails: product,
                                        });
                                        setHotDealsList((prev) => [...prev, created]);
                                        toast.success(`"${product.name || product.title}" added to Hot Deals!`);
                                      } catch (err) {
                                        toast.error(err.message || "Failed to add to Hot Deals");
                                      }
                                    }
                                  }}
                                >
                                  <Flame size={14} />
                                </button>
                              );
                            })()}

                            <button
                              className="icon-action"
                              title="Dynamic Edit Popup"
                              onClick={() => handleOpenEdit(product)}
                            >
                              <Edit2 size={14} />
                            </button>

                            {status === "PENDING" && (
                              <>
                                <button
                                  className="icon-action success"
                                  title="Approve Product"
                                  onClick={() => handleApprove(product)}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  className="icon-action danger"
                                  title="Reject Product"
                                  onClick={() => handleReject(product)}
                                >
                                  <X size={14} />
                                </button>
                              </>
                            )}

                            <button
                              className="icon-action danger"
                              title="Delete Product"
                              onClick={() => handleDelete(product)}
                            >
                              <Trash2 size={14} />
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

        {/* =========================================================================
            TRADITIONAL NUMBERED PAGINATION TOOLBAR (OPTION A)
            ========================================================================= */}
        <div className="products-pagination-toolbar">
          <div className="pagination-left-section">
            <div className="pagination-count-info">
              Showing <strong>{pagination.totalCount > 0 ? (page - 1) * limit + 1 : 0}</strong> –{" "}
              <strong>{Math.min(page * limit, pagination.totalCount)}</strong> of{" "}
              <strong>{pagination.totalCount}</strong> products
            </div>

            <div className="pagination-page-size-picker">
              <span className="page-size-label">Rows per page:</span>
              <select
                className="page-size-select"
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  setPage(1);
                }}
                disabled={loading}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="pagination-right-section">
            <div className="pagination-nav-group">
              {/* First Page button */}
              <button
                type="button"
                className="pagination-btn icon-btn"
                title="First Page"
                disabled={page <= 1 || loading}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft size={16} />
              </button>

              {/* Previous Page button */}
              <button
                type="button"
                className="pagination-btn"
                title="Previous Page"
                disabled={!pagination.hasPrevPage || page <= 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              {/* Page Numbers */}
              <div className="pagination-pages-list">
                {getPageNumbers(page, pagination.totalPages).map((pNum, idx) => {
                  if (pNum === "...") {
                    return (
                      <span key={`dots-${idx}`} className="pagination-ellipsis">
                        …
                      </span>
                    );
                  }
                  const isActive = pNum === page;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      className={`pagination-btn page-num-btn ${isActive ? "active" : ""}`}
                      onClick={() => setPage(pNum)}
                      disabled={loading}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page button */}
              <button
                type="button"
                className="pagination-btn"
                title="Next Page"
                disabled={!pagination.hasNextPage || page >= pagination.totalPages || loading}
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>

              {/* Last Page button */}
              <button
                type="button"
                className="pagination-btn icon-btn"
                title="Last Page"
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage(pagination.totalPages)}
              >
                <ChevronsRight size={16} />
              </button>
            </div>

            {/* Quick Jump Input */}
            {pagination.totalPages > 5 && (
              <form
                className="pagination-jump-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = parseInt(jumpPageInput, 10);
                  if (!isNaN(target) && target >= 1 && target <= pagination.totalPages) {
                    setPage(target);
                    setJumpPageInput("");
                  }
                }}
              >
                <span className="jump-label">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={pagination.totalPages}
                  placeholder={String(page)}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  className="jump-input"
                />
                <button type="submit" className="jump-btn" disabled={!jumpPageInput || loading}>
                  Go
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          PREMIUM DYNAMIC POPUP MODAL 1: VIEW PRODUCT DETAILS
          ========================================================================= */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 780 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Dark Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box">
                  <Eye size={20} />
                </div>
                <div className="header-texts">
                  <h2>{selectedProduct.name}</h2>
                  <p>
                    SKU: <strong style={{ color: "#fbbf24" }}>{selectedProduct.sku || "—"}</strong> &nbsp;•&nbsp;
                    Brand: <strong>{selectedProduct.brand || "TATA / Standard"}</strong> &nbsp;•&nbsp;
                    <span
                      className={`status-badge-glow status-${getStatus(selectedProduct).toLowerCase()}`}
                      style={{ fontSize: 10.5 }}
                    >
                      <span className="status-dot"></span>
                      {getStatus(selectedProduct)}
                    </span>
                  </p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setSelectedProduct(null)}>×</button>
            </div>

            {/* Luxury Body */}
            <div className="luxury-modal-body">
              {/* Hero Image + Price Section */}
              <div className="form-section-card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex" }}>
                  <div style={{ width: 180, height: 180, background: "#0f172a", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img
                      src={selectedProduct.image || (selectedProduct.images && selectedProduct.images[0]) || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60"}
                      alt={selectedProduct.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60";
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                      <div>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.8 }}>Wholesale Unit Price</span>
                        <strong className="font-mono" style={{ display: "block", fontSize: 28, color: "#0f172a", lineHeight: 1.1 }}>
                          ₹{Number(selectedProduct.price ?? selectedProduct.basePrice ?? 0).toLocaleString("en-IN")}
                        </strong>
                      </div>
                      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "#fef3c7", borderRadius: 6 }}>
                        <Lock size={11} style={{ color: "#d97706" }} />
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: "#92400e" }}>Price Protected</span>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>MOQ</span>
                        <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedProduct.moq || "1 Unit"}</strong>
                      </div>
                      <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Stock</span>
                        <strong style={{ display: "block", fontSize: 13, color: "#059669" }}>{selectedProduct.stock || selectedProduct.inventory || "50"}</strong>
                      </div>
                      <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>GST</span>
                        <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedProduct.gst || "18%"}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Specs Grid */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <FileText size={14} /> Product Classification & Merchant Details
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Product Category</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {selectedProduct.category?.name || selectedProduct.category || "General"}
                    </div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Subcategory</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {selectedProduct.subcategoryName || "Industrial Component"}
                    </div>
                  </div>
                  <div className="input-field-wrap">
                    <label>URL Slug</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#2563eb" }}>
                      /{selectedProduct.slug || slugify(selectedProduct.name || "")}
                    </div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Base Unit</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {selectedProduct.unit || "unit"}
                    </div>
                  </div>
                  <div className="input-field-wrap">
                    <label>HSN Code</label>
                    <div className="font-mono" style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                      {selectedProduct.hsn || "7214"}
                    </div>
                  </div>
                  <div className="input-field-wrap">
                    <label>Supplying Merchant</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                      <Store size={14} style={{ color: "#f59e0b" }} />
                      {selectedProduct.seller?.name || selectedProduct.sellerName || "Direct Supplier"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Specifications Matrix */}
              {selectedProduct.specifications && Object.keys(selectedProduct.specifications).length > 0 && (
                <div className="form-section-card">
                  <div className="section-card-title">
                    <SlidersHorizontal size={14} style={{ color: "#d97706" }} /> Category Technical Specifications
                  </div>
                  <div className="luxury-form-grid">
                    {Object.entries(selectedProduct.specifications).map(([key, val]) => (
                      <div key={key} className="input-field-wrap">
                        <label>{key}</label>
                        <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                          {String(val || "—")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Sparkles size={14} /> Technical Specifications & Overview
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", margin: 0 }}>
                  {selectedProduct.description ||
                    "Industrial-grade component manufactured according to standard compliance specifications. Tested for tensile durability, chemical compatibility, and rigorous commercial applications."}
                </p>
              </div>

              {/* Live Status Toggle */}
              <div className="form-section-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: 13, color: "#0f172a", display: "block" }}>Marketplace Catalog Visibility</strong>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>Toggle live buyer accessibility for this SKU</span>
                </div>
                <div className="toggle-container">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={selectedProduct.active !== false && getStatus(selectedProduct) === "APPROVED"}
                      disabled={getStatus(selectedProduct) === "REJECTED"}
                      onChange={() => handleToggleActivate(selectedProduct)}
                    />
                    <span className="slider round"></span>
                  </label>
                  <span className="toggle-label-text">
                    {selectedProduct.active !== false && getStatus(selectedProduct) === "APPROVED" ? "Active" : "Off"}
                  </span>
                </div>
              </div>
            </div>

            {/* Luxury Footer */}
            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }}
                onClick={() => handleDelete(selectedProduct)}
              >
                <Trash2 size={13} /> Delete SKU
              </button>
              <div className="footer-action-buttons">
                <button className="btn-luxury-cancel" onClick={() => setSelectedProduct(null)}>
                  Close
                </button>
                <button
                  className="btn-luxury-submit"
                  onClick={() => {
                    handleOpenEdit(selectedProduct);
                    setSelectedProduct(null);
                  }}
                >
                  <Edit2 size={14} /> Edit Specifications
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PREMIUM DYNAMIC POPUP MODAL 2: ADD / EDIT PRODUCT (LUXURY REDESIGN)
          ========================================================================= */}
      {(showAddModal || editModalProduct) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setEditModalProduct(null);
          }}
        >
          <div
            className="product-form-modal-luxury modal-animated"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Dark Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box">
                  <Package size={20} />
                </div>
                <div className="header-texts">
                  <h2>{editModalProduct ? "Edit Product SKU Specifications" : "Add New Marketplace Product"}</h2>
                  <p>{editModalProduct ? `Editing: ${editModalProduct.name}` : "Submit a new B2B product listing to the marketplace catalog"}</p>
                </div>
              </div>
              <button
                className="header-close-btn"
                onClick={() => {
                  setShowAddModal(false);
                  setEditModalProduct(null);
                }}
              >
                ×
              </button>
            </div>

            {/* Luxury Body */}
            <form onSubmit={handleSaveProduct}>
              <div className="luxury-modal-body">
                {/* Section 1: 4-Tier Hierarchy Mapping */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <Building2 size={14} /> 4-Tier Catalog Hierarchy Mapping
                  </div>
                  <div className="luxury-form-grid three-col">
                    {/* Tier 1: Category */}
                    <div className="input-field-wrap">
                      <label>1. Category <span className="required-star">*</span></label>
                      <select
                        required
                        value={formData.categoryId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newCatId = val ? (!isNaN(Number(val)) ? Number(val) : val) : "";
                          setFormData((prev) => ({
                            ...prev,
                            categoryId: newCatId,
                            subcategoryId: "",
                            brandId: "",
                            brand: "",
                            brandName: "",
                          }));
                          setShowQuickAddBrand(false);
                          setQuickBrandName("");
                        }}
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map((c) => {
                          const id = c.categoryId || c.id;
                          return (
                            <option key={id} value={id}>
                              {c.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Tier 2: Subcategory */}
                    <div className="input-field-wrap">
                      <label>2. Subcategory <span className="required-star">*</span></label>
                      <select
                        required
                        disabled={!formData.categoryId}
                        value={formData.subcategoryId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newSubId = val ? (!isNaN(Number(val)) ? Number(val) : val) : "";
                          setFormData((prev) => ({
                            ...prev,
                            subcategoryId: newSubId,
                            brandId: "",
                            brand: "",
                            brandName: "",
                          }));
                          setShowQuickAddBrand(false);
                          setQuickBrandName("");
                        }}
                      >
                        <option value="">-- Select Subcategory --</option>
                        {availableModalSubcategories.map((s) => {
                          const id = s.subcategoryId || s.id;
                          return (
                            <option key={id} value={id}>
                              {s.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Tier 3: Brand */}
                    <div className="input-field-wrap">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <label style={{ margin: 0 }}>3. Brand <span className="required-star">*</span></label>
                        {formData.subcategoryId && (
                          <button
                            type="button"
                            onClick={() => setShowQuickAddBrand(!showQuickAddBrand)}
                            style={{
                              fontSize: 11,
                              color: "#2563eb",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: 700,
                              padding: 0,
                            }}
                          >
                            {showQuickAddBrand ? "Cancel" : "+ New Brand"}
                          </button>
                        )}
                      </div>
                      <select
                        required
                        disabled={!formData.subcategoryId}
                        value={formData.brandId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newBrandId = val ? (!isNaN(Number(val)) ? Number(val) : val) : "";
                          const chosenBrand = brands.find(
                            (b) => String(b.brandId || b.id) === String(val)
                          );
                          setFormData((prev) => ({
                            ...prev,
                            brandId: newBrandId,
                            brand: chosenBrand?.name || "",
                            brandName: chosenBrand?.name || "",
                          }));
                        }}
                      >
                        <option value="">-- Select Brand --</option>
                        {availableModalBrands.map((b) => {
                          const id = b.brandId || b.id;
                          return (
                            <option key={id} value={id}>
                              {b.name}
                            </option>
                          );
                        })}
                      </select>

                      {showQuickAddBrand && (
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                          <input
                            type="text"
                            placeholder="Brand name (e.g. JSW Steel)"
                            value={quickBrandName}
                            onChange={(e) => setQuickBrandName(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "6px 10px",
                              fontSize: 12,
                              borderRadius: 6,
                              border: "1px solid #cbd5e1",
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleQuickCreateBrand();
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={creatingBrand || !quickBrandName.trim()}
                            onClick={handleQuickCreateBrand}
                            style={{
                              padding: "6px 12px",
                              fontSize: 12,
                              fontWeight: 700,
                              background: "#2563eb",
                              color: "#fff",
                              borderRadius: 6,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            {creatingBrand ? "Adding..." : "Add"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Core Product Identity */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <Tag size={14} /> Product Identity
                  </div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap full-width">
                      <label>Product Title / Description <span className="required-star">*</span></label>
                      <input
                        required
                        placeholder="e.g. Tata Tiscon 550D TMT Rebar (12mm)"
                        value={formData.name}
                        onChange={handleNameChange}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>URL Slug <span className="required-star">*</span></label>
                      <input
                        required
                        placeholder="e.g. tata-tiscon-550d-tmt-rebar-12mm"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                      />
                      <small className="field-hint">Auto-generated SEO identifier for product URL</small>
                    </div>
                    <div className="input-field-wrap">
                      <label>SKU Code <span className="required-star">*</span></label>
                      <input
                        required
                        placeholder="TATA-TMT-12MM-550D"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Pricing & Inventory */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <IndianRupee size={14} /> Pricing & Inventory
                  </div>
                  <div className="luxury-form-grid three-col">
                    <div className="input-field-wrap">
                      <label>Price in INR (₹) <span className="required-star">*</span></label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="54200.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>Unit <span className="required-star">*</span></label>
                      <select
                        required
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      >
                        {STANDARD_UNITS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.label}
                          </option>
                        ))}
                        {formData.unit && !STANDARD_UNITS.some((u) => u.value === formData.unit) && (
                          <option value={formData.unit}>{formData.unit}</option>
                        )}
                      </select>
                    </div>
                    <div className="input-field-wrap">
                      <label>Minimum Order Quantity</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={formData.moq}
                        onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>Available Stock Inventory</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="100"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value, stockQty: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>HSN Code</label>
                      <input
                        placeholder="7214"
                        value={formData.hsn}
                        onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>GST Rate</label>
                      <select
                        value={formData.gst}
                        onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                      >
                        <option value="5%">5% GST</option>
                        <option value="12%">12% GST</option>
                        <option value="18%">18% GST</option>
                        <option value="28%">28% GST</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="modal24hDelivery"
                      checked={Boolean(formData.is24HourDelivery)}
                      onChange={(e) => setFormData({ ...formData, is24HourDelivery: e.target.checked })}
                      style={{ width: "16px", height: "16px", accentColor: "#d97706" }}
                    />
                    <label htmlFor="modal24hDelivery" style={{ fontSize: "12.5px", fontWeight: 700, color: "#0f172a", cursor: "pointer" }}>
                      ⚡ Enable 24-Hour Express Logistics Delivery for this product
                    </label>
                  </div>
                </div>

                {/* Section 4: Product Image Upload */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <ImageIcon size={14} /> Product Imagery
                  </div>
                  <div className="image-upload-component-wrap">
                    {/* Tab strip */}
                    <div className="upload-nav-strip">
                      <div className="upload-tab-buttons">
                        <button
                          type="button"
                          className={`upload-tab-btn ${imageUploadMode === "upload" ? "active" : ""}`}
                          onClick={() => setImageUploadMode("upload")}
                        >
                          <Upload size={13} /> Upload File
                        </button>
                        <button
                          type="button"
                          className={`upload-tab-btn ${imageUploadMode === "url" ? "active" : ""}`}
                          onClick={() => setImageUploadMode("url")}
                        >
                          <Link size={13} /> Cloud URL
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Upload */}
                    {imageUploadMode === "upload" && (
                      <div className="product-upload-mode-wrap">
                        {formData.image ? (
                          <div className="uploaded-preview-banner">
                            <div className="preview-banner-left">
                              <img
                                src={formData.image}
                                alt="Product preview"
                                className="preview-banner-img"
                              />
                              <div className="preview-banner-details">
                                <strong>{formData.imageName || "Product Artwork Attached"}</strong>
                                <span>Optimized & Ready for Catalog</span>
                              </div>
                            </div>
                            <div className="preview-banner-actions">
                              <button
                                type="button"
                                className="btn-replace-photo"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Upload size={13} /> Change
                              </button>
                              <button
                                type="button"
                                className="btn-remove-photo"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    image: "",
                                    imageUrl: "",
                                    imageURL: "",
                                    images: [],
                                    imageName: "",
                                    imageKey: "",
                                  }))
                                }
                              >
                                <Trash2 size={13} /> Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`upload-dropzone-interactive upload-dropzone-fixed ${isDragOver ? "drag-active" : ""} ${uploadingImage ? "disabled" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); if (!uploadingImage) setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => !uploadingImage && fileInputRef.current?.click()}
                            style={{ pointerEvents: uploadingImage ? "none" : "auto" }}
                          >
                            <div className="dropzone-icon-circle">
                              {uploadingImage ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                            </div>
                            <span className="dropzone-main-text">{uploadingImage ? "Uploading to S3 Cloud Storage..." : "Click to Upload or Drag & Drop"}</span>
                            <span className="dropzone-sub-text">{uploadingImage ? "Please wait while image is stored..." : "Any format & resolution supported (JPG, PNG, WebP, GIF, SVG) — No size limit"}</span>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          style={{ display: "none" }}
                          disabled={uploadingImage}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                    )}


                    {/* Mode 3: URL */}
                    {imageUploadMode === "url" && (
                      <div className="input-field-wrap">
                        <label>Image URL</label>
                        <input
                          placeholder="https://images.unsplash.com/photo-..."
                          value={formData.image}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              image: e.target.value,
                              imageUrl: e.target.value,
                              imageURL: e.target.value,
                              images: e.target.value ? [e.target.value] : [],
                              imageName: "web_linked_image.jpg",
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 5: Category Dynamic Specifications (Master Schema) */}
                <div className="form-section-card">
                  <div className="section-card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <SlidersHorizontal size={14} style={{ color: "#d97706" }} /> Category Technical Specifications
                    </div>
                    {categorySpecs.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fef3c7", padding: "2px 8px", borderRadius: 10 }}>
                        {categorySpecs.length} Mapped Attributes
                      </span>
                    )}
                  </div>

                  {!formData.categoryId ? (
                    <div style={{ padding: "14px", background: "#f8fafc", borderRadius: 8, textAlign: "center", color: "#64748b", fontSize: 12.5 }}>
                      Select a <strong>Category</strong> in Step 1 to load mapped technical specification fields.
                    </div>
                  ) : loadingCategorySpecs ? (
                    <div style={{ padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#64748b", fontSize: 12.5 }}>
                      <Loader2 size={16} className="animate-spin" /> Loading category specification schema...
                    </div>
                  ) : categorySpecs.length === 0 ? (
                    <div style={{ padding: "14px", background: "#f8fafc", borderRadius: 8, textAlign: "center", color: "#64748b", fontSize: 12.5 }}>
                      No master specifications mapped for this category. (Configure under Specifications menu).
                    </div>
                  ) : (
                    <div className="luxury-form-grid">
                      {categorySpecs.map((spec) => {
                        const specKey = spec.key || spec.name;
                        const specValue = productSpecs[specKey] ?? productSpecs[spec.name] ?? "";
                        const optionsList = Array.isArray(spec.options)
                          ? spec.options.map((opt) => (typeof opt === "object" && opt !== null ? (opt.optionValue || opt.value) : String(opt)))
                          : [];

                        const handleSpecValChange = (newVal) => {
                          setProductSpecs((prev) => ({
                            ...prev,
                            [specKey]: newVal,
                            [spec.name]: newVal,
                          }));
                        };

                        return (
                          <div key={spec.id || spec.mappingId || spec.name} className="input-field-wrap">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <label style={{ margin: 0 }}>
                                {spec.name} {spec.required && <span className="required-star">*</span>}
                              </label>
                              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                {spec.unit && (
                                  <span style={{ fontSize: 10, background: "#e0f2fe", color: "#0369a1", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>
                                    {spec.unit}
                                  </span>
                                )}
                                <span style={{ fontSize: 10, background: "#f1f5f9", color: "#475569", padding: "1px 5px", borderRadius: 4 }}>
                                  {spec.inputType}
                                </span>
                              </div>
                            </div>

                            {spec.inputType === "DROPDOWN" ? (
                              <select
                                required={spec.required}
                                value={specValue}
                                onChange={(e) => handleSpecValChange(e.target.value)}
                              >
                                <option value="">-- Select {spec.name} --</option>
                                {optionsList.map((optVal, oIdx) => (
                                  <option key={oIdx} value={optVal}>
                                    {optVal}
                                  </option>
                                ))}
                              </select>
                            ) : spec.inputType === "NUMBER" ? (
                              <div style={{ position: "relative" }}>
                                <input
                                  type="number"
                                  step="any"
                                  required={spec.required}
                                  placeholder={spec.unit ? `e.g. 500 (${spec.unit})` : "Enter number..."}
                                  value={specValue}
                                  onChange={(e) => handleSpecValChange(e.target.value)}
                                />
                                {spec.unit && (
                                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#94a3b8", fontWeight: 600, pointerEvents: "none" }}>
                                    {spec.unit}
                                  </span>
                                )}
                              </div>
                            ) : spec.inputType === "BOOLEAN" ? (
                              <select
                                required={spec.required}
                                value={specValue}
                                onChange={(e) => handleSpecValChange(e.target.value)}
                              >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes / True</option>
                                <option value="No">No / False</option>
                              </select>
                            ) : spec.inputType === "MULTI_SELECT" ? (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "6px 8px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, minHeight: 38 }}>
                                {optionsList.map((optVal, oIdx) => {
                                  const selectedArray = Array.isArray(specValue) ? specValue : (specValue ? String(specValue).split(",").map((s) => s.trim()) : []);
                                  const isSel = selectedArray.includes(optVal);
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() => {
                                        let next;
                                        if (isSel) {
                                          next = selectedArray.filter((v) => v !== optVal);
                                        } else {
                                          next = [...selectedArray, optVal];
                                        }
                                        handleSpecValChange(next.join(", "));
                                      }}
                                      style={{
                                        fontSize: 11.5,
                                        padding: "2px 8px",
                                        borderRadius: 12,
                                        border: isSel ? "1px solid #d97706" : "1px solid #e2e8f0",
                                        background: isSel ? "#fef3c7" : "#f8fafc",
                                        color: isSel ? "#b45309" : "#475569",
                                        fontWeight: isSel ? 700 : 500,
                                        cursor: "pointer",
                                      }}
                                    >
                                      {optVal} {isSel ? "✓" : "+"}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <input
                                type="text"
                                required={spec.required}
                                placeholder={spec.unit ? `Value in ${spec.unit}...` : `Enter ${spec.name}...`}
                                value={specValue}
                                onChange={(e) => handleSpecValChange(e.target.value)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 6: Description */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <FileText size={14} /> Technical Description
                  </div>
                  <div className="input-field-wrap">
                    <textarea
                      rows={3}
                      placeholder="Enter structural specs, tolerances, grade certification, chemical composition..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Section 6: Initial Status */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <CheckCircle2 size={14} /> Approval & Visibility Status
                  </div>
                  <div className="input-field-wrap" style={{ maxWidth: 320 }}>
                    <select
                      value={formData.status || "PENDING"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value,
                          active: e.target.value === "APPROVED" || e.target.value === "ACTIVE",
                        })
                      }
                    >
                      <option value="PENDING">⏳ Pending Approval Review</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Luxury Footer */}
              <div className="luxury-modal-footer">
                <div className="footer-tip-text">
                  <ShieldCheck size={13} /> All fields auto-validated before submission
                </div>
                <div className="footer-action-buttons">
                  <button
                    type="button"
                    className="btn-luxury-cancel"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditModalProduct(null);
                    }}
                    disabled={uploadingImage}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-luxury-submit" disabled={uploadingImage}>
                    {uploadingImage ? (
                      <><Loader2 size={14} className="animate-spin" /> Uploading Image...</>
                    ) : editModalProduct ? (
                      <><CheckCircle2 size={14} /> Save Changes</>
                    ) : (
                      <><Plus size={14} /> Create Product</>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PREMIUM MODAL 3: ADD PRODUCT ON BEHALF OF SELLER (ASSISTED SELLER CATALOG)
          POST /api/admin/products/sellers/{sellerId}
          ========================================================================= */}
      {showAddForSellerModal && (
        <div className="modal-overlay" onClick={() => setShowAddForSellerModal(false)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 860 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Header with Indigo/Store Theme */}
            <div className="luxury-modal-header" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)" }}>
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#ffffff" }}>
                  <Store size={20} />
                </div>
                <div className="header-texts">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2>Add Product on Behalf of Seller</h2>
                    <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px", background: "#4338ca", color: "#e0e7ff", borderRadius: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Assisted Onboarding
                    </span>
                  </div>
                  <p>Publish a product directly into a merchant's store catalog (Auto-approved & instantly live on marketplace)</p>
                </div>
              </div>
              <button className="header-close-btn" onClick={() => setShowAddForSellerModal(false)}>×</button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveProductForSeller}>
              <div className="luxury-modal-body">
                {/* Section 1: Merchant & Store Selection */}
                <div className="form-section-card" style={{ borderLeft: "4px solid #6366f1" }}>
                  <div className="section-card-title" style={{ color: "#4f46e5" }}>
                    <Store size={14} /> Step 1: Assign to Merchant / Store <span className="required-star">*</span>
                  </div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap">
                      <label>Target Seller / Store <span className="required-star">*</span></label>
                      <select
                        required
                        value={sellerFormData.sellerId || ""}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, sellerId: e.target.value })}
                        style={{ borderColor: "#a5b4fc" }}
                      >
                        <option value="">-- Choose Merchant Store --</option>
                        {sellers.map((s) => {
                          const sId = s.sellerId || s.id;
                          const sName = s.companyName || s.name || s.businessName || `Seller #${sId}`;
                          const sOwner = s.name || s.ownerName || "";
                          return (
                            <option key={sId} value={sId}>
                              {sName} {sOwner ? `(${sOwner})` : ""} {s.city ? `• ${s.city}` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="input-field-wrap">
                      <label>Marketplace Catalog Scope</label>
                      <div style={{ padding: "9px 12px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: "#5b21b6", display: "flex", alignItems: "center", gap: 6 }}>
                        <Sparkles size={14} style={{ color: "#7c3aed" }} />
                        <span>Shared Globally Over All Verified Marketplace Stores</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: 4-Tier Global Catalog Hierarchy */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <Building2 size={14} /> Step 2: 4-Tier Catalog Hierarchy Mapping
                  </div>
                  <div className="luxury-form-grid three-col">
                    {/* Tier 1: Category */}
                    <div className="input-field-wrap">
                      <label>1. Category <span className="required-star">*</span></label>
                      <select
                        required
                        value={sellerFormData.categoryId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newCatId = val ? (!isNaN(Number(val)) ? Number(val) : val) : "";
                          setSellerFormData((prev) => ({
                            ...prev,
                            categoryId: newCatId,
                            subcategoryId: "",
                            brandId: "",
                            brandName: "",
                          }));
                        }}
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map((c) => {
                          const id = c.categoryId || c.id;
                          return (
                            <option key={id} value={id}>
                              {c.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Tier 2: Subcategory */}
                    <div className="input-field-wrap">
                      <label>2. Subcategory <span className="required-star">*</span></label>
                      <select
                        required
                        disabled={!sellerFormData.categoryId}
                        value={sellerFormData.subcategoryId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newSubId = val ? (!isNaN(Number(val)) ? Number(val) : val) : "";
                          setSellerFormData((prev) => ({
                            ...prev,
                            subcategoryId: newSubId,
                            brandId: "",
                            brandName: "",
                          }));
                        }}
                      >
                        <option value="">-- Select Subcategory --</option>
                        {availableSellerModalSubcategories.map((s) => {
                          const id = s.subcategoryId || s.id;
                          return (
                            <option key={id} value={id}>
                              {s.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Tier 3: Brand */}
                    <div className="input-field-wrap">
                      <label>3. Manufacturer Brand <span className="required-star">*</span></label>
                      <select
                        required
                        disabled={!sellerFormData.subcategoryId}
                        value={sellerFormData.brandId || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const bId = val ? (!isNaN(Number(val)) ? Number(val) : val) : "";
                          const matched = brands.find((b) => String(b.brandId || b.id) === String(val));
                          setSellerFormData((prev) => ({
                            ...prev,
                            brandId: bId,
                            brandName: matched?.name || "",
                          }));
                        }}
                      >
                        <option value="">-- Select Brand --</option>
                        {availableSellerModalBrands.map((b) => {
                          const id = b.brandId || b.id;
                          return (
                            <option key={id} value={id}>
                              {b.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Basic Info & SKU */}
                <div className="form-section-card">
                  <div className="section-card-title">
                    <Tag size={14} /> Step 3: Product Basic Info & Warehouse SKU
                  </div>
                  <div className="luxury-form-grid">
                    <div className="input-field-wrap full-width">
                      <label>Product Title / Name <span className="required-star">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ColorCraft Rose Pink Reactive Dye 1KG or Tata Tiscon 550D Rebar 12mm"
                        value={sellerFormData.title || sellerFormData.name || ""}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, title: e.target.value, name: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>Seller Warehouse SKU <span className="required-star">*</span></label>
                      <input
                        type="text"
                        required
                        className="font-mono"
                        placeholder="e.g. SKU-PINK-001"
                        value={sellerFormData.sku || ""}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, sku: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>B2B Unit of Measure <span className="required-star">*</span></label>
                      <select
                        value={sellerFormData.unit || "unit"}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, unit: e.target.value })}
                      >
                        <option value="MT">MT (Metric Ton)</option>
                        <option value="KG">KG (Kilogram)</option>
                        <option value="gram">Gram</option>
                        <option value="bag">Bag (e.g. 50kg)</option>
                        <option value="unit">Unit / Piece</option>
                        <option value="metre">Metre / RMT</option>
                        <option value="sq.ft">Sq. Feet</option>
                        <option value="box">Box / Carton</option>
                        <option value="bundle">Bundle / Roll</option>
                        <option value="drum">Drum / Cylinder</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 4: Pricing, MOQ & Inventory */}
                <div className="form-section-card">
                  <div className="section-card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <IndianRupee size={14} /> Step 4: Wholesale Price & Order Policies
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", background: "#ede9fe", padding: "2px 8px", borderRadius: 10 }}>
                      B2B Commercial Terms
                    </span>
                  </div>
                  <div className="luxury-form-grid four-col">
                    <div className="input-field-wrap">
                      <label>Wholesale Base Price (₹) <span className="required-star">*</span></label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="any"
                        placeholder="850.00"
                        value={sellerFormData.price}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, price: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>MRP (₹ Strike Price)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="977.00"
                        value={sellerFormData.mrp}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, mrp: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>MOQ (Min Order Qty) <span className="required-star">*</span></label>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="5"
                        value={sellerFormData.moq}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, moq: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>Available Stock <span className="required-star">*</span></label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="100"
                        value={sellerFormData.stockQty}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, stockQty: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="luxury-form-grid three-col" style={{ marginTop: 12 }}>
                    <div className="input-field-wrap">
                      <label>HSN Code</label>
                      <input
                        type="text"
                        className="font-mono"
                        placeholder="3204"
                        value={sellerFormData.hsn || "7214"}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, hsn: e.target.value })}
                      />
                    </div>
                    <div className="input-field-wrap">
                      <label>GST Slab</label>
                      <select
                        value={sellerFormData.gst || "18%"}
                        onChange={(e) => setSellerFormData({ ...sellerFormData, gst: e.target.value })}
                      >
                        <option value="0%">0% (Exempt)</option>
                        <option value="5%">5% GST</option>
                        <option value="12%">12% GST</option>
                        <option value="18%">18% GST</option>
                        <option value="28%">28% GST</option>
                      </select>
                    </div>
                    <div className="input-field-wrap" style={{ display: "flex", alignItems: "flex-end" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingBottom: 10 }}>
                        <input
                          type="checkbox"
                          checked={sellerFormData.is24HourDelivery}
                          onChange={(e) => setSellerFormData({ ...sellerFormData, is24HourDelivery: e.target.checked })}
                          style={{ width: 16, height: 16 }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#047857" }}>⚡ 24-Hour Express Dispatch</span>
                      </label>
                    </div>
                  </div>

                  {/* Progressive Volume Discount Tiers Builder */}
                  <div className="tiers-builder-card">
                    <div className="tiers-builder-header">
                      <span>
                        <Sparkles size={14} style={{ color: "#9333ea" }} /> Dynamic Volume Discount Tiers (B2B Slabs)
                      </span>
                      <button
                        type="button"
                        className="btn-add-spec-row"
                        onClick={handleAddSellerTierRow}
                        style={{ color: "#7c3aed", borderColor: "#c4b5fd" }}
                      >
                        <Plus size={12} /> Add Tier Slab
                      </button>
                    </div>

                    <div className="tier-rows-grid">
                      {sellerTierRows.map((tier, idx) => {
                        const baseP = parseFloat(sellerFormData.price) || 0;
                        const discountedPrice = baseP > 0 ? (baseP * (1 - (tier.discountPercentage || 0) / 100)).toFixed(2) : "0.00";
                        return (
                          <div key={tier.id || idx} className="tier-row-item">
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Qty ≥</span>
                              <input
                                type="number"
                                min="1"
                                placeholder="10"
                                value={tier.minQty}
                                onChange={(e) => handleUpdateSellerTierRow(tier.id, "minQty", e.target.value)}
                              />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Disc %</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                placeholder="5"
                                value={tier.discountPercentage}
                                onChange={(e) => handleUpdateSellerTierRow(tier.id, "discountPercentage", e.target.value)}
                              />
                            </div>
                            <div className="tier-calc-badge">
                              ₹{discountedPrice} /{sellerFormData.unit || "unit"} ({tier.discountPercentage}% OFF)
                            </div>
                            <button
                              type="button"
                              className="btn-remove-spec-row"
                              style={{ width: 30, height: 30 }}
                              onClick={() => handleRemoveSellerTierRow(tier.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Section 5: Media & Image Upload (Interactive Multi-Mode Studio) */}
                <div className="form-section-card">
                  <div className="section-card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ImageIcon size={14} /> Step 5: Primary Product Artwork (S3 Direct Storage)
                    </div>
                    {sellerFormData.image && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#047857", background: "#d1fae5", padding: "2px 8px", borderRadius: 10 }}>
                        ✓ Artwork Attached
                      </span>
                    )}
                  </div>

                  <div className="seller-upload-box">
                    {/* Interactive Tab Switcher */}
                    <div className="seller-upload-tabs">
                      <button
                        type="button"
                        className={`seller-upload-tab-btn ${sellerImageUploadMode === "upload" ? "active" : ""}`}
                        onClick={() => setSellerImageUploadMode("upload")}
                      >
                        <Upload size={13} /> Direct S3 File Upload
                      </button>
                      <button
                        type="button"
                        className={`seller-upload-tab-btn ${sellerImageUploadMode === "url" ? "active" : ""}`}
                        onClick={() => setSellerImageUploadMode("url")}
                      >
                        <Link size={13} /> Direct Cloud URL
                      </button>
                    </div>

                    {/* Mode 1: File Upload with Drag & Drop & Live Preview Card */}
                    {sellerImageUploadMode === "upload" && (
                      <div>
                        {sellerFormData.image ? (
                          <div className="seller-preview-banner">
                            <div className="seller-preview-left">
                              <img
                                src={sellerFormData.image}
                                alt="Seller Product Artwork"
                                className="seller-preview-img"
                              />
                              <div className="seller-preview-details">
                                <strong>High-Resolution Catalog Image</strong>
                                <span>Ready for S3 Cloud Storage & Store Showcase</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                className="btn-add-spec-row"
                                onClick={() => sellerFileInputRef.current?.click()}
                              >
                                <Upload size={12} /> Replace
                              </button>
                              <button
                                type="button"
                                className="btn-remove-spec-row"
                                onClick={() =>
                                  setSellerFormData((prev) => ({
                                    ...prev,
                                    image: "",
                                    imageUrl: "",
                                    imageURL: "",
                                    images: [],
                                  }))
                                }
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`seller-dropzone-interactive ${sellerIsDragOver ? "drag-active" : ""}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (!uploadingSellerImage) setSellerIsDragOver(true);
                            }}
                            onDragLeave={() => setSellerIsDragOver(false)}
                            onDrop={handleSellerDrop}
                            onClick={() => !uploadingSellerImage && sellerFileInputRef.current?.click()}
                          >
                            <div className="seller-dropzone-icon-circle">
                              {uploadingSellerImage ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
                            </div>
                            <strong style={{ fontSize: 13, color: "#1e1b4b" }}>
                              {uploadingSellerImage ? "Uploading Artwork to S3 Storage..." : "Click to Browse or Drag & Drop Product Image"}
                            </strong>
                            <span style={{ fontSize: 11.5, color: "#64748b" }}>
                              {uploadingSellerImage ? "Please wait..." : "Supported: JPEG, PNG, WebP, SVG (Lossless optimization applied)"}
                            </span>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={sellerFileInputRef}
                          accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          style={{ display: "none" }}
                          disabled={uploadingSellerImage}
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleSellerFileUpload(e.target.files[0]);
                          }}
                        />
                      </div>
                    )}


                    {/* Mode 3: Direct URL */}
                    {sellerImageUploadMode === "url" && (
                      <div className="input-field-wrap">
                        <label>Public HTTPS Image CDN Link</label>
                        <input
                          placeholder="https://images.unsplash.com/photo-..."
                          value={sellerFormData.image}
                          onChange={(e) =>
                            setSellerFormData((prev) => ({
                              ...prev,
                              image: e.target.value,
                              imageUrl: e.target.value,
                              imageURL: e.target.value,
                              images: e.target.value ? [e.target.value] : [],
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 6: Dynamic Technical Specifications Engine & Overview */}
                <div className="form-section-card">
                  <div className="section-card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={14} /> Step 6: Technical Specifications & Industrial Overview
                    </div>
                    <span className="spec-count-badge">
                      {sellerSpecRows.length} Attributes Defined
                    </span>
                  </div>

                  {/* Dynamic Key-Value Specifications Studio */}
                  <div className="spec-builder-container">
                    <div className="spec-builder-header">
                      <div className="spec-builder-header-left">
                        <strong>Technical Spec Matrix</strong>
                        <span style={{ fontSize: 11, color: "#64748b" }}>(Key / Value pairs shown on product listing)</span>
                      </div>
                      <button
                        type="button"
                        className="btn-add-spec-row"
                        onClick={() => handleAddSellerSpecRow("", "")}
                      >
                        <Plus size={12} /> Add Custom Spec
                      </button>
                    </div>

                    {/* Quick Preset Badges / Chips */}
                    <div className="spec-preset-chips-wrap">
                      <span className="spec-preset-label">Quick Add:</span>
                      {[
                        { label: "+ Grade / IS Code", key: "Grade / IS Code", val: "IS 1786 / Fe 550D" },
                        { label: "+ Material & Purity", key: "Material / Purity", val: "99.8% Commercial Pure" },
                        { label: "+ Packaging Type", key: "Packaging Type", val: "50kg Bags / Bundled" },
                        { label: "+ Tensile Strength", key: "Tensile Strength", val: "≥ 585 N/mm²" },
                        { label: "+ Country of Origin", key: "Country of Origin", val: "India" },
                        { label: "+ Certification", key: "Certifications", val: "ISO 9001 / BIS Certified" },
                        { label: "+ Shelf Life", key: "Shelf Life", val: "24 Months from MFG" },
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="spec-preset-chip"
                          onClick={() => handleAddSellerSpecRow(preset.key, preset.val)}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Active Specifications Rows */}
                    <div className="spec-rows-list">
                      {sellerSpecRows.map((spec) => (
                        <div key={spec.id} className="spec-row-item">
                          <input
                            type="text"
                            className="spec-key-input"
                            placeholder="Attribute (e.g. Grade)"
                            value={spec.key}
                            onChange={(e) => handleUpdateSellerSpecRow(spec.id, "key", e.target.value)}
                          />
                          <input
                            type="text"
                            className="spec-val-input"
                            placeholder="Specification Value (e.g. 550D Rebar)"
                            value={spec.value}
                            onChange={(e) => handleUpdateSellerSpecRow(spec.id, "value", e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn-remove-spec-row"
                            title="Remove Specification"
                            onClick={() => handleRemoveSellerSpecRow(spec.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Technical Overview Description */}
                  <div className="input-field-wrap" style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                        Industrial Overview & Application Notes
                      </label>
                      <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                        {(sellerFormData.description || "").length} characters
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Enter industrial grade, solubility, chemical composition, structural tolerances, usage instructions..."
                      value={sellerFormData.description || ""}
                      onChange={(e) => setSellerFormData({ ...sellerFormData, description: e.target.value })}
                      style={{ fontSize: 12.5, lineHeight: 1.5 }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="luxury-modal-footer">
                <div className="footer-tip-text" style={{ color: "#4f46e5" }}>
                  <ShieldCheck size={13} /> Product will be automatically approved and published into the merchant's store
                </div>
                <div className="footer-action-buttons">
                  <button
                    type="button"
                    className="btn-luxury-cancel"
                    onClick={() => setShowAddForSellerModal(false)}
                    disabled={uploadingSellerImage}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-luxury-submit"
                    style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", borderColor: "#4338ca" }}
                    disabled={uploadingSellerImage}
                  >
                    {uploadingSellerImage ? (
                      <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                    ) : (
                      <><Store size={14} /> Publish for Seller</>
                    )}
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
