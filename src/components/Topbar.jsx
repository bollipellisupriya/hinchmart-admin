import {
  LogOut,
  User,
  Bell,
  Clock,
  ChevronRight,
  CheckCircle2,
  Store,
  Package,
  FileText,
  ShoppingCart,
  Trash2,
  Check,
  Inbox,
  ShieldAlert,
  Search,
  Building2,
  Layers,
  Tag,
  X,
  ChevronDown,
  Shield,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "./ToastContext";
import { subscribeDataUpdate } from "../api/dataStore";
import { getStoredCategories } from "../api/categoryApi";
import { getStoredSubcategories } from "../api/subcategoryApi";
import { getStoredBrands } from "../api/brandApi";
import { getStoredProducts } from "../api/productApi";
import { getStoredBanners } from "../api/bannerApi";
import { logoutUser } from "../firebase/authService";
import { useAuth } from "../firebase/AuthContext";

const breadcrumbMap = {
  "/admin": "Dashboard",
  "/admin/dashboard": "Dashboard",
  "/admin/buyers": "Buyers Management",
  "/admin/sellers": "Sellers Management",
  "/admin/seller-approvals": "Seller Approvals",
  "/admin/seller-documents": "Seller Documents & KYC Vault",
  "/admin/categories": "Category Management",
  "/admin/subcategories": "Subcategories Management",
  "/admin/brands": "Brands Management",
  "/admin/specifications": "Specifications Management",
  "/admin/banners": "Banner Merchandising",
  "/admin/products": "Products Management",
  "/admin/product-approvals": "Product Approvals",
  "/admin/rfqs": "RFQs (Quotation Requests)",
  "/admin/orders": "Orders & Fulfillment",
  "/admin/invoices": "Invoices",
  "/admin/payments": "Payments",
  "/admin/shipments": "Shipments & Tracking",
  "/admin/reports": "Analytics & Reports",
  "/admin/settings": "System Settings",
};

export default function Topbar({
  pendingCounts = {},
  collapsed = false,
  setCollapsed = () => {},
  mobileOpen = false,
  onToggleMobileMenu = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { user: authUser, logout: authLogout } = useAuth();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | UNREAD
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dynamically resolve authenticated user details
  const currentUser = useMemo(() => {
    if (authUser) {
      const name = authUser.displayName || authUser.email?.split("@")[0] || "Admin";
      const email = authUser.email || "admin@hinchmart.com";
      return {
        displayName: name,
        email: email,
        uid: authUser.uid || "",
        initial: (name[0] || email[0] || "A").toUpperCase(),
      };
    }
    try {
      const raw = localStorage.getItem("adminUser");
      if (raw) {
        const parsed = JSON.parse(raw);
        const name = parsed.displayName || parsed.email?.split("@")[0] || "Admin";
        const email = parsed.email || "admin@hinchmart.com";
        return {
          displayName: name,
          email: email,
          uid: parsed.uid || "",
          initial: (name[0] || email[0] || "A").toUpperCase(),
        };
      }
    } catch {}
    return {
      displayName: "Admin User",
      email: "admin@hinchmart.com",
      uid: "",
      initial: "A",
    };
  }, [authUser]);

  // Global Dynamic Omni-Search State
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const searchBarRef = useRef(null);

  const globalSuggestions = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return [];

    const cats = getStoredCategories().filter((c) => (c.name || "").toLowerCase().includes(q)).slice(0, 2);
    const subs = getStoredSubcategories().filter((s) => (s.name || "").toLowerCase().includes(q)).slice(0, 2);
    const brands = (getStoredBrands() || []).filter((b) => b && ((b.name || "").toLowerCase().includes(q) || (b.slug || "").toLowerCase().includes(q))).slice(0, 3);
    const prods = getStoredProducts().filter((p) => (p.name || p.title || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q) || (p.brandName || p.brand || "").toLowerCase().includes(q)).slice(0, 3);
    const banners = getStoredBanners().filter((b) => (b.title || "").toLowerCase().includes(q) || (b.badge || "").toLowerCase().includes(q)).slice(0, 2);
    const bannerPage = "banners banner marketing merchandising campaigns video".includes(q)
      ? [{ type: "PAGE", title: "Banner Merchandising & Video Studio", subtitle: "Marketing Campaigns (/admin/banners)", link: "/admin/banners" }]
      : [];

    return [
      ...bannerPage,
      ...banners.map((b) => ({ type: "BANNER", title: b.title, subtitle: `${b.position || "HOME_VIDEO"} • ${b.badge || "Live Campaign"}`, link: "/admin/banners" })),
      ...brands.map((b) => ({ type: "BRAND", title: b.name, subtitle: `${b.categoryName || "Category"} › ${b.subcategoryName || "Subcategory"}`, link: `/admin/brands?search=${encodeURIComponent(b.name)}` })),
      ...prods.map((p) => ({ type: "PRODUCT", title: p.name || p.title, subtitle: `SKU: ${p.sku || "—"} • ${p.brandName || "Brand"}`, link: `/admin/products?search=${encodeURIComponent(p.name || p.title)}` })),
      ...subs.map((s) => ({ type: "SUBCATEGORY", title: s.name, subtitle: "Catalog Subcategory", link: `/admin/subcategories?search=${encodeURIComponent(s.name)}` })),
      ...cats.map((c) => ({ type: "CATEGORY", title: c.name, subtitle: "Catalog Category", link: `/admin/categories?search=${encodeURIComponent(c.name)}` })),
    ];
  }, [globalSearch]);

  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      title: "New Seller Registration",
      message: "Vortex Machinery applied for merchant account",
      time: "10m ago",
      read: false,
      type: "seller",
      link: "/admin/seller-approvals",
    },
    {
      id: "n2",
      title: "Pending Product Approval",
      message: "TMT Steel Rebars Fe 550D submitted by Tata Yard",
      time: "25m ago",
      read: false,
      type: "product",
      link: "/admin/product-approvals",
    },
    {
      id: "n3",
      title: "New High Value Order",
      message: "Order #ORD-2026-000501 for ₹6,34,260 placed",
      time: "1h ago",
      read: false,
      type: "order",
      link: "/admin/orders",
    },
    {
      id: "n4",
      title: "New RFQ Received",
      message: "G+14 Commercial Tower Project (100 MT Steel Rebars)",
      time: "2h ago",
      read: true,
      type: "rfq",
      link: "/admin/rfqs",
    },
  ]);

  // Real-time updates subscription
  useEffect(() => {
    const unsubscribe = subscribeDataUpdate((event) => {
      if (event.action === "CREATE") {
        let newNotif = null;
        if (event.entity === "products") {
          newNotif = {
            id: `notif_${Date.now()}`,
            title: "New Product Listing",
            message: `${event.data?.title || event.data?.name || "Product"} added to catalog`,
            time: "Just now",
            read: false,
            type: "product",
            link: "/admin/products",
          };
        } else if (event.entity === "orders") {
          newNotif = {
            id: `notif_${Date.now()}`,
            title: "New Order Placed",
            message: `Order #${event.data?.orderNumber || "ORD"} confirmed`,
            time: "Just now",
            read: false,
            type: "order",
            link: "/admin/orders",
          };
        } else if (event.entity === "rfqs") {
          newNotif = {
            id: `notif_${Date.now()}`,
            title: "New RFQ Inquiry",
            message: `${event.data?.title || "Bulk RFQ"} received`,
            time: "Just now",
            read: false,
            type: "rfq",
            link: "/admin/rfqs",
          };
        }
        if (newNotif) {
          setNotifications((prev) => [newNotif, ...prev]);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBarRef.current && !searchBarRef.current.contains(e.target)) {
        setGlobalSearchOpen(false);
      }
      setShowDropdown(false);
      setShowNotifications(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Quick keyboard shortcut "/" for omni-search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setGlobalSearchOpen(true);
        const inp = searchBarRef.current?.querySelector("input");
        if (inp) inp.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    toast.info("Logged out successfully");
    navigate("/login");
  };

  const markAllAsRead = (e) => {
    if (e) e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const clearNotifications = (e) => {
    if (e) e.stopPropagation();
    setNotifications([]);
    toast.info("All notifications cleared");
  };

  const dismissNotification = (id, e) => {
    if (e) e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNotificationClick = (n) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
    );
    setShowNotifications(false);
    if (n.link) navigate(n.link);
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const displayedNotifications = useMemo(() => {
    if (activeTab === "UNREAD") {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, activeTab]);

  const getNotifIcon = (type) => {
    switch (type) {
      case "seller":
        return <Store size={15} />;
      case "product":
        return <Package size={15} />;
      case "order":
        return <ShoppingCart size={15} />;
      case "rfq":
        return <FileText size={15} />;
      default:
        return <CheckCircle2 size={15} />;
    }
  };

  const currentPage = breadcrumbMap[location.pathname] || "Dashboard";

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return (
    <header className="topbar">
      <div className="topbar-content">
        {/* Left Section: Mobile Toggle & Breadcrumb */}
        <div className="topbar-left">
          {/* Mobile Navigation Drawer Toggle */}
          <button
            type="button"
            className="topbar-mobile-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMobileMenu();
            }}
            title={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Breadcrumb */}
          <div className="breadcrumb">
            <span className="breadcrumb-item" onClick={() => navigate("/admin")}>
              Admin
            </span>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-item current">{currentPage}</span>
          </div>
        </div>

        {/* Global Dynamic Omni-Search Bar */}
        <div
          ref={searchBarRef}
          className="topbar-omni-search"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#f8fafc",
              border: globalSearchOpen ? "1px solid #d97706" : "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "7px 12px",
              transition: "all 0.2s ease",
              boxShadow: globalSearchOpen ? "0 0 0 3px rgba(217, 119, 6, 0.15)" : "none",
            }}
          >
            <Search size={16} style={{ color: "#94a3b8", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Omni-Search: brands, products, categories..."
              value={globalSearch}
              onFocus={() => setGlobalSearchOpen(true)}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setGlobalSearchOpen(true);
              }}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: "12.5px",
                color: "#0f172a",
                width: "100%",
              }}
            />
            {globalSearch ? (
              <button
                type="button"
                onClick={() => {
                  setGlobalSearch("");
                  setGlobalSearchOpen(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: "14px",
                  padding: 0,
                  display: "flex",
                }}
              >
                <X size={14} />
              </button>
            ) : (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#94a3b8",
                  background: "#e2e8f0",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  letterSpacing: "0.5px",
                }}
              >
                /
              </span>
            )}
          </div>

          {/* Dynamic Suggestions Dropdown */}
          {globalSearchOpen && globalSearch.trim().length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                zIndex: 1000,
                overflow: "hidden",
                maxHeight: "360px",
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
                <span>GLOBAL SEARCH SUGGESTIONS</span>
                <span style={{ color: "#d97706" }}>{globalSuggestions.length} found</span>
              </div>

              {globalSuggestions.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "12.5px" }}>
                  No catalog items matching "{globalSearch}"
                </div>
              ) : (
                globalSuggestions.map((item, idx) => {
                  const getBadge = (t) => {
                    switch (t) {
                      case "BRAND":
                        return { bg: "#fef3c7", text: "#b45309", icon: <Building2 size={12} /> };
                      case "PRODUCT":
                        return { bg: "#eff6ff", text: "#1d4ed8", icon: <Package size={12} /> };
                      case "SUBCATEGORY":
                        return { bg: "#fdf4ff", text: "#a21caf", icon: <Layers size={12} /> };
                      case "CATEGORY":
                        return { bg: "#ecfdf5", text: "#047857", icon: <Tag size={12} /> };
                      default:
                        return { bg: "#f1f5f9", text: "#475569", icon: <Search size={12} /> };
                    }
                  };
                  const badge = getBadge(item.type);

                  return (
                    <div
                      key={`sug-${idx}`}
                      onClick={() => {
                        setGlobalSearchOpen(false);
                        navigate(item.link);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "9px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #f8fafc",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "10px",
                          fontWeight: 800,
                          background: badge.bg,
                          color: badge.text,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {badge.icon} {item.type}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="topbar-actions">
          {/* Live Digital Clock */}
          <div className="topbar-clock" title="System Live Clock">
            <Clock size={16} className="clock-icon" />
            <div className="clock-text">
              <span className="clock-time">{formatTime(currentTime)}</span>
              <span className="clock-date">{formatDate(currentTime)}</span>
            </div>
          </div>

          {/* Luxury Notifications Center */}
          <div className="notification-menu-container">
            <button
              className={`notification-btn ${showNotifications ? "active" : ""}`}
              title="Notifications Center"
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
                setShowDropdown(false);
              }}
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>

            {showNotifications && (
              <div
                className="notifications-popover"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Popover Header */}
                <div className="notif-header">
                  <div className="notif-header-left">
                    <div className="notif-title-wrap">
                      <span className="notif-main-heading">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="notif-count-pill">{unreadCount} new</span>
                      )}
                    </div>
                  </div>
                  <div className="notif-header-actions">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="notif-action-btn"
                        onClick={markAllAsRead}
                        title="Mark all as read"
                      >
                        <Check size={13} />
                        <span>Mark read</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        className="notif-action-btn danger"
                        onClick={clearNotifications}
                        title="Clear all notifications"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="notif-tab-bar">
                  <button
                    type="button"
                    className={`notif-tab ${activeTab === "ALL" ? "active" : ""}`}
                    onClick={() => setActiveTab("ALL")}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    type="button"
                    className={`notif-tab ${activeTab === "UNREAD" ? "active" : ""}`}
                    onClick={() => setActiveTab("UNREAD")}
                  >
                    Unread ({unreadCount})
                  </button>
                </div>

                {/* Notifications List */}
                <div className="notif-list">
                  {displayedNotifications.length === 0 ? (
                    <div className="empty-notif-box">
                      <div className="empty-notif-icon">
                        <Inbox size={28} />
                      </div>
                      <strong>All caught up!</strong>
                      <p>
                        {activeTab === "UNREAD"
                          ? "No unread notifications to review."
                          : "No new activity logged at this time."}
                      </p>
                    </div>
                  ) : (
                    displayedNotifications.map((n) => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.read ? "unread" : ""}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className={`notif-icon-box ${n.type || "general"}`}>
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="notif-body">
                          <div className="notif-title-row">
                            <strong className="notif-item-title">{n.title}</strong>
                            <span className="notif-time-badge">{n.time}</span>
                          </div>
                          <p className="notif-desc">{n.message}</p>
                        </div>
                        <div className="notif-item-controls">
                          {!n.read && <span className="unread-dot" title="Unread"></span>}
                          <button
                            type="button"
                            className="notif-dismiss-btn"
                            onClick={(e) => dismissNotification(n.id, e)}
                            title="Dismiss"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="notif-popover-footer">
                  <span>Live HinchMart Notification Feed</span>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="user-menu">
            <button
              className={`user-button ${showDropdown ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
                setShowNotifications(false);
              }}
              title="Admin Account Profile"
            >
              <div className="topbar-avatar-wrap">
                <div className="topbar-avatar">{currentUser.initial}</div>
                <span className="online-indicator" title="Firebase Authenticated"></span>
              </div>
              <div className="user-info">
                <span className="user-name">{currentUser.displayName}</span>
                <span className="user-role">{currentUser.email}</span>
              </div>
              <ChevronDown size={14} className={`user-chevron ${showDropdown ? "open" : ""}`} />
            </button>

            {showDropdown && (
              <div className="user-dropdown" onClick={(e) => e.stopPropagation()}>
                {/* Header with Luxury Gradient & Profile Details */}
                <div className="user-dropdown-header">
                  <div className="dropdown-avatar-wrap">
                    <div className="dropdown-avatar">{currentUser.initial}</div>
                    <span className="dropdown-online-dot"></span>
                  </div>
                  <div className="dropdown-user-info">
                    <strong className="dropdown-user-name" title={currentUser.displayName}>
                      {currentUser.displayName}
                    </strong>
                    <span className="dropdown-user-email" title={currentUser.email}>
                      {currentUser.email}
                    </span>
                    <div className="user-auth-badge">
                      <ShieldCheck size={12} color="#10b981" />
                      <span>Verified • Firebase Auth</span>
                    </div>
                  </div>
                </div>

                <div className="dropdown-divider"></div>

                {/* Dropdown Menu Items */}
                <div className="dropdown-actions-list">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/admin/settings");
                    }}
                  >
                    <User size={15} />
                    <span>Account Settings</span>
                  </button>
                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-footer-actions">
                  <button className="dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
