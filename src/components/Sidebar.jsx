import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  UserCheck,
  FolderTree,
  Package,
  PackageCheck,
  ShoppingCart,
  CreditCard,
  Truck,
  BarChart3,
  Settings,
  HelpCircle,
  Store,
  Layers,
  LogOut,
  Tag,
  Ticket,
  Megaphone,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../firebase/AuthContext";
import logoImg from "../assets/hinchmart-logo.png";
import dataStore, { subscribeDataUpdate } from "../api/dataStore";
import { getBuyers } from "../api/buyerApi";
import { getSellers } from "../api/sellerApi";
import { getProducts } from "../api/productApi";
import { getOrders } from "../api/orderApi";
import { getBanners } from "../api/bannerApi";
import { getHotDeals } from "../api/hotDealApi";

export default function Sidebar({
  collapsed = false,
  setCollapsed = () => {},
  mobileOpen = false,
  setMobileOpen = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [counts, setCounts] = useState(() => {
    const stats = dataStore.getDashboardStats();
    return {
      buyers: stats.totalBuyers || 42,
      sellers: stats.totalSellers || 0,
      sellerKyc: stats.pendingSellers || 0,
      products: stats.activeProducts || dataStore.getProducts().length || 0,
      orders: stats.todaysOrders || dataStore.getOrders().length || 0,
      banners: 3,
      hotDeals: 2,
    };
  });

  useEffect(() => {
    let mounted = true;

    const refreshCounts = async () => {
      try {
        const [buyersData, sellersData, productsData, ordersData, bannersData, hotDealsData] = await Promise.allSettled([
          getBuyers(),
          getSellers(),
          getProducts(),
          getOrders(),
          getBanners(),
          getHotDeals(),
        ]);

        if (!mounted) return;

        const buyersCount =
          buyersData.status === "fulfilled" && Array.isArray(buyersData.value)
            ? buyersData.value.length
            : dataStore.getBuyers().length;

        const sellersList =
          sellersData.status === "fulfilled" && Array.isArray(sellersData.value)
            ? sellersData.value
            : dataStore.getSellers();
        const sellersCount = sellersList.length;
        const pendingSellersCount = sellersList.filter(
          (s) => (s.approvalStatus || s.status || "").toUpperCase() === "PENDING"
        ).length;

        const productsCount =
          productsData.status === "fulfilled" && Array.isArray(productsData.value)
            ? productsData.value.length
            : dataStore.getProducts().length;

        const ordersCount =
          ordersData.status === "fulfilled" && Array.isArray(ordersData.value)
            ? ordersData.value.length
            : dataStore.getOrders().length;

        const bannersCount =
          bannersData.status === "fulfilled" && Array.isArray(bannersData.value)
            ? bannersData.value.length
            : 3;

        const hotDealsCount =
          hotDealsData.status === "fulfilled" && Array.isArray(hotDealsData.value)
            ? hotDealsData.value.length
            : 2;

        setCounts({
          buyers: buyersCount,
          sellers: sellersCount,
          sellerKyc: pendingSellersCount,
          products: productsCount,
          orders: ordersCount,
          banners: bannersCount,
          hotDeals: hotDealsCount,
        });
      } catch {
        if (!mounted) return;
        const stats = dataStore.getDashboardStats();
        setCounts({
          buyers: stats.totalBuyers || 0,
          sellers: stats.totalSellers || 0,
          sellerKyc: stats.pendingSellers || 0,
          products: stats.activeProducts || dataStore.getProducts().length || 0,
          orders: stats.todaysOrders || dataStore.getOrders().length || 0,
          banners: 3,
        });
      }
    };

    refreshCounts();
    const unsubscribe = subscribeDataUpdate(() => {
      refreshCounts();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const navSections = useMemo(
    () => [
      {
        title: "CORE OVERSIGHT",
        items: [
          { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
          { name: "Buyers", path: "/admin/buyers", icon: Users, badge: counts.buyers, badgeType: "blue" },
          { name: "Sellers", path: "/admin/sellers", icon: Building2, badge: counts.sellers, badgeType: "blue" },
          { name: "Marketplace Stores", path: "/admin/stores", icon: Store },
          {
            name: "Seller KYC",
            path: "/admin/seller-approvals",
            icon: UserCheck,
            badge: counts.sellerKyc > 0 ? counts.sellerKyc : null,
            badgeType: "orange",
          },
          { name: "Proxy Inventory", path: "/admin/products", icon: Package },
        ],
      },
      {
        title: "CATALOG & PRODUCTS",
        items: [
          { name: "Categories", path: "/admin/categories", icon: FolderTree },
          { name: "Subcategories", path: "/admin/subcategories", icon: Layers },
          { name: "Brands", path: "/admin/brands", icon: Tag },
          { name: "Specifications", path: "/admin/specifications", icon: SlidersHorizontal },
          { name: "Products", path: "/admin/products", icon: Package, badge: counts.products, badgeType: "blue" },
          { name: "Product Approvals", path: "/admin/product-approvals", icon: PackageCheck },
          { name: "RFQs", path: "/admin/rfqs", icon: HelpCircle },
        ],
      },
      {
        title: "MARKETING & MERCHANDISING",
        items: [
          { name: "Hot Deals", path: "/admin/hot-deals", icon: Flame, badge: counts.hotDeals, badgeType: "orange" },
          { name: "Banners", path: "/admin/banners", icon: Megaphone, badge: counts.banners, badgeType: "blue" },
          { name: "Platform Coupons", path: "/admin/coupons", icon: Ticket },
        ],
      },
      {
        title: "COMMERCE & LOGISTICS",
        items: [
          { name: "Orders", path: "/admin/orders", icon: ShoppingCart, badge: counts.orders, badgeType: "blue" },
          { name: "Payments & Invoices", path: "/admin/payments", icon: CreditCard },
          { name: "Shipments & Logistics", path: "/admin/shipments", icon: Truck },
          { name: "Reports & Analytics", path: "/admin/reports", icon: BarChart3 },
          { name: "Settings", path: "/admin/settings", icon: Settings },
        ],
      },
    ],
    [counts]
  );

  const handleNavClick = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      navigate("/login");
    }
  };

  const isItemActive = (path) => {
    if (path === "/admin/dashboard") {
      return (
        location.pathname === "/admin/dashboard" ||
        location.pathname === "/admin" ||
        location.pathname === "/admin/"
      );
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? "active" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Brand Header with Clean Cropped Logo */}
        <div
          className="sidebar-header"
          onClick={() => {
            navigate("/admin/dashboard");
            handleNavClick();
          }}
          title="HinchMart Admin Web Hub"
        >
          <img
            src={logoImg}
            alt="HinchMart Logo"
            className="sidebar-logo"
          />
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">HINCHMART</span>
            <span className="sidebar-portal-tag portal-tag-admin">Admin Web Hub</span>
          </div>

          {/* Close button inside sidebar on mobile */}
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={(e) => {
              e.stopPropagation();
              setMobileOpen(false);
            }}
            title="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="sidebar-nav">
          {navSections.map((section, idx) => (
            <div key={idx} className="sidebar-section-wrap">
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.path);

                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={`sidebar-link ${active ? "active" : ""}`}
                    onClick={handleNavClick}
                    title={item.name}
                  >
                    <div className="sidebar-link-content">
                      <Icon size={17} color={active ? "#FF6500" : "#94A3B8"} />
                      <span className="sidebar-link-label">{item.name}</span>
                    </div>

                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        className={`sidebar-badge ${
                          item.badgeType === "orange"
                            ? "sidebar-badge-orange"
                            : item.badgeType === "red"
                            ? "sidebar-badge-red"
                            : "sidebar-badge-blue"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer Profile Info & Logout */}
        <div className="sidebar-footer">
          <div className="user-profile-widget">
            <div className="user-profile-left">
              <div className="user-avatar">AD</div>
              <div className="user-info">
                <div className="user-name">HinchMart SuperAdmin</div>
                <div className="user-role">{user?.email || "admin@hinchmart.com"}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Logout of HinchMart (Go to Login/Signup)"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
