import axios from "axios";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "https://api.hinchmart.com";
// If an absolute URL is provided (e.g. https://api.hinchmart.com or http://localhost:8080),
// connect directly from the browser to avoid Node.js dev-proxy TLS renegotiation / ECONNRESET errors.
// The backend CORS already allows http://localhost:5173.
const isExplicitProxy = typeof configuredBaseUrl === "string" && (configuredBaseUrl.startsWith("/") || configuredBaseUrl === "");
const apiBaseUrl = isExplicitProxy
  ? (configuredBaseUrl || "/api")
  : `${configuredBaseUrl.replace(/\/+$/, "").replace(/\/api$/, "")}/api`;

const api = axios.create({
  // API clients use relative resource paths such as `/products`.
  baseURL: apiBaseUrl,
  timeout: 35000,
});

import { auth } from "../firebase/firebaseConfig";

/**
 * Waits for Firebase Auth to finish rehydrating the currentUser after a page
 * reload. Firebase loads user state asynchronously; auth.currentUser is null
 * until `onAuthStateChanged` fires. We wait up to ~2 seconds so we never
 * silently fall through to a stale localStorage token.
 */
const waitForFirebaseUser = () => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 2000);

    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
};

/**
 * Returns a fresh Firebase ID token. Always prefers Firebase SDK (which
 * auto-refreshes expired tokens) and only falls back to localStorage when
 * Firebase has no signed-in user at all.
 */
const getFreshToken = async () => {
  let currentUser = auth.currentUser;

  // If Firebase hasn't rehydrated yet (page reload), wait briefly.
  if (!currentUser) {
    currentUser = await waitForFirebaseUser();
  }

  if (currentUser) {
    try {
      // getIdToken() returns a fresh token, auto-refreshing if expired.
      const token = await currentUser.getIdToken();
      // Keep localStorage in sync for the brief rehydration window on next reload.
      if (typeof window !== "undefined" && token) {
        localStorage.setItem("authToken", token);
        localStorage.setItem("adminToken", token);
      }
      return token;
    } catch (err) {
      console.warn("Firebase getIdToken() failed:", err?.message);
    }
  }

  // Last resort: user is truly signed out, use whatever is cached.
  // This will likely fail with 401, which the response interceptor handles.
  if (typeof window !== "undefined") {
    return (
      localStorage.getItem("authToken") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("token") ||
      null
    );
  }
  return null;
};

// Attach Firebase Token to all requests
api.interceptors.request.use(
  async (config) => {
    // If data is FormData, remove manual Content-Type so browser sets boundary correctly
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (config.headers) {
        if (typeof config.headers.delete === "function") {
          config.headers.delete("Content-Type");
          config.headers.delete("content-type");
        }
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    } else if (config.data !== undefined && config.headers && !config.headers["Content-Type"]) {
      config.headers["Content-Type"] = "application/json";
    }

    try {
      const idToken = await getFreshToken();
      if (idToken && config.headers) {
        if (typeof config.headers.set === "function") {
          config.headers.set("Authorization", `Bearer ${idToken}`);
        }
        config.headers.Authorization = `Bearer ${idToken}`;
        config.headers["Authorization"] = `Bearer ${idToken}`;
      }
    } catch (err) {
      console.warn("Failed to attach Firebase token to request:", err);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Global Error Handler for 401 and 403 — with single-retry token refresh
let isRedirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    // On 401 Unauthorized, try ONE forced token refresh + retry
    if (status === 401 && originalRequest && !originalRequest._retried) {
      originalRequest._retried = true;

      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Force-refresh the token (bypasses SDK cache)
          const freshToken = await currentUser.getIdToken(true);
          if (freshToken) {
            if (typeof window !== "undefined") {
              localStorage.setItem("authToken", freshToken);
              localStorage.setItem("adminToken", freshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${freshToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshErr) {
        console.warn("Token refresh on 401 failed:", refreshErr?.message);
      }

      // If refresh failed and it's a critical auth endpoint, redirect to login
      const url = originalRequest.url || "";
      if (url.includes("/auth/me") || url.includes("/auth/sync")) {
        if (!isRedirectingToLogin && typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          isRedirectingToLogin = true;
          localStorage.removeItem("adminToken");
          localStorage.removeItem("authToken");
          localStorage.removeItem("adminUser");
          setTimeout(() => {
            window.location.href = "/login";
          }, 300);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
