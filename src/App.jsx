import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./firebase/AuthContext";

// Pages
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Categories = lazy(() => import("./pages/Categories"));
const Subcategories = lazy(() => import("./pages/Subcategories"));
const Brands = lazy(() => import("./pages/Brands"));
const Specifications = lazy(() => import("./pages/Specifications"));
const Banners = lazy(() => import("./pages/Banners"));
const Coupons = lazy(() => import("./pages/Coupons"));
const HotDeals = lazy(() => import("./pages/HotDeals"));
const Products = lazy(() => import("./pages/Products"));
const ProductApprovals = lazy(() => import("./pages/ProductApprovals"));
const ProductReview = lazy(() => import("./pages/ProductReview"));
const Sellers = lazy(() => import("./pages/Sellers"));
const Stores = lazy(() => import("./pages/Stores"));
const SellerApprovals = lazy(() => import("./pages/SellerApprovals"));
const SellerDocuments = lazy(() => import("./pages/SellerDocuments"));
const Buyers = lazy(() => import("./pages/Buyers"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetails = lazy(() => import("./pages/OrderDetails"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetails = lazy(() => import("./pages/InvoiceDetails"));
const Payments = lazy(() => import("./pages/Payments"));
const PaymentDetails = lazy(() => import("./pages/PaymentDetails"));
const Shipments = lazy(() => import("./pages/Shipments"));
const ShipmentDetails = lazy(() => import("./pages/ShipmentDetails"));
const RFQs = lazy(() => import("./pages/RFQs"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));

// Components
import AdminLayout from "./components/AdminLayout";
import { ToastProvider } from "./components/ToastContext";
import ErrorBoundary from "./components/ErrorBoundary";

// Unified Design System Styles
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/pages.css";
import "./styles/products.css";
import "./styles/categories.css";
import "./styles/specifications.css";
import "./styles/banners.css";
import "./styles/coupons.css";
import "./styles/hotDeals.css";
import "./styles/dashboard.css";

function ProtectedAdminRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner"></div>
        <p>Verifying authentication...</p>
      </div>
    );
  }

  return isAuthenticated ? <AdminLayout /> : <Navigate to="/login" replace />;
}

function PublicLoginRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/admin/dashboard" replace /> : <Login />;
}

function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="loading-fullscreen">
          <div className="spinner"></div>
          <p>Loading HinchMart Admin...</p>
        </div>
      }
    >
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<PublicLoginRoute />} />
        <Route path="/register" element={<PublicLoginRoute />} />

        {/* Admin Routes - Protected by Firebase Auth */}
        <Route path="/admin/*" element={<ProtectedAdminRoute />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="categories" element={<Categories />} />
          <Route path="subcategories" element={<Subcategories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="specifications" element={<Specifications />} />
          <Route path="banners" element={<Banners />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="hot-deals" element={<HotDeals />} />
          <Route path="products" element={<Products />} />
          <Route path="product-approvals" element={<ProductApprovals />} />
          <Route path="product-review/:id" element={<ProductReview />} />
          <Route path="sellers" element={<Sellers />} />
          <Route path="stores" element={<Stores />} />
          <Route path="seller-approvals" element={<SellerApprovals />} />
          <Route path="seller-documents" element={<SellerDocuments />} />
          <Route path="buyers" element={<Buyers />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="payments" element={<Payments />} />
          <Route path="payments/:id" element={<PaymentDetails />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="shipments/:id" element={<ShipmentDetails />} />
          <Route path="rfqs" element={<RFQs />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>

        {/* Default redirects */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

import { useEffect } from "react";
import { applyAppearance, initThemeSystemListener } from "./utils/themeUtils";

function App() {
  useEffect(() => {
    // Initialize theme from storage or system preference
    applyAppearance();
    // Listen for OS/Browser dark/light mode changes in real time
    const unsubscribe = initThemeSystemListener();
    return () => unsubscribe();
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;


