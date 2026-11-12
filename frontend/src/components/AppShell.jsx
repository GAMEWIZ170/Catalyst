import { useEffect, useRef, useState } from "react";
import { Link, useMatch, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";

function MailIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </svg>;
}

function FlameIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21a7 7 0 0 0 7-7c0-4.1-3.1-6.7-5.3-9.5-.6 2.2-1.6 3.4-2.8 4.3.1-2.8-.9-4.5-2-5.8C8.5 7.7 5 10 5 14a7 7 0 0 0 7 7Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    <path d="M12 21a3.3 3.3 0 0 0 3.3-3.3c0-1.7-1.1-2.8-2.3-4-.4 1.1-.9 1.7-1.5 2.1-.1-1-.4-1.6-.8-2.2-.8 1.1-1.9 2.1-1.9 4.1A3.3 3.3 0 0 0 12 21Z" fill="currentColor" />
  </svg>;
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // A test hides the site navigation so nothing pulls attention from the question.
  const focusMode = Boolean(useMatch("/tests/:id"));
  const [streak, setStreak] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationButtonRef = useRef(null);
  const profileButtonRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    api.getStreak().then(({ data }) => setStreak(data.streak)).catch(() => setStreak(null));
  }, []);

  useEffect(() => {
    const refresh = () => api.getStreak().then(({ data }) => setStreak(data.streak)).catch(() => setStreak(null));
    window.addEventListener("catalyst:refresh-streak", refresh);
    return () => window.removeEventListener("catalyst:refresh-streak", refresh);
  }, []);

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

  if (focusMode) return <div className="app-shell app-shell--focus"><main className="page-wrap">{children}</main></div>;

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
              <MailIcon />
            </button>
            {notificationsOpen && <div className="notification-panel" id="notification-panel" role="status">
              <strong>No notifications yet</strong>
              <span>Messages from Catalyst will appear here.</span>
            </div>}
          </div>
          <ThemeToggle />
          {streak !== null && <span className="streak-indicator" aria-label={`Current streak: ${streak} ${streak === 1 ? "day" : "days"}`}>
            <FlameIcon /><span>{streak}</span>
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
      <footer className="footer">Keep learning with momentum.</footer>
    </div>
  );
}
