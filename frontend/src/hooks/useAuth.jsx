import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

/**
 * AuthProvider
 *
 * Responsibilities:
 *  - Persist JWT in localStorage
 *  - On mount, call /api/auth/me to rehydrate the user from the stored token
 *  - Expose { user, loading, login, logout } to the whole app
 *
 * `loading` stays true until the initial /me call resolves (or is skipped
 * when no token exists). Consumers must gate protected UI on !loading so
 * we never flash the wrong view before auth is determined.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Start as true — we don't know auth state until the /me call returns.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/api/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        // Token is invalid/expired — clear it so the user gets a clean slate.
        localStorage.removeItem("token");
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Called after a successful login.
   * Stores the token and sets the user in context so downstream
   * components re-render immediately without an extra network call.
   */
  const login = useCallback((token, userData) => {
    localStorage.setItem("token", token);
    setUser(userData);
  }, []);

  /**
   * Clears all auth state. Any protected route will redirect to /login.
   */
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
