import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useMatch, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { Bell, BookOpen, Shield, FlaskConical, House, Layers, PanelLeftClose, PanelLeftOpen, Search, Settings, UserRound, Zap } from "lucide-react";
import ShortcutHelp from "./ShortcutHelp";
import NotificationPanel, { useNotifications } from "./NotificationPanel";
import { LevelUpDialog, useAchievementToasts, useXp } from "./XpBits";
import QuickSettings from "./QuickSettings";
import { TimerAnnouncer, TimerButton, TimerPanel } from "./TimerMenu";
import { useTimer } from "../context/TimerContext";
import useStudyTimer from "../utils/useStudyTimer";
import { useOnline } from "../utils/offline";
import { t } from "../i18n";

// The places a student goes. Laptops show them in a sidebar, phones in a bar along the bottom (never both).
// "Me" also covers the pages inside it, so it stays highlighted on Progress, Saved and Settings.
const PLACES = [
  { to: "/home", label: "nav.home", icon: House, end: true },
  { to: "/courses", label: "nav.courses", icon: BookOpen },
  { to: "/review", label: "nav.review", icon: Layers },
  { to: "/lab", label: "nav.lab", icon: FlaskConical, also: ["/community"] },
  { to: "/me", label: "nav.me", icon: UserRound, also: ["/progress", "/settings", "/saved", "/achievements", "/exams", "/hall"] }
];

const ADMIN_PLACE = { to: "/admin", label: "nav.admin", icon: Shield };

const sidebarKey = "catalyst-sidebar";
const readCollapsed = () => { try { return window.localStorage.getItem(sidebarKey) === "collapsed"; } catch { return false; } };

