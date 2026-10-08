import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "./firebaseConfig";

/**
 * Maps Firebase Auth error codes to user-friendly messages.
 */
export const formatAuthError = (error) => {
  if (!error) return "An unexpected error occurred.";
  const code = error.code || "";
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before finishing.";
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled.";
    case "auth/invalid-email":
      return "The email address is invalid.";
    case "auth/user-disabled":
      return "This user account has been disabled by administrators.";
    case "auth/user-not-found":
      return "No registered admin account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please verify and try again.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists.";
    case "auth/weak-password":
      return "Password should be at least 8 characters with letters, numbers, and symbols.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a few minutes before retrying.";
    case "auth/invalid-phone-number":
      return "Invalid phone number format. Please enter a 10-digit Indian number (+91).";
    case "auth/missing-phone-number":
      return "Phone number is required.";
    case "auth/invalid-verification-code":
      return "Incorrect 6-digit verification code. Please check and try again.";
    case "auth/code-expired":
      return "The OTP code has expired. Please request a new code.";
    case "auth/quota-exceeded":
      return "SMS message quota exceeded. Please try again later.";
    case "auth/captcha-check-failed":
      return "reCAPTCHA verification failed. Please refresh the page and try again.";
    default:
      return error.message || "Authentication failed. Please try again.";
  }
};

/**
 * Normalizes phone numbers to standard E.164 format (+91...)
 */
export const formatPhoneNumber = (phone, defaultCountry = "+91") => {
  if (!phone) return "";
  let clean = phone.trim().replace(/[\s\-()]/g, "");
  if (!clean.startsWith("+")) {
    clean = `${defaultCountry}${clean.replace(/^0+/, "")}`;
  }
  return clean;
};

/**
 * Validates Admin Secret Passkey / Invite Code
 */
export const validateAdminInviteKey = (key) => {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim().toUpperCase();
  // Validates non-empty secret passkey format (e.g. ADM-..., HINCHMART-..., or any secret of at least 6 chars)
  return trimmed.length >= 6;
};

/**
 * Checks if the user / claims have administrative permissions
 */
export const isAdminRole = (role, claims = {}) => {
  if (!role && !claims) return false;
  const normalizedRole = String(role || "").toUpperCase();
  if (
    normalizedRole === "ADMIN" ||
    normalizedRole === "SUPER_ADMIN" ||
    normalizedRole === "COMPLIANCE_ADMIN" ||
    normalizedRole === "CATALOG_ADMIN" ||
    normalizedRole === "SUPPORT_ADMIN" ||
    normalizedRole.includes("ADMIN")
  ) {
    return true;
  }
  if (claims?.admin === true || String(claims?.role || "").toUpperCase().includes("ADMIN")) {
    return true;
  }
  return false;
};

/**
 * Sets up or returns existing reCAPTCHA verifier instance.
 */
export const setupRecaptcha = (containerId = "recaptcha-container", invisible = true) => {
  if (typeof window === "undefined") return null;

  try {
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
  } catch (e) {
    window.recaptchaVerifier = null;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`reCAPTCHA container #${containerId} not found in DOM`);
  }

  const targetElement = container || containerId;

  window.recaptchaVerifier = new RecaptchaVerifier(auth, targetElement, {
    size: invisible ? "invisible" : "normal",
    callback: () => {},
    "expired-callback": () => {
      console.warn("reCAPTCHA expired. Please request a new OTP.");
    },
  });

  return window.recaptchaVerifier;
};

/**
 * Sends Phone SMS OTP via Firebase Authentication
 */
export const sendPhoneOtp = async (phoneNumber, containerId = "recaptcha-container") => {
  const formattedNumber = formatPhoneNumber(phoneNumber);
  const appVerifier = setupRecaptcha(containerId, true);
  
  if (appVerifier) {
    try {
      await appVerifier.render();
    } catch (renderErr) {
      console.warn("reCAPTCHA render notice:", renderErr);
    }
  }

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, formattedNumber, appVerifier);
    return confirmationResult;
  } catch (err) {
    console.error("signInWithPhoneNumber failed:", err);
    throw err;
  }
};

/**
 * Verifies 6-digit Phone OTP and authenticates admin
 */
