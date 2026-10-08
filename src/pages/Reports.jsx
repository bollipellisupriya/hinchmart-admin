import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Layers,
  Store,
  Users,
  Package,
  FileText,
  CreditCard,
  Download,
  IndianRupee,
  ShoppingBag,
  Clock,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import dataStore from "../api/dataStore";
import { useToast } from "../components/ToastContext";
import "../styles/pages.css";

export default function Reports() {
  const toast = useToast();
  const [activeReportTab, setActiveReportTab] = useState("sales_date");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const data = dataStore.getReportData();
    setReportData(data);
    setLoading(false);
  }, []);

  const handleExportReport = () => {
    toast.success(`Exported ${activeReportTab.replace("_", " ").toUpperCase()} report!`);
  };

  const reportTabs = [
    { id: "sales_date", label: "Sales by Date", icon: Calendar },
    { id: "sales_cat", label: "Sales by Category", icon: Layers },
    { id: "sales_seller", label: "Sales by Seller", icon: Store },
    { id: "top_products", label: "Top Products", icon: Package },
    { id: "top_buyers", label: "Top Buyers", icon: Users },
    { id: "open_rfqs", label: "Open RFQs", icon: FileText },
    { id: "order_status", label: "Order Status Summary", icon: ShoppingBag },
    { id: "payment_summary", label: "Payment Summary", icon: CreditCard },
  ];

  if (loading || !reportData) {
    return (
      <div className="loading-state-container">
        <div className="spinner"></div>
        <p>Aggregating marketplace intelligence reports...</p>
      </div>
    );
  }

  return (
    <div className="reports-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Marketplace Analytics & Reports</h1>
          <p>Multi-dimensional GMV intelligence, seller rankings, category turnover & payment distribution</p>
        </div>

        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleExportReport}>
            <Download size={16} />
            <span>Export Report Data</span>
          </button>
        </div>
      </div>

      {/* Reports Navigation Bar */}
      <div className="filter-tabs" style={{ marginBottom: 20, gap: 8 }}>
        {reportTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`filter-tab ${activeReportTab === id ? "active" : ""}`}
            onClick={() => setActiveReportTab(id)}
            style={{ padding: "9px 16px", fontSize: 13 }}
          >
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Report 1: Sales by Date */}
      {activeReportTab === "sales_date" && (
        <div className="content-card" style={{ padding: 24 }}>
          <div className="card-section-title" style={{ marginBottom: 16 }}>
            <Calendar size={18} />
            <h3>Daily GMV & Order Volume Progression</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Orders Placed</th>
                  <th>Gross Merchandise Value (GMV)</th>
                  <th>Average Order Value (AOV)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.salesByDate.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.date}</strong></td>
                    <td><span>{item.orders} Orders</span></td>
                    <td><strong className="amount-cell font-mono">₹{item.gmv.toLocaleString("en-IN")}</strong></td>
                    <td><span className="font-mono">₹{Math.round(item.gmv / item.orders).toLocaleString("en-IN")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 2: Sales by Category */}
      {activeReportTab === "sales_cat" && (
        <div className="content-card" style={{ padding: 24 }}>
          <div className="card-section-title" style={{ marginBottom: 16 }}>
            <Layers size={18} />
            <h3>Category Revenue Contribution</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Total Orders</th>
                  <th>Turnover GMV (INR)</th>
                  <th>Share of Marketplace GMV</th>
                </tr>
              </thead>
              <tbody>
                {reportData.salesByCategory.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.category}</strong></td>
                    <td><span>{item.ordersCount} Orders</span></td>
                    <td><strong className="amount-cell font-mono">₹{item.gmv.toLocaleString("en-IN")}</strong></td>
                    <td><span className="stock-badge">{Math.round((item.gmv / 965170) * 100)}%</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 3: Sales by Seller */}
      {activeReportTab === "sales_seller" && (
        <div className="content-card" style={{ padding: 24 }}>
          <div className="card-section-title" style={{ marginBottom: 16 }}>
            <Store size={18} />
            <h3>Supplying Merchant Performance & GMV Rankings</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Merchant / Seller</th>
                  <th>Orders Fulfilled</th>
                  <th>Total Sales (INR)</th>
                  <th>Merchant Rating</th>
                </tr>
              </thead>
              <tbody>
                {reportData.salesBySeller.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.seller}</strong></td>
                    <td><span>{item.ordersCount} Orders</span></td>
                    <td><strong className="amount-cell font-mono">₹{item.gmv.toLocaleString("en-IN")}</strong></td>
                    <td><span className="stock-badge">★ {item.rating}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 4: Top Products */}
      {activeReportTab === "top_products" && (
        <div className="content-card" style={{ padding: 24 }}>
          <div className="card-section-title" style={{ marginBottom: 16 }}>
            <Package size={18} />
            <h3>Top Performing SKUs by Revenue Volume</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product Title</th>
                  <th>SKU Code</th>
                  <th>Volume Dispatched</th>
                  <th>Total Realized Revenue</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topProducts.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.name}</strong></td>
                    <td><span className="sku-tag font-mono">{item.sku}</span></td>
                    <td><span>{item.volume}</span></td>
                    <td><strong className="amount-cell font-mono">₹{item.revenue.toLocaleString("en-IN")}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 5: Top Buyers */}
      {activeReportTab === "top_buyers" && (
        <div className="content-card" style={{ padding: 24 }}>
          <div className="card-section-title" style={{ marginBottom: 16 }}>
            <Users size={18} />
            <h3>Top Enterprise Procurement Accounts</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Buyer Account</th>
                  <th>Enterprise Company</th>
                  <th>Orders Placed</th>
                  <th>Total Procurement Value</th>
                </tr>
              </thead>
              <tbody>
                {reportData.topBuyers.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.name}</strong></td>
                    <td><span>{item.company}</span></td>
                    <td><span>{item.ordersCount} Orders</span></td>
                    <td><strong className="amount-cell font-mono">₹{item.totalSpent.toLocaleString("en-IN")}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 6: Open RFQs */}
      {activeReportTab === "open_rfqs" && (
        <div className="content-card" style={{ padding: 24 }}>
          <div className="card-section-title" style={{ marginBottom: 16 }}>
            <FileText size={18} />
            <h3>Open Enterprise Quotation Requests (RFQs)</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>RFQ Number</th>
                  <th>Requirement Brief</th>
                  <th>Buyer Account</th>
                  <th>Target Budget</th>
                  <th>Quotes Received</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.openRFQs.map((rfq) => (
                  <tr key={rfq.id}>
                    <td><span className="sku-tag font-mono">{rfq.rfqNumber}</span></td>
                    <td><strong>{rfq.title || rfq.productName}</strong></td>
                    <td><span>{rfq.buyer?.name || rfq.buyerName}</span></td>
                    <td><strong className="font-mono">₹{Number(rfq.targetBudget || 0).toLocaleString("en-IN")}</strong></td>
                    <td><span>{rfq.quotesCount || 0} Quotes</span></td>
                    <td><span className="status-badge-glow status-confirmed"><span className="status-dot"></span>{rfq.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report 7: Order Status Summary */}
      {activeReportTab === "order_status" && (
        <div className="content-card" style={{ padding: 24 }}>
          <div className="card-section-title" style={{ marginBottom: 16 }}>
            <ShoppingBag size={18} />
            <h3>Order Status Progression Breakdown</h3>
          </div>

          <div className="order-info-two-col">
            {Object.entries(reportData.orderStatusSummary).map(([status, count]) => (
              <div key={status} className="detail-item" style={{ padding: 18 }}>
                <label>{status} Orders</label>
                <span className="amount-highlight font-mono" style={{ fontSize: 24 }}>{count} Orders</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report 8: Payment Summary */}
      {activeReportTab === "payment_summary" && (
        <div className="content-card" style={{ padding: 24 }}>
          <div className="card-section-title" style={{ marginBottom: 16 }}>
            <CreditCard size={18} />
            <h3>Gateway Settlement & Payment Distribution</h3>
          </div>

          <div className="order-info-two-col">
            <div className="detail-item" style={{ padding: 18, gridColumn: "span 2", background: "#ecfdf5", borderColor: "#a7f3d0" }}>
              <label>Total Realized Settlement Volume</label>
              <strong className="amount-highlight font-mono" style={{ fontSize: 28 }}>
                ₹{reportData.paymentSummary.TotalCollected.toLocaleString("en-IN")}
              </strong>
            </div>

            <div className="detail-item" style={{ padding: 16 }}>
              <label>Successful Transactions</label>
              <span className="font-mono" style={{ fontSize: 20, color: "#059669" }}>{reportData.paymentSummary.Success}</span>
            </div>

            <div className="detail-item" style={{ padding: 16 }}>
              <label>Pending / Escrow Hold</label>
              <span className="font-mono" style={{ fontSize: 20, color: "#d97706" }}>{reportData.paymentSummary.Pending}</span>
            </div>

            <div className="detail-item" style={{ padding: 16 }}>
              <label>Failed Gateway Attempts</label>
              <span className="font-mono" style={{ fontSize: 20, color: "#dc2626" }}>{reportData.paymentSummary.Failed}</span>
            </div>

            <div className="detail-item" style={{ padding: 16 }}>
              <label>Refunded / Reversals</label>
              <span className="font-mono" style={{ fontSize: 20, color: "#64748b" }}>{reportData.paymentSummary.Refunded}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
