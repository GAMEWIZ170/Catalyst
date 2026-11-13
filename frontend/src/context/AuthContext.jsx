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

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const response = await api.login(credentials);
      clearCache();
      setUser(response.data);
      return response;
    },
    async register(details) {
      const response = await api.register(details);
      clearCache();
      setUser(response.data);
      return response;
    },
    async logout() {
      await api.logout();
      clearCache();
      setUser(null);
    },
    async updateAvatar(avatar) {
      const response = await api.updateAvatar({ avatar });
      setUser(response.data);
      return response;
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