function PlaceLink({ place, pathname, collapsed }) {
  const Icon = place.icon;
  const inside = place.also?.some((prefix) => pathname.startsWith(prefix)) || (place.to === "/admin" && pathname.startsWith("/admin"));
  const body = <><Icon size={22} aria-hidden="true" /><span className="place-label">{t(place.label)}</span></>;
  const title = collapsed ? t(place.label) : undefined;
  // NavLink would overwrite aria-current on a page inside this place, so those use a plain Link.
  if (inside) return <Link to={place.to} className="place-link is-current" aria-current="page" title={title}>{body}</Link>;
  return <NavLink to={place.to} end={place.end} className={({ isActive }) => `place-link${isActive ? " is-current" : ""}`} title={title}>{body}</NavLink>;
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // A test hides the site navigation so nothing pulls attention from the question.
  // Every useMatch runs on every render (no ||), because React needs the same hooks in the same order each time.
  const focusMatches = [useMatch("/tests/:id"), useMatch("/tests/:id/exam"), useMatch("/practice/*"), useMatch("/welcome")];
  const focusMode = focusMatches.some(Boolean);
  const streak = user?.streak ?? null;
  const { timer } = useTimer();
  // Study time is counted for a minutes goal, and while a focus session runs (the server needs it to count focus minutes).
  useStudyTimer(Boolean(user) && (user?.dailyGoal?.kind === "minutes" || Boolean(timer && !timer.done && timer.phase === "work")));
  const notifications = useNotifications(Boolean(user));
  const { xp, dismiss: dismissLevelUp } = useXp(Boolean(user), pathname);
  useAchievementToasts(xp);
  const online = useOnline();
  // Only one top bar popover is open at a time: "notifications", "quick", "profile" or none.
  const [open, setOpen] = useState(null);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const buttons = useRef({});
  const quickRef = useRef(null);
  const profileMenuRef = useRef(null);
  const isAdmin = user?.role === "admin";
  const places = isAdmin ? [...PLACES, ADMIN_PLACE] : PLACES;

  const toggle = (name) => setOpen((current) => (current === name ? null : name));

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!event.target.closest(".popover-host")) setOpen(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && open) {
        buttons.current[open]?.focus();
        setOpen(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open === "profile") profileMenuRef.current?.querySelector("[role='menuitem']")?.focus();
    if (open === "quick") quickRef.current?.querySelector("input, select")?.focus();
    if (open === "timer") document.querySelector("#timer-panel button")?.focus();
  }, [open]);

  // A page change closes whatever was open.
  useEffect(() => setOpen(null), [pathname]);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem(sidebarKey, next ? "collapsed" : "open"); } catch { /* it still collapses until the page closes */ }
  }

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

  if (focusMode) return <div className="app-shell app-shell--focus"><a className="skip-link" href="#main">Skip to content</a><main className="page-wrap" id="main" tabIndex="-1">{children}</main><ShortcutHelp /></div>;

  return (
    <div className={`app-shell${" has-nav"}${collapsed ? " nav-collapsed" : ""}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <TimerAnnouncer />
      <header className="topbar">
        <Link className="brand" to="/home" aria-label="Catalyst home">
          <span className="brand-mark">C</span>
          <span className="brand-name">Catalyst</span>
        </Link>
        <div className="topbar-tools">
          <Link className="icon-button" to="/search" aria-label={t("tools.search")} title={t("tools.search")}>
            <Search size={20} aria-hidden="true" />
          </Link>
          <div className="timer-menu popover-host">
            <TimerButton buttonRef={(node) => { buttons.current.timer = node; }} open={open === "timer"} onClick={() => toggle("timer")} />
            {open === "timer" && <TimerPanel onNavigate={() => setOpen(null)} />}
          </div>
          <div className="notification-menu popover-host">
            <button
              ref={(node) => { buttons.current.notifications = node; }}
              className="icon-button"
              type="button"
              aria-label={notifications.unread > 0 ? `${t("tools.notifications")}, ${notifications.unread} unread` : t("tools.notifications")}
              aria-expanded={open === "notifications"}
              aria-controls="notification-panel"
              onClick={() => {
                if (open !== "notifications") notifications.refresh();
                toggle("notifications");
              }}
            >
              <Bell size={20} aria-hidden="true" />
              {notifications.unread > 0 && <span className="notification-badge" aria-hidden="true">{notifications.unread > 9 ? "9+" : notifications.unread}</span>}
            </button>
            {open === "notifications" && <NotificationPanel notifications={notifications} onNavigate={() => setOpen(null)} />}
          </div>
          <div className="quick-menu popover-host">
            <button
              ref={(node) => { buttons.current.quick = node; }}
              className="icon-button"
              type="button"
              aria-label={t("tools.settings")}
              title={t("tools.settings")}
              aria-expanded={open === "quick"}
              aria-controls="quick-settings-panel"
              onClick={() => toggle("quick")}
            >
              <Settings size={20} aria-hidden="true" />
            </button>
            {open === "quick" && <QuickSettings panelRef={quickRef} onNavigate={() => setOpen(null)} />}
          </div>
          {streak !== null && <span className="streak-indicator" aria-label={`Current streak: ${streak} ${streak === 1 ? "day" : "days"}`}>
            <Zap size={16} aria-hidden="true" /><span>{streak}</span>
          </span>}
          <div className="profile-menu popover-host">
            <button
              ref={(node) => { buttons.current.profile = node; }}
              className="profile-button"
              type="button"
              aria-label={t("tools.profile")}
              aria-haspopup="menu"
              aria-expanded={open === "profile"}
              onClick={() => toggle("profile")}
            >
              <Avatar avatar={user?.avatar} name={user?.name} size={40} />
            </button>
            {open === "profile" && <div className="profile-panel" ref={profileMenuRef} role="menu" onKeyDown={moveProfileFocus}>
              <div className="profile-header">
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                {xp && <span className="profile-level">{t("xp.level").replace("{level}", xp.level)}</span>}
              </div>
              <Link role="menuitem" tabIndex="-1" to="/settings" onClick={() => setOpen(null)}>{t("me.settings")}</Link>
              <Link role="menuitem" tabIndex="-1" to="/progress" onClick={() => setOpen(null)}>{t("me.progress")}</Link>
              {user?.role === "admin" && <Link role="menuitem" tabIndex="-1" to="/admin" onClick={() => setOpen(null)}>Admin</Link>}
              <button role="menuitem" tabIndex="-1" type="button" onClick={handleLogout}>Log out</button>
            </div>}
          </div>
        </div>
      </header>
      {!online && <div className="offline-banner" role="status">You are offline. Lessons you opened before are still here. Answers need a connection.</div>}
      <div className="shell-body">
        <aside className="sidebar">
          <nav aria-label={t("nav.main")}>
            {places.map((place) => <PlaceLink key={place.to} place={place} pathname={pathname} collapsed={collapsed} />)}
          </nav>
          <button className="sidebar-toggle" type="button" aria-expanded={!collapsed} onClick={toggleSidebar} title={collapsed ? t("nav.expand") : t("nav.collapse")}>
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
            <span className="place-label">{collapsed ? t("nav.expand") : t("nav.collapse")}</span>
          </button>
        </aside>
        <div className="shell-main">
          <main className="page-wrap" id="main" tabIndex="-1">{children}</main>
          <ShortcutHelp />
          <LevelUpDialog xp={xp} onClose={dismissLevelUp} />
          <footer className="footer">Keep learning with momentum. <span className="footer-links"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></span></footer>
        </div>
      </div>
      <nav className="tabbar" aria-label={t("nav.main")}>
        {places.map((place) => <PlaceLink key={place.to} place={place} pathname={pathname} collapsed={false} />)}
      </nav>
    </div>
  );
}