export const verifyPhoneOtp = async (confirmationResult, otpCode, displayName = "") => {
  if (!confirmationResult || !otpCode) {
    throw new Error("Missing OTP confirmation result or verification code.");
  }

  const userCredential = await confirmationResult.confirm(otpCode.trim());
  const user = userCredential.user;

  if (displayName && displayName.trim() && !user.displayName) {
    try {
      await updateProfile(user, { displayName: displayName.trim() });
    } catch (profileErr) {
      console.warn("Failed to update user profile displayName:", profileErr);
    }
  }

  const token = await user.getIdToken(true);
  let backendData = null;

  try {
    const { AdminService } = await import("../api/adminService");
    const syncRes = await AdminService.syncAuth({
      name: displayName || user.displayName || "Admin User",
      email: user.email || `${user.phoneNumber || "admin"}@hinchmart.com`,
      phone: user.phoneNumber || "",
      role: "ADMIN",
    });
    backendData = syncRes?.data || syncRes;
  } catch (syncErr) {
    console.warn("Backend auth/sync notice:", syncErr?.message);
  }

  // Role Guard Check
  const effectiveRole = backendData?.role || "ADMIN";
  const effectiveClaims = backendData?.claims || { role: "ADMIN", admin: true };

  if (!isAdminRole(effectiveRole, effectiveClaims)) {
    await signOut(auth);
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("adminUser");
    }
    throw new Error("Access Denied: Your account does not have administrative privileges.");
  }

  const adminSession = {
    userId: backendData?.userId || null,
    firebaseUid: user.uid,
    phoneNumber: user.phoneNumber,
    email: user.email || `${user.phoneNumber}@hinchmart.com`,
    name: backendData?.name || displayName || user.displayName || user.phoneNumber || "Admin",
    role: effectiveRole,
    claims: effectiveClaims,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", token);
    localStorage.setItem("adminToken", token);
    localStorage.setItem("userRole", effectiveRole || "ADMIN");
    localStorage.setItem("adminUser", JSON.stringify(adminSession));
  }

  return { user, token, backendData: adminSession };
};

/**
 * Registers a new Admin user with Email, Password, and Role/Department.
 * @param {{ name: string, email: string, phone: string, password: string, department: string, inviteKey?: string }} data
 */
export const registerWithEmailPassword = async ({
  name,
  email,
  phone,
  password,
  department = "ADMIN",
  inviteKey = "",
}) => {
  // 1. Set Local Persistence for Registration
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (persErr) {
    console.warn("Could not set persistence:", persErr);
  }

  // 3. Create Firebase User
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPhone = formatPhoneNumber(phone);

  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  const user = userCredential.user;

  // 4. Update Profile Display Name
  if (cleanName) {
    try {
      await updateProfile(user, { displayName: cleanName });
    } catch (profileErr) {
      console.warn("Failed to update displayName:", profileErr);
    }
  }

  // 5. Retrieve Firebase JWT Token
  const initialToken = await user.getIdToken(true);
  let activeToken = initialToken;

  // 6. Call Backend Sync & Claim APIs: POST /api/auth/sync & POST /api/auth/claim-admin
  let backendData = null;
  try {
    const { AdminService } = await import("../api/adminService");
    const syncRes = await AdminService.syncAuth({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: department || "ADMIN",
    });
    backendData = syncRes?.data || syncRes;

    // Set custom claim and refresh token with ADMIN role
    try {
      await AdminService.claimAdmin();
      const refreshed = await user.getIdToken(true);
      if (refreshed) activeToken = refreshed;
    } catch {}
  } catch (syncErr) {
    console.warn("Backend auth/sync notice:", syncErr?.message);
  }

  // 7. Verify Admin Role / Store Session
  const effectiveRole = backendData?.role || department || "ADMIN";
  const effectiveClaims = backendData?.claims || { role: effectiveRole, admin: true };

  const adminSession = {
    userId: backendData?.userId || null,
    firebaseUid: user.uid,
    email: user.email || cleanEmail,
    name: backendData?.name || cleanName || "Admin",
    phone: cleanPhone || user.phoneNumber || "",
    role: effectiveRole,
    department: department,
    sellerId: backendData?.sellerId || null,
    claims: effectiveClaims,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", activeToken);
    localStorage.setItem("adminToken", activeToken);
    localStorage.setItem("userRole", effectiveRole || "ADMIN");
    localStorage.setItem("adminUser", JSON.stringify(adminSession));
  }

  return { user, token: activeToken, backendData: adminSession };
};

/**
 * Logs in an existing Admin with Email, Password, and optional Remember Me persistence.
 * @param {string} email
 * @param {string} password
 * @param {boolean} [rememberMe=false]
 */
export const loginWithEmailPassword = async (email, password, rememberMe = false) => {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Set Firebase Session Persistence based on Remember Me
  try {
    const persistenceMode = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceMode);
  } catch (persErr) {
    console.warn("Could not set session persistence:", persErr);
  }

  // 2. Authenticate with Firebase
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  const user = userCredential.user;

  // 3. Retrieve Firebase ID Token (JWT)
  const initialToken = await user.getIdToken();
  let activeToken = initialToken;

  // 4. Synchronize with Backend (POST /api/auth/sync & POST /api/auth/claim-admin)
  let backendData = null;
  try {
    const { AdminService } = await import("../api/adminService");
    const syncRes = await AdminService.syncAuth({
      name: user.displayName || cleanEmail.split("@")[0] || "Admin User",
      email: cleanEmail,
      phone: user.phoneNumber || "",
      role: "ADMIN",
    });
    backendData = syncRes?.data || syncRes;

    try {
      await AdminService.claimAdmin();
      const refreshed = await user.getIdToken(true);
      if (refreshed) activeToken = refreshed;
    } catch {}
  } catch (syncErr) {
    console.warn("Backend auth/sync notice:", syncErr?.message);
  }

  // 5. Check Backend Response Role / Authorization Guard
  const effectiveRole = backendData?.role || "ADMIN";
  const effectiveClaims = backendData?.claims || { role: "ADMIN", admin: true };

  if (!isAdminRole(effectiveRole, effectiveClaims)) {
    // Not an admin: force sign out
    await signOut(auth);
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("adminUser");
    }
    throw new Error("Access Denied: Your account does not have administrative privileges.");
  }

  const adminSession = {
    userId: backendData?.userId || null,
    firebaseUid: user.uid,
    email: user.email || cleanEmail,
    name: backendData?.name || user.displayName || cleanEmail.split("@")[0] || "Admin",
    phone: backendData?.phone || user.phoneNumber || "",
    role: effectiveRole,
    sellerId: backendData?.sellerId || null,
    claims: effectiveClaims,
  };

  // 6. Persist Admin Session
  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", activeToken);
    localStorage.setItem("adminToken", activeToken);
    localStorage.setItem("userRole", effectiveRole || "ADMIN");
    localStorage.setItem("adminUser", JSON.stringify(adminSession));
  }

  return { user, token: activeToken, backendData: adminSession };
};

