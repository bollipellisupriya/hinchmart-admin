import React, { createContext, useContext, useEffect, useState } from "react";
import {
  registerWithEmailPassword,
  loginWithEmailPassword,
  loginWithGoogle,
  resetAdminPassword,
  logoutUser,
  getAuthToken,
  onAuthStateChangedListener,
} from "./authService";

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  register: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
  getIdToken: async () => null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("adminUser");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("adminToken");
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      // If token exists, we are already ready to render without full-screen blocking
      return !localStorage.getItem("adminToken") && !localStorage.getItem("adminUser");
    }
    return true;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const idToken = await currentUser.getIdToken();
          setToken(idToken);
        } catch {
          // Keep existing token if refresh fails momentarily
        }
      } else {
        // Only clear if localStorage also doesn't have an active admin session
        const storedToken = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
        if (!storedToken) {
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (email, password, rememberMe = false) => {
    const res = await loginWithEmailPassword(email, password, rememberMe);
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const handleRegister = async (data) => {
    const res = await registerWithEmailPassword(data);
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const handleGoogleLogin = async () => {
    const res = await loginWithGoogle();
    setUser(res.user);
    setToken(res.token);
    return res;
  };

  const handleResetPassword = async (email) => {
    return await resetAdminPassword(email);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user || !!token,
    login: handleLogin,
    loginWithGoogle: handleGoogleLogin,
    register: handleRegister,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    getIdToken: getAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;

