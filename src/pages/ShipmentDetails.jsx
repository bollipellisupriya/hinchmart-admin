import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Building2,
  Store,
  ShoppingBag,
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  RotateCcw,
  ExternalLink,
  Lock,
  Navigation,
  Check,
} from "lucide-react";
import { getShipmentById, updateShipmentStatus } from "../api/shipmentApi";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";

export default function ShipmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadShipment = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getShipmentById(id);
      if (!data) {
        setError("Shipment record not found.");
      } else {
        setShipment(data);
      }
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to view this shipment.");
      } else {
        setError("Unable to load shipment details from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadShipment();
  }, [id]);

  const handleUpdateStatus = async (newStatus) => {
    if (!window.confirm(`Update shipment status to "${newStatus}"?`)) return;
    try {
      setStatusUpdating(true);
      await updateShipmentStatus(id, newStatus);
      toast.success(`Shipment status updated to ${newStatus}`);
      await loadShipment();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update shipment status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state-container">
        <div className="spinner"></div>
        <p>Loading carrier tracking from backend...</p>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="content-card" style={{ padding: 40, textAlign: "center" }}>
        <AlertCircle size={48} style={{ color: "#ef4444", margin: "0 auto 16px" }} />
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>{error || "Shipment Not Found"}</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>
          The requested tracking information could not be retrieved from the backend.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="btn-secondary" onClick={() => navigate("/admin/shipments")}>
            <ArrowLeft size={16} /> Back to Shipments
          </button>
          <button className="primary-button" onClick={loadShipment}>
            <RotateCcw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = (shipment.status || "Processing").toUpperCase();

  const steps = [
    { label: "Booked & Manifested", active: true, done: true },
    { label: "Picked Up from Facility", active: currentStatus !== "PROCESSING" && currentStatus !== "PENDING", done: currentStatus === "PICKED UP" || currentStatus === "IN TRANSIT" || currentStatus === "DELIVERED" },
    { label: "In Transit via Linehaul", active: currentStatus === "IN TRANSIT" || currentStatus === "DELIVERED", done: currentStatus === "IN TRANSIT" || currentStatus === "DELIVERED" },
    { label: "Delivered to Dock", active: currentStatus === "DELIVERED", done: currentStatus === "DELIVERED" },
  ];

  return (
    <div className="shipment-details-container">
      {/* Top Bar */}
      <div className="review-top-bar">
        <button className="btn-back" onClick={() => navigate("/admin/shipments")}>
          <ArrowLeft size={17} /> Back to Shipments
        </button>

        <div className="review-header-badge">
          <span
            className={`status-badge-glow ${
              currentStatus === "DELIVERED"
                ? "status-delivered"
                : currentStatus === "IN TRANSIT"
                ? "status-shipped"
                : "status-pending"
            }`}
          >
            <span className="status-dot"></span>
            Shipment Status: {shipment.status || "Processing"}
          </span>
        </div>
      </div>

      {/* Main Carrier Banner */}
      <div className="content-card order-summary-banner">
        <div className="order-summary-header-left">
          <div className="order-number-title">
            <Truck size={22} className="text-amber" />
            <h2>Consignment {shipment.trackingNumber || shipment.shipmentId || shipment.id}</h2>
          </div>
          <div className="order-meta-row">
            <span>Transport Partner: <strong>{shipment.transportPartner || "SafeXpress Logistics"}</strong></span>
            <span>•</span>
            <span>Est. Delivery: <strong>{shipment.expectedDelivery || "3-5 Business Days"}</strong></span>
          </div>
        </div>

        <div className="order-summary-header-right">
          <span className="total-amount-label">Waybill Tracking Number</span>
          <strong className="total-amount-display font-mono" style={{ fontSize: 20, color: "#2563eb" }}>
            {shipment.trackingNumber || "SFX-8829104"}
          </strong>
        </div>
      </div>

      {/* Linked Order Trace Card */}
      <div className="content-card order-party-card" style={{ background: "#fffdf8", borderColor: "#fde68a" }}>
        <div className="card-section-title">
          <ShoppingBag size={18} className="text-amber" />
          <h3>Associated Wholesale Order</h3>
        </div>

        <div className="party-details-body">
          <div className="party-row">
            <span className="party-label">Order Number Reference</span>
            <strong className="party-val font-mono" style={{ color: "#2563eb", fontSize: 15 }}>
              {shipment.orderNumber}
            </strong>
          </div>
          <div className="party-row">
            <span className="party-label">Trace Order Action</span>
            <button
              className="btn-secondary"
              onClick={() => navigate(`/admin/orders/${shipment.orderId || shipment.orderNumber}`)}
              style={{ padding: "6px 14px", fontSize: 12.5 }}
            >
              <ExternalLink size={14} /> View Order & Line Items
            </button>
          </div>
        </div>
      </div>

      {/* Tracking Progression Bar */}
      <div className="content-card order-party-card">
        <div className="card-section-title">
          <Navigation size={18} />
          <h3>Carrier Milestone Progression</h3>
        </div>

        <div className="tracking-timeline-strip" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, position: "relative" }}>
          {steps.map((step, idx) => (
            <div key={idx} className="timeline-node" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", zIndex: 1 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: step.done ? "#10b981" : step.active ? "#f59e0b" : "#e2e8f0",
                  color: step.done || step.active ? "#ffffff" : "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  boxShadow: step.done ? "0 0 0 4px rgba(16, 185, 129, 0.2)" : "none",
                }}
              >
                {step.done ? <Check size={16} /> : idx + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, marginTop: 8, color: step.active ? "#0f172a" : "#94a3b8", maxWidth: 120 }}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Route Dossiers (Origin vs Destination) */}
      <div className="order-info-two-col">
        {/* Pickup Origin */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <Store size={18} />
            <h3>Pickup Location (Origin)</h3>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Origin Merchant</span>
              <strong className="party-val">{shipment.seller?.name || shipment.sellerName}</strong>
            </div>
            <div className="party-row">
              <span className="party-label">Warehouse Address</span>
              <span className="party-val">{shipment.pickup || "MIDC Industrial Estate facility"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Merchant Phone</span>
              <span className="party-val">{shipment.seller?.phone || "+91 98220 54321"}</span>
            </div>
          </div>
        </div>

        {/* Delivery Destination */}
        <div className="content-card order-party-card">
          <div className="card-section-title">
            <MapPin size={18} />
            <h3>Delivery Destination (Consignee)</h3>
          </div>

          <div className="party-details-body">
            <div className="party-row">
              <span className="party-label">Consignee Buyer</span>
              <strong className="party-val">{shipment.buyer?.name || shipment.buyerName}</strong>
            </div>
            <div className="party-row">
              <span className="party-label">Delivery Site Address</span>
              <span className="party-val">{shipment.destination || "GIDC Industrial Estate site"}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Buyer Contact</span>
              <span className="party-val">{shipment.buyer?.phone || "+91 98765 43210"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Controls */}
      <div className="content-card order-actions-panel">
        <div className="card-section-title" style={{ marginBottom: 14 }}>
          <Truck size={18} />
          <h3>Logistics Milestone Controls</h3>
        </div>

        <div className="status-transition-buttons">
          {currentStatus !== "IN TRANSIT" && currentStatus !== "DELIVERED" && (
            <button
              className="btn-status-action ship"
              onClick={() => handleUpdateStatus("In Transit")}
              disabled={statusUpdating}
            >
              <Truck size={15} /> Mark In Transit
            </button>
          )}

          {currentStatus !== "DELIVERED" && (
            <button
              className="btn-status-action deliver"
              onClick={() => handleUpdateStatus("Delivered")}
              disabled={statusUpdating}
            >
              <CheckCircle2 size={15} /> Confirm Delivered
            </button>
          )}

          {currentStatus === "DELIVERED" && (
            <span className="order-finalized-tag">
              <CheckCircle2 size={16} /> Consignment successfully delivered and proof-of-delivery logged.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
