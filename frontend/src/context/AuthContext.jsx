import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { clearCache } from "../api/cache";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then(({ data }) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // The streak lives on the user so every screen reads one number. /auth/me includes it; after login it is
  // fetched once, and after anything that changes progress the screens fire "catalyst:refresh-streak".
  const refreshStreak = () => api.getStreak()
    .then(({ data }) => setUser((current) => (current ? { ...current, streak: data.streak } : current)))
    .catch(() => {});

  useEffect(() => {
    window.addEventListener("catalyst:refresh-streak", refreshStreak);
    return () => window.removeEventListener("catalyst:refresh-streak", refreshStreak);
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const response = await api.login(credentials);
      clearCache();
      setUser(response.data);
      refreshStreak();
      return response;
    },
    async register(details) {
      const response = await api.register(details);
      clearCache();
      setUser(response.data);
      refreshStreak();
      return response;
    },
    async logout() {
      await api.logout();
      clearCache();
      setUser(null);
    },
    markVerified() {
      setUser((current) => (current ? { ...current, emailVerified: true } : current));
    },
    async deleteAccount(body) {
      await api.deleteAccount(body);
      clearCache();
      setUser(null);
    },
    async updatePreferences(body) {
      const response = await api.updatePreferences(body);
      clearCache();
      setUser((current) => ({ ...current, ...response.data }));
      return response;
    },
    async updateAvatar(avatar) {
      const response = await api.updateAvatar({ avatar });
      // The avatar response has no streak; keep the one we have.
      setUser((current) => ({ ...response.data, streak: current?.streak }));
      return response;
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
