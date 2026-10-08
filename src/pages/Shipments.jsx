import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  Search,
  Eye,
  Filter,
  RotateCcw,
  Download,
  Building2,
  Store,
  MapPin,
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  ExternalLink,
  Navigation,
  Check,
} from "lucide-react";
import { getShipments, updateShipmentStatus } from "../api/shipmentApi";
import { subscribeDataUpdate } from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";


export default function Shipments() {
  const navigate = useNavigate();
  const toast = useToast();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [partnerFilter, setPartnerFilter] = useState("ALL");

  // Dynamic View Shipment Popup Modal State
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadShipments = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (partnerFilter !== "ALL") params.partner = partnerFilter;
      const data = await getShipments(params);
      setShipments(Array.isArray(data) ? data : data.shipments || data.data || []);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 403) {
        setError("You do not have permission to view shipments.");
      } else {
        setError("Unable to load shipments from backend.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
    const unsub = subscribeDataUpdate((detail) => {
      if (detail.entity === "shipments" || detail.entity === "orders") {
        loadShipments();
      }
    });
    return unsub;
  }, []);

  const handleUpdateStatus = async (shipmentId, newStatus) => {
    if (!window.confirm(`Update shipment status to "${newStatus}"?`)) return;
    try {
      setStatusUpdating(true);
      await updateShipmentStatus(shipmentId, newStatus);
      toast.success(`Shipment status updated to ${newStatus}`);
      await loadShipments();
      if (selectedShipment && (selectedShipment.id === shipmentId || selectedShipment.shipmentId === shipmentId)) {
        setSelectedShipment((prev) => ({
          ...prev,
          status: newStatus,
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update shipment status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const q = search.toLowerCase();
      const text = `${item.orderNumber || ""} ${item.shipmentId || ""} ${item.trackingNumber || ""} ${item.buyerName || ""} ${item.sellerName || ""} ${item.transportPartner || ""} ${item.pickup || ""} ${item.destination || ""}`.toLowerCase();
      const matchesSearch = text.includes(q);

      const status = (item.status || "").toUpperCase();
      const matchesStatus = statusFilter === "ALL" || status === statusFilter.toUpperCase();

      const partner = (item.transportPartner || "").toLowerCase();
      const matchesPartner = partnerFilter === "ALL" || partner.includes(partnerFilter.toLowerCase());

      return matchesSearch && matchesStatus && matchesPartner;
    });
  }, [shipments, search, statusFilter, partnerFilter]);

  const counts = useMemo(() => {
    return {
      total: shipments.length,
      inTransit: shipments.filter((s) => (s.status || "").toUpperCase() === "IN TRANSIT").length,
      pickedUp: shipments.filter((s) => (s.status || "").toUpperCase() === "PICKED UP").length,
      delivered: shipments.filter((s) => (s.status || "").toUpperCase() === "DELIVERED").length,
      processing: shipments.filter((s) => (s.status || "").toUpperCase() === "PROCESSING").length,
    };
  }, [shipments]);

  const handleExportCSV = () => {
    const headers = ["Order,Seller,Buyer,Pickup,Destination,Transport Partner,Tracking Number,Status,Expected Delivery"];
    const rows = filteredShipments.map((s) =>
      [
        `"${s.orderNumber}"`,
        `"${s.seller?.name || s.sellerName || ""}"`,
        `"${s.buyer?.name || s.buyerName || ""}"`,
        `"${s.pickup || ""}"`,
        `"${s.destination || ""}"`,
        `"${s.transportPartner || ""}"`,
        `"${s.trackingNumber || ""}"`,
        `"${s.status || ""}"`,
        `"${s.expectedDelivery || ""}"`,
      ].join(",")
    );
    const blob = new Blob([[...headers, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hinchmart_shipments_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Shipments records exported to CSV!");
  };

  const getTimelineSteps = (shipment) => {
    const cur = (shipment?.status || "Processing").toUpperCase();
    return [
      { label: "Booked", active: true, done: true },
      { label: "Picked Up", active: cur !== "PROCESSING" && cur !== "PENDING", done: cur === "PICKED UP" || cur === "IN TRANSIT" || cur === "DELIVERED" },
      { label: "In Transit", active: cur === "IN TRANSIT" || cur === "DELIVERED", done: cur === "IN TRANSIT" || cur === "DELIVERED" },
      { label: "Delivered", active: cur === "DELIVERED", done: cur === "DELIVERED" },
    ];
  };

  return (
    <div className="shipments-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Logistics & Shipment Management</h1>
          <p>Real-time carrier tracking, multimodal freight dispatch & wholesale delivery monitoring</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="header-stats-strip">
        <div
          className={`stat-pill ${statusFilter === "ALL" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("ALL")}
        >
          <span className="stat-pill-label">Total Shipments</span>
          <strong className="stat-pill-value">{counts.total}</strong>
        </div>

        <div
          className={`stat-pill active ${statusFilter === "IN TRANSIT" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("IN TRANSIT")}
        >
          <span className="pulse-dot green"></span>
          <span className="stat-pill-label">In Transit</span>
          <strong className="stat-pill-value">{counts.inTransit}</strong>
        </div>

        <div
          className={`stat-pill pending ${statusFilter === "PICKED UP" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("PICKED UP")}
        >
          <span className="pulse-dot amber"></span>
          <span className="stat-pill-label">Picked Up</span>
          <strong className="stat-pill-value">{counts.pickedUp}</strong>
        </div>

        <div
          className={`stat-pill ${statusFilter === "DELIVERED" ? "active-pill" : ""}`}
          onClick={() => setStatusFilter("DELIVERED")}
        >
          <span className="stat-pill-label">Delivered</span>
          <strong className="stat-pill-value">{counts.delivered}</strong>
        </div>
      </div>

      {error && (
        <div className="error-box">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={loadShipments}>
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="content-card">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={18} />
            <input
              placeholder="Search by Order, Tracking No, Carrier, Destination..."
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

        {loading ? (
          <div className="loading-state-container">
            <div className="spinner"></div>
            <p>Loading logistics data from backend...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Seller</th>
                  <th>Buyer</th>
                  <th>Pickup</th>
                  <th>Destination</th>
                  <th>Transport Partner</th>
                  <th>Tracking Number</th>
                  <th>Status</th>
                  <th>Expected Delivery</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="empty-table">
                      <div className="empty-table-content">
                        <Truck size={42} style={{ color: "#94a3b8" }} />
                        <h3>No shipments found.</h3>
                        <p>{search ? `No shipments matching "${search}"` : "No active shipments in transit."}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((s) => {
                    const id = s.id || s.shipmentId;
                    const status = (s.status || "Processing").toUpperCase();

                    return (
                      <tr key={id}>
                        <td>
                          <span
                            className="font-mono text-link"
                            onClick={() => navigate(`/admin/orders/${s.orderId || s.orderNumber}`)}
                            title="Trace Order"
                            style={{ cursor: "pointer", color: "#2563eb", fontWeight: 700 }}
                          >
                            {s.orderNumber}
                          </span>
                        </td>
                        <td>
                          <div className="seller-subtext">
                            <Store size={13} />
                            <span>{s.seller?.name || s.sellerName || "—"}</span>
                          </div>
                        </td>
                        <td>
                          <div className="user-subtext">
                            <Building2 size={13} />
                            <strong>{s.buyer?.name || s.buyerName || "—"}</strong>
                          </div>
                        </td>
                        <td>
                          <span className="city-subtext">{s.pickup || "Warehouse Facility"}</span>
                        </td>
                        <td>
                          <span className="city-subtext" style={{ fontWeight: 600, color: "#0f172a" }}>
                            {s.destination || "Delivery Site"}
                          </span>
                        </td>
                        <td>
                          <span className="category-pill-tag">{s.transportPartner || "Standard Freight"}</span>
                        </td>
                        <td>
                          <span className="sku-tag font-mono">{s.trackingNumber || "—"}</span>
                        </td>
                        <td>
                          <span
                            className={`status-badge-glow ${
                              status === "DELIVERED"
                                ? "status-delivered"
                                : status === "IN TRANSIT"
                                ? "status-shipped"
                                : "status-pending"
                            }`}
                          >
                            <span className="status-dot"></span>
                            {s.status || "Processing"}
                          </span>
                        </td>
                        <td className="date-cell">
                          <span>{s.expectedDelivery || "3-5 days"}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            className="btn-table-action view"
                            onClick={() => setSelectedShipment(s)}
                            title="Dynamic Shipment Tracking Popup View"
                          >
                            <Eye size={13} /> VIEW
                          </button>
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
          DYNAMIC POPUP MODAL: SHIPMENT TRACKING & CARRIER CONTROLS
          ========================================================================= */}
      {selectedShipment && (
        <div className="modal-overlay" onClick={() => setSelectedShipment(null)}>
          <div
            className="product-form-modal-luxury modal-animated"
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Luxury Dark Header */}
            <div className="luxury-modal-header">
              <div className="header-title-wrap">
                <div className="header-icon-box" style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)" }}>
                  <Truck size={20} style={{ color: "#ffffff" }} />
                </div>
                <div className="header-texts">
                  <h2>Consignment #{selectedShipment.trackingNumber || selectedShipment.shipmentId}</h2>
                  <p>
                    Carrier: <strong>{selectedShipment.transportPartner || "SafeXpress Logistics"}</strong> &nbsp;•&nbsp; Order: {selectedShipment.orderNumber}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className={`status-badge-glow ${
                    (selectedShipment.status || "").toUpperCase() === "DELIVERED"
                      ? "status-delivered"
                      : (selectedShipment.status || "").toUpperCase() === "IN TRANSIT"
                      ? "status-shipped"
                      : "status-pending"
                  }`}
                >
                  <span className="status-dot"></span>
                  {selectedShipment.status || "Processing"}
                </span>
                <button className="header-close-btn" onClick={() => setSelectedShipment(null)}>×</button>
              </div>
            </div>

            <div className="luxury-modal-body">
              {/* Waybill & Est Delivery Banner */}
              <div className="form-section-card" style={{ background: "#fffdf5", borderColor: "#fde68a" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Tracking Number / Air Waybill</span>
                    <strong className="font-mono" style={{ display: "block", fontSize: 18, color: "#0284c7", marginTop: 2 }}>
                      {selectedShipment.trackingNumber || "SFX-8829104"}
                    </strong>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>Estimated Delivery</span>
                    <strong style={{ display: "block", fontSize: 14, color: "#0f172a", marginTop: 2 }}>
                      {selectedShipment.expectedDelivery || "3-5 Business Days"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 4-Step Milestone Progression Bar */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <Truck size={13} /> Carrier Milestone Progression
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                  {getTimelineSteps(selectedShipment).map((step, idx) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
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
                          boxShadow: step.done ? "0 0 0 3px rgba(16, 185, 129, 0.2)" : "none",
                        }}
                      >
                        {step.done ? <Check size={16} /> : idx + 1}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: step.active ? "#0f172a" : "#94a3b8" }}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Origin vs Destination */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <MapPin size={13} /> Freight Origin & Destination
                </div>
                <div className="luxury-form-grid">
                  <div className="input-field-wrap">
                    <label>Pickup Origin (Seller Facility)</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                      <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedShipment.seller?.name || selectedShipment.sellerName}</strong>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>{selectedShipment.pickup || "MIDC Industrial Hub, MH"}</span>
                    </div>
                  </div>

                  <div className="input-field-wrap">
                    <label>Destination (Buyer Site)</label>
                    <div style={{ padding: "9px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9 }}>
                      <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>{selectedShipment.buyer?.name || selectedShipment.buyerName}</strong>
                      <span style={{ fontSize: 11.5, color: "#64748b" }}>{selectedShipment.destination || "GIDC Industrial Estate, GJ"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Transition Action Buttons in Popup */}
              <div className="form-section-card">
                <div className="section-card-title">
                  <CheckCircle2 size={13} /> Update Logistics Milestone
                </div>
                <div className="status-transition-buttons" style={{ display: "flex", gap: 10 }}>
                  {(selectedShipment.status || "").toUpperCase() !== "IN TRANSIT" && (selectedShipment.status || "").toUpperCase() !== "DELIVERED" && (
                    <button
                      className="btn-status-action ship"
                      onClick={() => handleUpdateStatus(selectedShipment.id || selectedShipment.shipmentId, "In Transit")}
                      disabled={statusUpdating}
                    >
                      <Truck size={14} /> Mark In Transit
                    </button>
                  )}

                  {(selectedShipment.status || "").toUpperCase() !== "DELIVERED" && (
                    <button
                      className="btn-status-action deliver"
                      onClick={() => handleUpdateStatus(selectedShipment.id || selectedShipment.shipmentId, "Delivered")}
                      disabled={statusUpdating}
                    >
                      <CheckCircle2 size={14} /> Confirm Delivered
                    </button>
                  )}

                  {(selectedShipment.status || "").toUpperCase() === "DELIVERED" && (
                    <span className="order-finalized-tag" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#059669", fontWeight: 700 }}>
                      <CheckCircle2 size={16} /> Consignment successfully delivered and closed.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="luxury-modal-footer">
              <button
                className="btn-luxury-cancel"
                onClick={() => {
                  navigate(`/admin/shipments/${selectedShipment.id || selectedShipment.shipmentId}`);
                  setSelectedShipment(null);
                }}
              >
                <ExternalLink size={13} /> Full Page Tracking
              </button>

              <button className="btn-luxury-submit" onClick={() => setSelectedShipment(null)}>
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

