import { useState, useEffect, useCallback } from "react";
import {
  Store,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Sliders,
  MapPin,
  Star,
  RefreshCw,
  Edit3,
  X,
  Building2,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { getAdminStores, getStores, updateStoreStatus } from "../api/storeApi";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";
import "../styles/products.css";
import "../styles/dashboard.css";

export default function Stores() {
  const toast = useToast();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedStore, setSelectedStore] = useState(null);
  const [statusModalStore, setStatusModalStore] = useState(null);
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStoresData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAdminStores({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      const storeList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setStores(storeList);
    } catch (err) {
      console.warn("Stores fetch fallback:", err);
      const fallbackList = await getStores();
      setStores(Array.isArray(fallbackList) ? fallbackList : []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchStoresData();
  }, [fetchStoresData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStoresData();
    setIsRefreshing(false);
    toast?.success?.("Marketplace stores refreshed successfully");
  };

  const filteredStores = stores.filter((st) => {
    const matchesSearch =
      (st.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.slug || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.sellerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.sellerCompanyName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.description || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || (st.status || "ACTIVE") === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = stores.filter((s) => (s.status || "ACTIVE") === "ACTIVE").length;
  const suspendedCount = stores.filter((s) => s.status === "SUSPENDED").length;
  const inactiveCount = stores.filter((s) => s.status === "INACTIVE").length;

  const openStatusModal = (store) => {
    setStatusModalStore(store);
    setNewStatus(store.status || "ACTIVE");
    setStatusRemarks(store.remarks || "");
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalStore) return;
    try {
      setIsUpdating(true);
      await updateStoreStatus(statusModalStore.storeId || statusModalStore.id, {
        status: newStatus,
        remarks: statusRemarks,
      });
      toast?.success?.(`Store status updated to ${newStatus}`);
      await fetchStoresData();
      setStatusModalStore(null);
    } catch (err) {
      toast?.error?.(err?.message || "Failed to update store status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header Bar */}
      <div className="page-header" style={{ marginBottom: "24px" }}>
        <div>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Store size={26} color="#FF6500" />
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800 }}>Marketplace Stores & Hubs</h1>
          </div>
          <p className="page-subtitle" style={{ margin: "4px 0 0", color: "#64748B", fontSize: "14px" }}>
            Admin governance of multi-vendor storefronts, delivery radiuses, commission rates, and compliance status.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={handleRefresh}
          disabled={isRefreshing}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "8px" }}
        >
          <RefreshCw size={15} className={isRefreshing ? "spin" : ""} />
          <span>Refresh Stores</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="stat-card" style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>TOTAL STORES</div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "#0F172A", marginTop: "4px" }}>{stores.length}</div>
            </div>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B82F6" }}>
              <Store size={22} />
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "8px" }}>Provisioned supplier hubs</div>
        </div>

        <div className="stat-card" style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>ACTIVE STORES</div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "#10B981", marginTop: "4px" }}>{activeCount}</div>
            </div>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10B981" }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "8px" }}>Accepting buyer orders</div>
        </div>

        <div className="stat-card" style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>SUSPENDED STORES</div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "#F59E0B", marginTop: "4px" }}>{suspendedCount}</div>
            </div>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", color: "#F59E0B" }}>
              <AlertTriangle size={22} />
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "8px" }}>Compliance or audit lock</div>
        </div>

        <div className="stat-card" style={{ background: "#ffffff", padding: "18px 20px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>INACTIVE STORES</div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "#EF4444", marginTop: "4px" }}>{inactiveCount}</div>
            </div>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444" }}>
              <Building2 size={22} />
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748B", marginTop: "8px" }}>Dormant / Delisted</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px", background: "#ffffff", padding: "14px 18px", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
          <Search size={18} color="#94A3B8" />
          <input
            type="text"
            className="search-input"
            placeholder="Search stores by name, slug, seller or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", border: "none", outline: "none", fontSize: "14px" }}
          />
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {["all", "ACTIVE", "SUSPENDED", "INACTIVE"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                border: statusFilter === st ? "1px solid #FF6500" : "1px solid #E2E8F0",
                background: statusFilter === st ? "rgba(255, 101, 0, 0.12)" : "#ffffff",
                color: statusFilter === st ? "#FF6500" : "#64748B",
              }}
            >
              {st === "all" ? "All Stores" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Stores Table */}
      <div className="table-wrapper" style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", fontSize: "12px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <th style={{ padding: "14px 18px" }}>Storefront</th>
              <th style={{ padding: "14px 18px" }}>Seller / Merchant</th>
              <th style={{ padding: "14px 18px" }}>Min Order</th>
              <th style={{ padding: "14px 18px" }}>Radius</th>
              <th style={{ padding: "14px 18px" }}>Commission</th>
              <th style={{ padding: "14px 18px" }}>Rating</th>
              <th style={{ padding: "14px 18px" }}>Status</th>
              <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
                  <RefreshCw size={20} className="spin" style={{ margin: "0 auto 8px" }} />
                  <div>Loading marketplace stores...</div>
                </td>
              </tr>
            ) : filteredStores.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
                  No marketplace stores matched your filter.
                </td>
              </tr>
            ) : (
              filteredStores.map((store) => (
                <tr key={store.storeId || store.id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  {/* Store Name & Logo */}
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "8px",
                          background: "#EFF6FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#3B82F6",
                          flexShrink: 0,
                          fontWeight: 700,
                        }}
                      >
                        <Store size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "#0F172A" }}>
                          {store.name || "HinchMart Partner Store"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748B" }}>
                          /{store.slug || "store"}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Seller / Merchant */}
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "#0F172A" }}>
                      {store.sellerCompanyName || store.sellerName || "Partner Supplier"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#64748B" }}>
                      Seller ID: #{store.sellerId || "SEL-001"}
                    </div>
                  </td>

                  {/* Min Order Value */}
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ fontWeight: 700, color: "#0F172A" }}>
                      ₹{Number(store.minOrderValue || 0).toLocaleString("en-IN")}
                    </div>
                  </td>

                  {/* Service Radius */}
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#3B82F6" }}>
                      <MapPin size={13} />
                      <span>{store.serviceRadiusKm || 50} km</span>
                    </div>
                  </td>

                  {/* Commission */}
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ fontWeight: 700, color: "#1E3E62" }}>
                      {store.commissionRate || 5.0}%
                    </div>
                  </td>

                  {/* Rating */}
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" }}>
                      <Star size={13} fill="#F59E0B" color="#F59E0B" />
                      <span style={{ fontWeight: 700 }}>{store.rating || 4.8}</span>
                      <span style={{ color: "#94A3B8", fontSize: "11px" }}>({store.reviewCount || 0})</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "14px 18px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          (store.status || "ACTIVE") === "ACTIVE"
                            ? "#ECFDF5"
                            : store.status === "SUSPENDED"
                            ? "#FFFBEB"
                            : "#FEF2F2",
                        color:
                          (store.status || "ACTIVE") === "ACTIVE"
                            ? "#059669"
                            : store.status === "SUSPENDED"
                            ? "#D97706"
                            : "#DC2626",
                      }}
                    >
                      {store.status || "ACTIVE"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedStore(store)}
                        title="View Details"
                        style={{
                          background: "#F1F5F9",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          color: "#475569",
                        }}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openStatusModal(store)}
                        title="Change Status"
                        style={{
                          background: "rgba(255, 101, 0, 0.12)",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          color: "#FF6500",
                        }}
                      >
                        <Sliders size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Store Details Modal */}
      {selectedStore && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedStore(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "600px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Store size={22} color="#FF6500" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Store Details: {selectedStore.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStore(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Store ID</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>#{selectedStore.storeId || selectedStore.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Seller ID / Owner</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>#{selectedStore.sellerId} — {selectedStore.sellerName || selectedStore.sellerCompanyName}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Slug</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>/{selectedStore.slug || "store"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Current Status</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedStore.status || "ACTIVE"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Min Order Value</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>₹{Number(selectedStore.minOrderValue || 0).toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Service Radius</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedStore.serviceRadiusKm || 50} km</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Platform Commission</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>{selectedStore.commissionRate || 5.0}%</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>Rating</div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", marginTop: "2px" }}>⭐ {selectedStore.rating || 4.8} / 5.0</div>
                </div>
              </div>

              {selectedStore.remarks && (
                <div style={{ marginBottom: "16px", background: "#FFFBEB", border: "1px solid #FDE68A", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#92400E" }}>
                  <strong>Admin Remarks:</strong> {selectedStore.remarks}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => {
                    const st = selectedStore;
                    setSelectedStore(null);
                    openStatusModal(st);
                  }}
                  style={{
                    background: "#FF6500",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Edit3 size={15} />
                  <span>Update Status & Remarks</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Store Status Modal */}
      {statusModalStore && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setStatusModalStore(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "480px",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Sliders size={20} color="#FF6500" />
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>Update Store Status</h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalStore(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748B" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} style={{ padding: "24px" }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0F172A" }}>
                  Store: {statusModalStore.name} (#{statusModalStore.storeId || statusModalStore.id})
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  Changing status updates live buyer visibility and order acceptance.
                </div>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Select New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                >
                  <option value="ACTIVE">ACTIVE (Accepting Orders)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporarily Restricted)</option>
                  <option value="INACTIVE">INACTIVE (Delisted from Buyer Directory)</option>
                </select>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Audit Remarks / Reason
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Compliance document renewal passed or pending annual review..."
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #CBD5E1", fontSize: "14px" }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setStatusModalStore(null)}
                  style={{ background: "#F1F5F9", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: 600, cursor: "pointer", color: "#475569" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{ background: "#FF6500", color: "#ffffff", border: "none", padding: "10px 18px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
                >
                  {isUpdating ? "Updating..." : "Save & Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
