import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useMatch, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { BarChart3, House, Mail, UserRound, Zap } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import ShortcutHelp from "./ShortcutHelp";

// Phones get a bottom tab bar for the places a student goes most. Laptops keep the top bar only.
const TABS = [
  { to: "/courses", label: "Home", icon: House },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/settings", label: "Profile", icon: UserRound }
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // A test hides the site navigation so nothing pulls attention from the question.
  const focusMode = Boolean(useMatch("/tests/:id")) || Boolean(useMatch("/welcome"));
  const streak = user?.streak ?? null;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationButtonRef = useRef(null);
  const profileButtonRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest(".notification-menu")) setNotificationsOpen(false);
      if (!event.target.closest(".profile-menu")) setProfileOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (notificationsOpen) {
          setNotificationsOpen(false);
          notificationButtonRef.current?.focus();
        }
        if (profileOpen) {
          setProfileOpen(false);
          profileButtonRef.current?.focus();
        }
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [notificationsOpen, profileOpen]);

  useEffect(() => {
    if (profileOpen) profileMenuRef.current?.querySelector("[role='menuitem']")?.focus();
  }, [profileOpen]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  function moveProfileFocus(event) {
    const items = [...profileMenuRef.current.querySelectorAll("[role='menuitem']")];
    const current = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(current + direction + items.length) % items.length]?.focus();
    }
  }

  if (focusMode) return <div className="app-shell app-shell--focus"><main className="page-wrap">{children}</main><ShortcutHelp /></div>;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/courses" aria-label="Catalyst home">
          <span className="brand-mark">C</span>
          <span>Catalyst</span>
        </Link>
        <div className="topbar-tools">
          <div className="notification-menu">
            <button
              ref={notificationButtonRef}
              className="icon-button"
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
              aria-controls="notification-panel"
              onClick={() => {
                setNotificationsOpen((current) => !current);
                setProfileOpen(false);
              }}
            >
              <Mail size={20} aria-hidden="true" />
            </button>
            {notificationsOpen && <div className="notification-panel" id="notification-panel" role="status">
              <strong>No notifications yet</strong>
              <span>Messages from Catalyst will appear here.</span>
            </div>}
          </div>
          <ThemeToggle />
          {streak !== null && <span className="streak-indicator" aria-label={`Current streak: ${streak} ${streak === 1 ? "day" : "days"}`}>
            <Zap size={16} aria-hidden="true" /><span>{streak}</span>
          </span>}
          <div className="profile-menu">
            <button
              ref={profileButtonRef}
              className="profile-button"
              type="button"
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              onClick={() => {
                setProfileOpen((current) => !current);
                setNotificationsOpen(false);
              }}
            >
              <Avatar avatar={user?.avatar} name={user?.name} size={40} />
            </button>
            {profileOpen && <div className="profile-panel" ref={profileMenuRef} role="menu" onKeyDown={moveProfileFocus}>
              <div className="profile-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
              </div>
              <Link role="menuitem" tabIndex="-1" to="/settings" onClick={() => setProfileOpen(false)}>Settings</Link>
              <Link role="menuitem" tabIndex="-1" to="/progress" onClick={() => setProfileOpen(false)}>My progress</Link>
              {user?.role === "admin" && <Link role="menuitem" tabIndex="-1" to="/admin" onClick={() => setProfileOpen(false)}>Admin</Link>}
              <button role="menuitem" tabIndex="-1" type="button" onClick={handleLogout}>Log out</button>
            </div>}
          </div>
        </div>
      </header>
      <main className="page-wrap">{children}</main>
      <ShortcutHelp />
      <footer className="footer">Keep learning with momentum.</footer>
      {user?.role === "student" && <nav className="tabbar" aria-label="Main">
        {TABS.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className="tabbar-link">
          <Icon size={22} aria-hidden="true" /><span>{label}</span>
        </NavLink>)}
      </nav>}
    </div>
  );
}