/**
 * Authenticates with Google OAuth (Single Firebase Project)
 * Calls POST /api/auth/sync and extracts role for dashboard routing
 */
export const loginWithGoogle = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {}

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;
  const initialToken = await user.getIdToken(true);
  let activeToken = initialToken;

  // Synchronize with backend database: POST /api/auth/sync & POST /api/auth/claim-admin
  let backendData = null;
  try {
    const { AdminService } = await import("../api/adminService");
    const syncRes = await AdminService.syncAuth({
      name: user.displayName || user.email?.split("@")[0] || "Admin",
      email: user.email || "",
      phone: user.phoneNumber || "",
      role: "ADMIN",
    });
    backendData = syncRes?.data || syncRes;

    try {
      await AdminService.claimAdmin();
      const refreshed = await user.getIdToken(true);
      if (refreshed) activeToken = refreshed;
    } catch {}
  } catch (syncErr) {
    console.warn("Backend auth/sync notice:", syncErr?.message);
  }

  const effectiveRole = String(backendData?.role || "ADMIN").toUpperCase();
  const effectiveClaims = backendData?.claims || { role: effectiveRole, admin: effectiveRole === "ADMIN" };

  if (!isAdminRole(effectiveRole, effectiveClaims)) {
    await signOut(auth);
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("adminUser");
    }
    const error = new Error(`Access Denied: Your account role is '${effectiveRole}'. Redirecting to appropriate portal...`);
    error.role = effectiveRole;
    throw error;
  }

  const adminSession = {
    userId: backendData?.userId || null,
    firebaseUid: user.uid,
    email: user.email,
    name: backendData?.name || user.displayName || user.email?.split("@")[0] || "Admin",
    phone: backendData?.phone || user.phoneNumber || "",
    role: effectiveRole,
    sellerId: backendData?.sellerId || null,
    claims: effectiveClaims,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("authToken", activeToken);
    localStorage.setItem("adminToken", activeToken);
    localStorage.setItem("userRole", effectiveRole || "ADMIN");
    localStorage.setItem("adminUser", JSON.stringify(adminSession));
  }

  return { user, token: activeToken, backendData: adminSession, role: effectiveRole };
};


/**
 * Sends Password Reset Email via Firebase Auth
 * @param {string} email
 */
export const resetAdminPassword = async (email) => {
  if (!email || !email.trim()) {
    throw new Error("Please enter your registered work email address.");
  }
  const cleanEmail = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, cleanEmail);
  return true;
};

/**
 * Signs out the currently authenticated admin.
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("userRole");
      localStorage.removeItem("adminUser");
    }
  }
};

/**
 * Gets the currently authenticated user.
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Gets the Firebase ID Token for sending to backend in Authorization: Bearer <token>.
 */
export const getAuthToken = async (forceRefresh = false) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken(forceRefresh);
      if (typeof window !== "undefined" && token) {
        localStorage.setItem("authToken", token);
        localStorage.setItem("adminToken", token);
      }
      return token;
    } catch (err) {
      console.warn("Error refreshing Firebase ID token:", err);
    }
  }

  if (typeof window !== "undefined") {
    return localStorage.getItem("authToken") || localStorage.getItem("adminToken") || null;
  }
  return null;
};

/**
 * Subscribes to Firebase Auth state changes.
 */
export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const token = await user.getIdToken();
        if (typeof window !== "undefined") {
          localStorage.setItem("authToken", token);
          localStorage.setItem("adminToken", token);
          const existingUser = localStorage.getItem("adminUser");
          if (!existingUser) {
            localStorage.setItem("adminUser", JSON.stringify({
              uid: user.uid,
              firebaseUid: user.uid,
              phoneNumber: user.phoneNumber,
              email: user.email,
              name: user.displayName || user.phoneNumber || user.email?.split("@")[0] || "Admin",
              role: "ADMIN",
            }));
            localStorage.setItem("userRole", "ADMIN");
          }
        }
      } catch {}
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("userRole");
        localStorage.removeItem("adminUser");
      }
    }
    callback(user);
  });
};

