import { Link, NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [streak, setStreak] = useState(null);

  useEffect(() => {
    api.getStreak().then(({ data }) => setStreak(data.streak)).catch(() => setStreak(null));
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/courses" aria-label="Catalyst home">
          <span className="brand-mark">C</span>
          <span>Catalyst</span>
        </Link>
        <div className="topbar-tools">
          <ThemeToggle />
          {streak !== null && <Link className="streak-link" to="/progress">{streak} day streak</Link>}
          <details className="account-menu">
            <summary className="account-summary">
              <span className="account-name">{user?.name || "Account"}</span>
            </summary>
            <nav className="account-panel" aria-label="Account navigation">
              <NavLink to="/courses">Courses</NavLink>
              <NavLink to="/progress">Progress</NavLink>
              {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
              <button onClick={handleLogout}>Log out</button>
            </nav>
          </details>
        </div>
      </header>
      <main className="page-wrap">{children}</main>
      <footer className="footer">Keep learning with momentum.</footer>
    </div>
  );
}
