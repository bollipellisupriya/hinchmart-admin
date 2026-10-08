import { useState, useEffect } from "react";
import { Save, User, Bell, Shield, Globe, Palette, Moon, Sun, Monitor, Check } from "lucide-react";
import { useToast } from "../components/ToastContext";
import { getStoredAppearance, applyAppearance, getSystemTheme, initThemeSystemListener } from "../utils/themeUtils";
import "../styles/pages.css";

export default function Settings() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [savedAt, setSavedAt] = useState(null);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [security, setSecurity] = useState({ twoFactor: true, sessionAlerts: true });
  const [systemTheme, setSystemTheme] = useState(() => getSystemTheme());
  const [appearance, setAppearance] = useState(() => getStoredAppearance());

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    const unsub = initThemeSystemListener((newSystemTheme) => {
      setSystemTheme(newSystemTheme);
    });
    return () => unsub();
  }, []);


  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem("hinchmart_settings_profile");
      return saved ? JSON.parse(saved) : {
        name: "Super Administrator",
        email: "admin@hinchmart.com",
        phone: "+91 98000 12345",
        role: "Super Admin",
      };
    } catch {
      return {
        name: "Super Administrator",
        email: "admin@hinchmart.com",
        phone: "+91 98000 12345",
        role: "Super Admin",
      };
    }
  });

  const [platform, setPlatform] = useState(() => {
    try {
      const saved = localStorage.getItem("hinchmart_settings_platform");
      return saved ? JSON.parse(saved) : {
        siteName: "HINCH MART",
        commissionRate: "5",
        currency: "INR",
        minOrderAmount: "500",
        maxProductsPerSeller: "100",
        autoApproveProducts: false,
        autoApproveSellers: false,
        maintenanceMode: false,
      };
    } catch {
      return {
        siteName: "HINCH MART",
        commissionRate: "5",
        currency: "INR",
        minOrderAmount: "500",
        maxProductsPerSeller: "100",
        autoApproveProducts: false,
        autoApproveSellers: false,
        maintenanceMode: false,
      };
    }
  });

  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("hinchmart_settings_notifications");
      return saved ? JSON.parse(saved) : {
        emailNewSeller: true,
        emailNewOrder: true,
        emailNewRFQ: true,
        emailLowStock: true,
        pushNewSeller: true,
        pushNewOrder: true,
      };
    } catch {
      return {
        emailNewSeller: true,
        emailNewOrder: true,
        emailNewRFQ: true,
        emailLowStock: true,
        pushNewSeller: true,
        pushNewOrder: true,
      };
    }
  });

  const handleSave = () => {
    try {
      if (!profile.name.trim() || !profile.email.includes("@")) {
        toast.error("Please enter a valid administrator name and email.");
        setActiveTab("profile");
        return;
      }
      if (passwords.next && (passwords.next.length < 8 || passwords.next !== passwords.confirm)) {
        toast.error("New password must be 8+ characters and match confirmation.");
        setActiveTab("security");
        return;
      }
      localStorage.setItem("hinchmart_settings_profile", JSON.stringify(profile));
      localStorage.setItem("hinchmart_settings_platform", JSON.stringify(platform));
      localStorage.setItem("hinchmart_settings_notifications", JSON.stringify(notifications));
      localStorage.setItem("hinchmart_settings_appearance", JSON.stringify(appearance));
      localStorage.setItem("hinchmart_settings_security", JSON.stringify(security));
      setSavedAt(new Date());
      toast.success("Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings.");
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "platform", label: "Platform", icon: Globe },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Palette },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>System Preferences & Configuration</h1>
          <p>Manage administrator credentials, marketplace commission rules, notification streams & styling</p>
        </div>
        <button className="primary-button" onClick={handleSave}>
          <Save size={16} />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="settings-status-strip">
        <span className="settings-status-dot"></span>
        <strong>Console configuration</strong>
        <span>All changes stay local until you save.</span>
        {savedAt && <time>Last saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}
      </div>

      <div className="settings-layout">
        {/* Settings Tabs */}
        <div className="settings-tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`settings-tab ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {activeTab === "profile" && (
            <div className="settings-section">
              <div className="settings-section-heading"><div><h3>Admin Profile</h3>
              <p className="text-muted">Manage your personal admin account credentials</p>
              </div><span className="settings-section-index">01 / 05</span></div>

              <div className="settings-form">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Direct Phone</label>
                  <input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+91 XXXXXXXXXX"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input value={profile.role} disabled className="input-disabled" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "platform" && (
            <div className="settings-section">
              <div className="settings-section-heading"><div><h3>Platform Configuration</h3>
              <p className="text-muted">Configure marketplace-wide trading and commission settings</p>
              </div><span className="settings-section-index">02 / 05</span></div>

              <div className="settings-form">
                <div className="form-group">
                  <label>Marketplace Brand Name</label>
                  <input
                    value={platform.siteName}
                    onChange={(e) => setPlatform({ ...platform, siteName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Marketplace Commission Rate (%)</label>
                  <input
                    type="number"
                    value={platform.commissionRate}
                    onChange={(e) => setPlatform({ ...platform, commissionRate: e.target.value })}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label>Base Currency</label>
                  <select
                    value={platform.currency}
                    onChange={(e) => setPlatform({ ...platform, currency: e.target.value })}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Minimum Order Value (₹)</label>
                  <input
                    type="number"
                    value={platform.minOrderAmount}
                    onChange={(e) => setPlatform({ ...platform, minOrderAmount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Max Products Allowed Per Merchant</label>
                  <input
                    type="number"
                    value={platform.maxProductsPerSeller}
                    onChange={(e) => setPlatform({ ...platform, maxProductsPerSeller: e.target.value })}
                  />
                </div>

                <div className="settings-toggles">
                  <div className="toggle-item">
                    <div>
                      <strong>Auto-approve New Products</strong>
                      <p>Automatically approve products without manual verification</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={platform.autoApproveProducts}
                        onChange={(e) => setPlatform({ ...platform, autoApproveProducts: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <div>
                      <strong>Auto-approve Merchant Onboarding</strong>
                      <p>Automatically approve new merchant applications</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={platform.autoApproveSellers}
                        onChange={(e) => setPlatform({ ...platform, autoApproveSellers: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <div>
                      <strong>Marketplace Maintenance Mode</strong>
                      <p>Pause customer ordering for platform upgrades</p>
                    </div>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={platform.maintenanceMode}
                        onChange={(e) => setPlatform({ ...platform, maintenanceMode: e.target.checked })}
                      />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="settings-section">
              <div className="settings-section-heading"><div><h3>Notification Routing</h3>
              <p className="text-muted">Configure live alert channels for administrators</p>
              </div><span className="settings-section-index">03 / 05</span></div>

              <div className="notification-group">
                <h4>Email Alerts</h4>
                <div className="settings-toggles">
                  {[
                    { key: "emailNewSeller", label: "New Merchant Application", desc: "Notify when a seller applies for account" },
                    { key: "emailNewOrder", label: "New Wholesale Order", desc: "Real-time dispatch alert for every placed order" },
                    { key: "emailNewRFQ", label: "New RFQ Request", desc: "Notify when an enterprise requests quotes" },
                    { key: "emailLowStock", label: "Low Inventory Warning", desc: "Alert when active SKU units fall below 20" },
                  ].map((item) => (
                    <div key={item.key} className="toggle-item">
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.desc}</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="notification-group">
                <h4>Push Alerts</h4>
                <div className="settings-toggles">
                  {[
                    { key: "pushNewSeller", label: "Seller review queue", desc: "Surface new applications in the admin console" },
                    { key: "pushNewOrder", label: "Order operations", desc: "Show an instant alert for new wholesale orders" },
                  ].map((item) => (
                    <div key={item.key} className="toggle-item">
                      <div><strong>{item.label}</strong><p>{item.desc}</p></div>
                      <label className="switch"><input type="checkbox" checked={notifications[item.key]} onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })} /><span className="slider round"></span></label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="settings-section">
              <div className="settings-section-heading"><div><h3>Security & Session Auditing</h3>
              <p className="text-muted">Two-factor auth and active admin tokens</p>
              </div><span className="settings-section-index">04 / 05</span></div>

              <div className="settings-form">
                <div className="form-group">
                  <label>Current Admin Password</label>
                  <input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} placeholder="Enter current password" />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} placeholder="Minimum 8 characters" />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Repeat new password" />
                </div>
                <div className="settings-toggles security-toggles">
                  <div className="toggle-item"><div><strong>Two-factor authentication</strong><p>Require a second verification step for admin sign-in</p></div><label className="switch"><input type="checkbox" checked={security.twoFactor} onChange={(e) => setSecurity({ ...security, twoFactor: e.target.checked })} /><span className="slider round"></span></label></div>
                  <div className="toggle-item"><div><strong>New session alerts</strong><p>Notify this console when a new admin session starts</p></div><label className="switch"><input type="checkbox" checked={security.sessionAlerts} onChange={(e) => setSecurity({ ...security, sessionAlerts: e.target.checked })} /><span className="slider round"></span></label></div>
                </div>
                <p className="security-note"><Shield size={14} /> Password changes are validated when you select Save Changes.</p>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="settings-section">
              <div className="appearance-heading">
                <div><h3>Admin Console Appearance</h3><p className="text-muted">Set the atmosphere for long, focused admin sessions.</p></div>
                <span className="appearance-live-status"><span></span> Live preview</span>
              </div>
              <span className="settings-section-index appearance-index">05 / 05</span>

              <div className="appearance-block">
                <div className="appearance-block-title">
                  <div>
                    <strong>Color mode</strong>
                    <span>Choose how the console looks across every workspace.</span>
                  </div>
                  <span className="appearance-value">
                    {appearance.theme === "system"
                      ? `System (${systemTheme === "dark" ? "Dark Mode" : "Light Mode"})`
                      : appearance.theme === "dark"
                      ? "Dark"
                      : "Light"}
                  </span>
                </div>
                <div className="theme-options">
                  {[
                    { id: "light", label: "Light", detail: "Clear and focused daylight workspace", icon: Sun },
                    { id: "dark", label: "Dark", detail: "Low-glare dark workspace", icon: Moon },
                    {
                      id: "system",
                      label: "System",
                      detail: `Follows device setting (Currently ${systemTheme === "dark" ? "Dark" : "Light"})`,
                      icon: Monitor,
                      badge: `OS Active: ${systemTheme === "dark" ? "Dark Mode" : "Light Mode"}`
                    },
                  ].map(({ id, label, detail, icon: Icon, badge }) => (
                    <button
                      key={id}
                      className={`theme-option-card ${appearance.theme === id ? "selected" : ""}`}
                      onClick={() => setAppearance({ ...appearance, theme: id })}
                    >
                      <div className={`theme-preview ${id}-theme`}>
                        <span className="preview-bar"></span>
                        <span className="preview-panel"></span>
                        <span className="preview-lines"></span>
                      </div>
                      <div className="theme-option-label">
                        <span>
                          <Icon size={15} />
                          {label}
                        </span>
                        <small>{detail}</small>
                        {badge && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "10px",
                              fontWeight: "700",
                              color: systemTheme === "dark" ? "#fbbf24" : "#0284c7",
                              background: systemTheme === "dark" ? "rgba(245, 158, 11, 0.15)" : "rgba(2, 132, 199, 0.12)",
                              border: "1px solid currentColor",
                              padding: "2px 7px",
                              borderRadius: "10px",
                              width: "fit-content",
                              marginTop: "4px"
                            }}
                          >
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981" }}></span>
                            {badge}
                          </span>
                        )}
                      </div>
                      {appearance.theme === id && (
                        <span className="theme-check">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="appearance-controls">
                <div className="appearance-block">
                  <div className="appearance-block-title">
                    <div>
                      <strong>Accent color</strong>
                      <span>Keep actions and active states unmistakable.</span>
                    </div>
                  </div>
                  <div className="accent-options">
                    {[
                      { id: "amber", color: "#f59e0b", label: "Amber" },
                      { id: "emerald", color: "#10b981", label: "Emerald" },
                      { id: "blue", color: "#3b82f6", label: "Blue" }
                    ].map((accent) => (
                      <button
                        key={accent.id}
                        className={appearance.accent === accent.id ? "selected" : ""}
                        onClick={() => setAppearance({ ...appearance, accent: accent.id })}
                        title={accent.label}
                      >
                        <span style={{ background: accent.color }}></span>
                        {accent.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="appearance-block">
                  <div className="appearance-block-title">
                    <div>
                      <strong>Interface density</strong>
                      <span>Adjust the breathing room in tables and forms.</span>
                    </div>
                  </div>
                  <div className="density-options">
                    {["compact", "comfortable", "spacious"].map((density) => (
                      <button
                        key={density}
                        className={appearance.density === density ? "selected" : ""}
                        onClick={() => setAppearance({ ...appearance, density })}
                      >
                        {density}
                        {appearance.density === density && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
