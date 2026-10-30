import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <nav className="topnav" aria-label="Primary navigation">
          <NavLink to="/courses">Courses</NavLink>
          <NavLink to="/progress">Progress</NavLink>
          {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
          <button className="nav-logout" onClick={handleLogout}>Log out</button>
        </nav>
      </header>
      <main className="page-wrap">{children}</main>
      <footer className="footer">Keep learning with momentum.</footer>
    </div>
  );
}
