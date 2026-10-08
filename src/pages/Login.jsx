import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Building2,
  Check,
  X,
} from "lucide-react";
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
  sendPhoneOtp,
  verifyPhoneOtp,
  resetAdminPassword,
  loginWithGoogle,
  formatAuthError,
} from "../firebase/authService";
import { useToast } from "../components/ToastContext";

// Admin Department Options
const ADMIN_DEPARTMENTS = [
  {
    value: "ADMIN",
    label: "Administrator (Full Platform Access)",
    description: "Full access to all administrative modules, configurations, and governance",
  },
  {
    value: "COMPLIANCE_ADMIN",
    label: "Compliance & Seller Verification Admin",
    description: "KYC validation, GST/PAN verification, bank account approvals",
  },
  {
    value: "CATALOG_ADMIN",
    label: "Catalog & Product Management Admin",
    description: "Categories, products, catalog moderation, discount approvals",
  },
  {
    value: "SUPPORT_ADMIN",
    label: "Customer Support & Operations Admin",
    description: "RFQs, buyer enquiries, dispute tickets, shipments",
  },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // Mode: "login" | "register" | "otp"
  const initialMode =
    location.pathname.includes("register") || searchParams.get("mode") === "register"
      ? "register"
      : "login";
  const [mode, setMode] = useState(initialMode);

  // Sync mode with route if navigating
  useEffect(() => {
    if (location.pathname.includes("register")) {
      setMode("register");
    } else if (location.pathname.includes("login")) {
      setMode("login");
    }
  }, [location.pathname]);

  // ==========================================
  // Form State: Registration
  // ==========================================
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regDepartment, setRegDepartment] = useState("ADMIN");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // ==========================================
  // Form State: Login
  // ==========================================
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // ==========================================
  // Form State: Phone OTP (2FA)
  // ==========================================
  const [otpPhone, setOtpPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // ==========================================
  // Forgot Password Modal State
  // ==========================================
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // General Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  /**
   * Admin Portal Routing
   * Navigates directly into Admin Dashboard
   */
  const handleRoleRouting = (role, displayName = "Admin") => {
    toast.success(`Welcome, ${displayName}!`);
    navigate("/admin/dashboard");
  };

  /**
   * Google Workspace SSO Sign-In Handler
   */
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError("");
      const { user, backendData, role } = await loginWithGoogle();
      handleRoleRouting(role, backendData?.name || user?.displayName || "Admin");
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err.role) {
        handleRoleRouting(err.role, "User");
      } else {
        setError(formatAuthError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Password Strength Calculation
  // ==========================================
  const passwordStrength = useMemo(() => {
    const pwd = regPassword;
    if (!pwd) return { score: 0, label: "None", color: "#cbd5e1", width: "0%" };

    const criteria = [
      pwd.length >= 8,
      /[a-z]/.test(pwd),
      /[A-Z]/.test(pwd),
      /\d/.test(pwd),
      /[@$!%*?&#^()_+=\-\[\]{}|:;<>.,~`]/.test(pwd),
    ];

    const passedCount = criteria.filter(Boolean).length;

    if (passedCount <= 2) {
      return {
        score: 1,
        label: "Weak (Need upper, numbers & symbol)",
        color: "#ef4444",
        width: "33%",
      };
    } else if (passedCount <= 4) {
      return {
        score: 2,
        label: "Moderate (Add special symbol)",
        color: "#f59e0b",
        width: "66%",
      };
    } else {
      return {
        score: 3,
        label: "Strong & Compliant",
        color: "#10b981",
        width: "100%",
      };
    }
  }, [regPassword]);

  // Real-time password matching status
  const passwordsMatch = useMemo(() => {
    if (!regConfirmPassword) return null;
    return regPassword === regConfirmPassword;
  }, [regPassword, regConfirmPassword]);

  // ==========================================
  // 1. Handle Admin Registration
  // ==========================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nameClean = regName.trim();
    const emailClean = regEmail.trim().toLowerCase();
    const phoneClean = regPhone.trim();

    if (!nameClean || !emailClean || !phoneClean || !regPassword) {
      setError("Please fill out all required fields.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      setError("Please enter a valid work email address.");
      return;
    }

    const phoneDigits = phoneClean.replace(/\D/g, "");
    const last10Digits = phoneDigits.slice(-10);
    if (last10Digits.length !== 10 || !/^[6-9]\d{9}$/.test(last10Digits)) {
      setError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).");
      return;
    }

    if (regPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please re-check.");
      return;
    }

    try {
      setLoading(true);
      const formattedPhone = `+91${last10Digits}`;
      const { backendData } = await registerWithEmailPassword({
        name: nameClean,
        email: emailClean,
        phone: formattedPhone,
        password: regPassword,
        department: regDepartment,
      });

      handleRoleRouting(backendData.role || regDepartment, backendData.name || nameClean);
    } catch (err) {
      console.error("Admin Registration Error:", err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 2. Handle Admin Login
  // ==========================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const emailClean = loginEmail.trim().toLowerCase();
    if (!emailClean || !loginPassword) {
      setError("Please enter both work email and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      setError("Please enter a valid work email address.");
      return;
    }

    try {
      setLoading(true);
      const { backendData } = await loginWithEmailPassword(emailClean, loginPassword, rememberMe);
      handleRoleRouting(backendData.role || "ADMIN", backendData.name || emailClean.split("@")[0]);
    } catch (err) {
      console.error("Admin Login Error:", err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. Handle Forgot Password
  // ==========================================
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const targetEmail = forgotEmail.trim().toLowerCase() || loginEmail.trim().toLowerCase();

    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setError("Please provide a valid work email to receive password reset instructions.");
      return;
    }

    try {
      setForgotLoading(true);
      await resetAdminPassword(targetEmail);
      setForgotSuccess(true);
      toast.success(`Password reset email sent to ${targetEmail}`);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(formatAuthError(err));
    } finally {
      setForgotLoading(false);
    }
  };

  // ==========================================
  // 4. Handle Phone OTP SMS
  // ==========================================
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    const cleanPhone = otpPhone.trim();
    const phoneDigits = cleanPhone.replace(/\D/g, "");
    const last10Digits = phoneDigits.slice(-10);

    if (last10Digits.length !== 10 || !/^[6-9]\d{9}$/.test(last10Digits)) {
      setError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).");
      return;
    }

    try {
      setLoading(true);
      const formattedNumber = `+91${last10Digits}`;
      const confirmation = await sendPhoneOtp(formattedNumber, "recaptcha-container");
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setResendTimer(45);
      toast.info(`OTP code sent to ${formattedNumber}`);
    } catch (err) {
      console.error("Send OTP Error:", err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!otpCode || otpCode.trim().length < 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const { backendData } = await verifyPhoneOtp(confirmationResult, otpCode, "Admin User");
      toast.success(`Phone verified! Welcome back, ${backendData.name || "Admin"}.`);
      navigate("/admin/dashboard");
    } catch (err) {
      console.error("Verify OTP Error:", err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: mode === "register" ? 560 : 460 }}>
        {/* Brand Header */}
        <div className="login-logo">
          <ShieldCheck size={32} color="#111827" />
        </div>

        <div className="admin-badge-pill">
          <ShieldCheck size={14} color="#f59e0b" />
          <span>HINCHMART ADMIN PORTAL</span>
        </div>

        <h1 style={{ margin: "6px 0 3px", fontSize: 22, fontWeight: 800 }}>
          {mode === "register"
            ? "Create Administrative Account"
            : mode === "login"
            ? "Sign in to Admin Dashboard"
            : "Two-Factor SMS OTP Verification"}
        </h1>
        <p style={{ margin: "0 0 18px", color: "#64748b", fontSize: 13.5 }}>
          {mode === "register"
            ? "Privileged access portal for governance & operations"
            : mode === "login"
            ? "Access executive management, catalog, and verification tools"
            : "Instant 6-digit TOTP / SMS code verification"}
        </p>

        {/* Mode Switcher Tabs */}
        <div className="auth-mode-tabs">
          <button
            type="button"
            className={`auth-mode-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
              setOtpSent(false);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
              setOtpSent(false);
            }}
          >
            Register (Sign Up)
          </button>
          <button
            type="button"
            className={`auth-mode-tab ${mode === "otp" ? "active" : ""}`}
            onClick={() => {
              setMode("otp");
              setError("");
              setOtpSent(false);
            }}
          >
            2FA OTP
          </button>
        </div>

        {/* ==========================================
            1. REGISTRATION FORM (Sign Up)
            ========================================== */}
        {mode === "register" && (
          <form onSubmit={handleRegisterSubmit} className="auth-form">
            {/* Full Name */}
            <label>
              <div className="field-label-row">
                <span>Full Name <strong className="req-star">*</strong></span>
                <span className="field-hint">Letters & spaces only (2–100 chars)</span>
              </div>
              <div className="input-icon-wrapper">
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Vikram Sharma"
                  required
                  maxLength={100}
                />
                <User size={16} className="input-lead-icon" />
              </div>
            </label>

            {/* Work Email Address */}
            <label>
              <div className="field-label-row">
                <span>Work Email Address <strong className="req-star">*</strong></span>
                <span className="field-hint">e.g. vikram.sharma@hinchmart.com</span>
              </div>
              <div className="input-icon-wrapper">
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="vikram.sharma@hinchmart.com"
                  required
                />
                <Mail size={16} className="input-lead-icon" />
              </div>
            </label>

            {/* Mobile Number */}
            <label>
              <div className="field-label-row">
                <span>Mobile Number <strong className="req-star">*</strong></span>
                <span className="field-hint">10-digit Indian phone (+91)</span>
              </div>
              <div className="phone-input-group">
                <div className="phone-prefix">+91</div>
                <div className="input-icon-wrapper" style={{ flex: 1 }}>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="9876543210"
                    required
                  />
                  <Phone size={16} className="input-lead-icon" />
                </div>
              </div>
            </label>

            {/* Administrative Department / Role Scope */}
            <label>
              <div className="field-label-row">
                <span>Administrative Department / Role Scope <strong className="req-star">*</strong></span>
              </div>
              <div className="input-icon-wrapper">
                <select
                  value={regDepartment}
                  onChange={(e) => setRegDepartment(e.target.value)}
                  className="admin-select"
                >
                  {ADMIN_DEPARTMENTS.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
                <Building2 size={16} className="input-lead-icon" />
              </div>
              <div className="dept-description-box">
                {ADMIN_DEPARTMENTS.find((d) => d.value === regDepartment)?.description}
              </div>
            </label>

            {/* Password */}
            <label>
              <div className="field-label-row">
                <span>Password <strong className="req-star">*</strong></span>
                <span className="field-hint">Min 8 chars, uppercase, number & symbol</span>
              </div>
              <div className="input-icon-wrapper">
                <input
                  type={showRegPassword ? "text" : "password"}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  required
                  style={{ paddingRight: 40 }}
                />
                <Lock size={16} className="input-lead-icon" />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="input-eye-btn"
                  title={showRegPassword ? "Hide password" : "Show password"}
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Real-time Password Strength Meter */}
              {regPassword.length > 0 && (
                <div className="pwd-strength-container">
                  <div className="pwd-strength-bar-bg">
                    <div
                      className="pwd-strength-bar-fill"
                      style={{
                        width: passwordStrength.width,
                        backgroundColor: passwordStrength.color,
                      }}
                    />
                  </div>
                  <div className="pwd-strength-text" style={{ color: passwordStrength.color }}>
                    Strength: <strong>{passwordStrength.label}</strong>
                  </div>
                </div>
              )}
            </label>

            {/* Confirm Password */}
            <label>
              <div className="field-label-row">
                <span>Confirm Password <strong className="req-star">*</strong></span>
                {passwordsMatch === true && (
                  <span className="pwd-match-badge match">
                    <Check size={12} /> Passwords match
                  </span>
                )}
                {passwordsMatch === false && (
                  <span className="pwd-match-badge mismatch">
                    <X size={12} /> Do not match
                  </span>
                )}
              </div>
              <div className="input-icon-wrapper">
                <input
                  type={showRegConfirmPassword ? "text" : "password"}
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  required
                  style={{ paddingRight: 40 }}
                />
                <Lock size={16} className="input-lead-icon" />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="input-eye-btn"
                  title={showRegConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? (
                "Registering Administrative Account..."
              ) : (
                <>
                  <span>Register Administrative Account</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {/* Single Firebase Project OAuth SSO */}
            <div className="oauth-divider">
              <span>or sign up with</span>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="google-oauth-btn"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>Continue with Google Workspace</span>
            </button>

            <div className="auth-footer-switch">
              Already have an admin account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="text-link-btn"
              >
                Sign In here
              </button>
            </div>
          </form>
        )}

        {/* ==========================================
            2. LOGIN FORM (Sign In)
            ========================================== */}
        {mode === "login" && (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            {/* Work Email */}
            <label>
              <div className="field-label-row">
                <span>Work Email <strong className="req-star">*</strong></span>
              </div>
              <div className="input-icon-wrapper">
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@hinchmart.com"
                  required
                />
                <Mail size={16} className="input-lead-icon" />
              </div>
            </label>

            {/* Password */}
            <label>
              <div className="field-label-row">
                <span>Password <strong className="req-star">*</strong></span>
              </div>
              <div className="input-icon-wrapper">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ paddingRight: 40 }}
                />
                <Lock size={16} className="input-lead-icon" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="input-eye-btn"
                  title={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {/* Remember Me & Forgot Password Row */}
            <div className="login-controls-row">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this workstation</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotEmail(loginEmail);
                  setForgotSuccess(false);
                  setError("");
                  setShowForgotModal(true);
                }}
                className="forgot-pwd-link"
              >
                Forgot Password?
              </button>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <span>Sign In to Portal →</span>
                </>
              )}
            </button>

            {/* Single Firebase Project OAuth SSO */}
            <div className="oauth-divider">
              <span>or sign in with</span>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="google-oauth-btn"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
              <span>Continue with Google Workspace</span>
            </button>

            <div className="auth-footer-switch">
              Need an administrative account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className="text-link-btn"
              >
                Register Admin Account
              </button>
            </div>

            {/* Security Notice */}
            <div className="security-notice-footer">
              <Lock size={13} style={{ flexShrink: 0 }} />
              <span>🔒 Authorized Personnel Only. All access attempts are logged.</span>
            </div>
          </form>
        )}

        {/* ==========================================
            3. PHONE OTP FORM (2FA / MFA)
            ========================================== */}
        {mode === "otp" && (
          <div className="auth-form">
            {!otpSent ? (
              <form onSubmit={handleSendOtp}>
                <label>
                  <div className="field-label-row">
                    <span>Registered Admin Mobile Phone <strong className="req-star">*</strong></span>
                  </div>
                  <div className="phone-input-group">
                    <div className="phone-prefix">+91</div>
                    <div className="input-icon-wrapper" style={{ flex: 1 }}>
                      <input
                        type="tel"
                        value={otpPhone}
                        onChange={(e) => setOtpPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="9876543210"
                        required
                      />
                      <Phone size={16} className="input-lead-icon" />
                    </div>
                  </div>
                  <span className="field-hint" style={{ marginTop: 4 }}>
                    Enter 10-digit phone linked to your admin profile
                  </span>
                </label>

                {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}

                <button type="submit" disabled={loading} className="auth-submit-btn" style={{ marginTop: 16 }}>
                  {loading ? (
                    "Sending SMS OTP..."
                  ) : (
                    <>
                      <span>Send Verification OTP</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="otp-sent-info-box">
                  <div style={{ fontSize: 12, color: "#64748b" }}>Code dispatched via SMS to:</div>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15, marginTop: 2 }}>
                    +91 {otpPhone.slice(-10)}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode("");
                      setError("");
                    }}
                    className="change-number-btn"
                  >
                    Change Mobile Number
                  </button>
                </div>

                <label>
                  <div className="field-label-row">
                    <span>Enter 6-Digit TOTP / SMS Code <strong className="req-star">*</strong></span>
                  </div>
                  <div className="input-icon-wrapper">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • • • •"
                      required
                      autoFocus
                      className="otp-code-input"
                    />
                    <KeyRound size={16} className="input-lead-icon" />
                  </div>
                </label>

                {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="auth-submit-btn"
                  style={{ marginTop: 16 }}
                >
                  {loading ? (
                    "Verifying Authorization..."
                  ) : (
                    <>
                      <span>Verify & Access Dashboard</span>
                      <CheckCircle2 size={17} />
                    </>
                  )}
                </button>

                <div className="otp-resend-row">
                  {resendTimer > 0 ? (
                    <span>
                      Resend SMS OTP in <strong>{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="resend-otp-btn"
                    >
                      Resend SMS OTP Code
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="auth-footer-switch" style={{ marginTop: 20 }}>
              Prefer email credentials?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="text-link-btn"
              >
                Sign In with Password
              </button>
            </div>
          </div>
        )}

        {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
        <div id="recaptcha-container"></div>

        {/* System Credentials Footer */}
        <div className="login-card-foot">
          <span>🔒 Spring Boot Sync</span>
          <span>•</span>
          <span>Firebase Auth Engine</span>
          <span>•</span>
          <span>Role Guard Protected</span>
        </div>
      </div>

      {/* ==========================================
          FORGOT PASSWORD MODAL
          ========================================== */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-card forgot-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="modal-icon-badge">
                  <KeyRound size={20} color="#d97706" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Self-Service Password Reset</h3>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#64748b" }}>
                    We will send secure recovery instructions to your work email.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="forgot-success-box">
                <CheckCircle2 size={32} color="#10b981" style={{ margin: "0 auto 10px" }} />
                <h4 style={{ margin: "0 0 6px", color: "#065f46" }}>Reset Link Dispatched</h4>
                <p style={{ margin: 0, fontSize: 13, color: "#047857" }}>
                  Please check your inbox at <strong>{forgotEmail || loginEmail}</strong> for instructions to reset your admin password.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="auth-submit-btn"
                  style={{ marginTop: 18 }}
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} style={{ marginTop: 16 }}>
                <label>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>
                    Admin Work Email Address
                  </span>
                  <div className="input-icon-wrapper" style={{ marginTop: 6 }}>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="admin@hinchmart.com"
                      required
                      autoFocus
                    />
                    <Mail size={16} className="input-lead-icon" />
                  </div>
                </label>

                {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="modal-cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="auth-submit-btn"
                    style={{ flex: 1, margin: 0 }}
                  >
                    {forgotLoading ? "Dispatching Email..." : "Send Reset Link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}