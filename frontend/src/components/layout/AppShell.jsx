import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useMatch, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, FlaskConical, House, Layers, Settings, Shield, UserRound, Zap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { TutorProvider } from "../../context/TutorContext";
import { useTimer } from "../../context/TimerContext";
import useStudyTimer from "../../hooks/useStudyTimer";
import { useOnline } from "../../utils/offline";
import { t } from "../../i18n";
import { cn } from "@/lib/utils";
import Avatar from "../profile/Avatar";
import HeaderSearch from "./HeaderSearch";
import NotificationPanel, { useNotifications } from "./NotificationPanel";
import QuickSettings from "./QuickSettings";
import ShortcutHelp from "./ShortcutHelp";
import { TimerAnnouncer, TimerButton, TimerPanel } from "./TimerMenu";
import TutorPanel from "./TutorPanel";
import { iconButton, menuItem, popoverHost, popoverPanel } from "./topbarStyles";

// The places a student goes. Laptops show them in a slim rail on the left, phones in tabs along the bottom (never both).
// "Me" also covers the pages inside it, so it stays highlighted on Progress, Saved and Settings.
// The course catalog and community are hidden for the beta (code kept), so they are not in the list.
const PLACES = [
  { to: "/home", label: "nav.home", icon: House, end: true },
  { to: "/lab", label: "nav.lab", icon: FlaskConical },
  { to: "/review", label: "nav.review", icon: Layers },
  { to: "/me", label: "nav.me", icon: UserRound, also: ["/progress", "/settings", "/saved", "/achievements", "/exams"] }
];
const ADMIN_PLACE = { to: "/admin", label: "nav.admin", icon: Shield };

// Second crumb for pages that sit inside a place.
const CRUMBS = [
  ["/lab/", "Study set"], ["/lessons/", "Lesson"], ["/courses", "Courses"], ["/progress", "Progress"],
  ["/settings", "Settings"], ["/saved", "Saved"], ["/exams", "Exams"], ["/search", "Search"], ["/topics", "Topics"]
];

function isInside(place, pathname) {
  if (place.to === "/admin" || place.to === "/lab") return pathname.startsWith(place.to);
  return Boolean(place.also?.some((prefix) => pathname.startsWith(prefix)));
}

const railItem = "flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const railOn = "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground";

function PlaceLink({ place, pathname, variant }) {
  const Icon = place.icon;
  const body = <><Icon size={22} aria-hidden="true" /><span>{t(place.label)}</span></>;
  const size = variant === "rail" ? "min-h-14 w-full" : "min-h-14 flex-1";
  // NavLink would overwrite aria-current on a page inside this place, so those use a plain Link.
  if (isInside(place, pathname)) return <Link to={place.to} className={cn(railItem, railOn, size)} aria-current="page">{body}</Link>;
  return <NavLink to={place.to} end={place.end} className={({ isActive }) => cn(railItem, size, isActive && railOn)}>{body}</NavLink>;
}

function Breadcrumb({ places, pathname }) {
  const place = places.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)) || isInside(item, pathname));
  const second = CRUMBS.find(([prefix]) => pathname.startsWith(prefix))?.[1];
  const first = place ? t(place.label) : null;
  return <nav aria-label="Breadcrumb" className="hidden min-w-0 shrink items-center gap-1 overflow-hidden whitespace-nowrap text-sm sm:flex">
    <Link to="/home" className="font-display text-base font-semibold text-foreground">Catalyst</Link>
    {first && place.to !== "/home" && <><ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" /><span className={second ? "text-muted-foreground" : "font-semibold"} aria-current={second ? undefined : "page"}>{first}</span></>}
    {second && <><ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" /><span className="truncate font-semibold" aria-current="page">{second}</span></>}
  </nav>;
}

function Shell({ children }) {
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
  const online = useOnline();
  // Only one top bar popover is open at a time: "timer", "notifications", "quick", "profile" or none.
  const [open, setOpen] = useState(null);
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
    if (open === "quick") quickRef.current?.querySelector("input, select, button")?.focus();
    if (open === "timer") document.querySelector("#timer-panel button")?.focus();
  }, [open]);

  // A page change closes whatever was open.
  useEffect(() => setOpen(null), [pathname]);

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

  if (focusMode) return <div className="app-shell--focus"><a className="skip-link" href="#main">Skip to content</a><main className="page-wrap" id="main" tabIndex="-1">{children}</main><ShortcutHelp /></div>;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <a className="skip-link" href="#main">Skip to content</a>
      <TimerAnnouncer />
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Link to="/home" aria-label="Catalyst home" className="hidden size-9 place-items-center rounded-full bg-primary font-display text-lg font-semibold text-primary-foreground min-[400px]:grid sm:hidden">C</Link>
        <Breadcrumb places={places} pathname={pathname} />
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <HeaderSearch />
          <div className="flex min-w-0 shrink-0 items-center gap-3 max-[640px]:gap-1 max-[359px]:gap-1">
            <div className={popoverHost}>
              <TimerButton buttonRef={(node) => { buttons.current.timer = node; }} open={open === "timer"} onClick={() => toggle("timer")} />
              {open === "timer" && <TimerPanel onNavigate={() => setOpen(null)} />}
            </div>
            <div className={popoverHost}>
              <button
                ref={(node) => { buttons.current.notifications = node; }}
                className={iconButton}
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
                {notifications.unread > 0 && <span className="absolute -top-1.5 -right-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground" aria-hidden="true">{notifications.unread > 9 ? "9+" : notifications.unread}</span>}
              </button>
              {open === "notifications" && <NotificationPanel notifications={notifications} onNavigate={() => setOpen(null)} />}
            </div>
            <div className={popoverHost}>
              <button
                ref={(node) => { buttons.current.quick = node; }}
                className={iconButton}
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
            {streak !== null && <span className="hidden min-h-11 items-center gap-1 px-2 text-sm font-semibold min-[460px]:inline-flex" aria-label={`Current streak: ${streak} ${streak === 1 ? "day" : "days"}`}>
              <Zap size={16} aria-hidden="true" /><span>{streak}</span>
            </span>}
            <div className="relative">
              <button
                ref={(node) => { buttons.current.profile = node; }}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 transition-colors motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                type="button"
                aria-label={t("tools.profile")}
                aria-haspopup="menu"
                aria-expanded={open === "profile"}
                onClick={() => toggle("profile")}
              >
                <Avatar avatar={user?.avatar} name={user?.name} size={32} />
              </button>
              {open === "profile" && <div className="absolute top-[calc(100%+0.5rem)] right-0 z-[4] max-w-[calc(100vw-1rem)] min-w-[220px] origin-top-right rounded-[6px] border border-border bg-card p-2 shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 max-[640px]:min-w-[200px]" ref={profileMenuRef} role="menu" onKeyDown={moveProfileFocus}>
                <div className="grid gap-1 p-3 [&_span]:text-sm [&_span]:text-muted-foreground">
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                </div>
                <Link className={menuItem} role="menuitem" tabIndex="-1" to="/settings" onClick={() => setOpen(null)}>{t("me.settings")}</Link>
                <Link className={menuItem} role="menuitem" tabIndex="-1" to="/progress" onClick={() => setOpen(null)}>{t("me.progress")}</Link>
                {isAdmin && <Link className={menuItem} role="menuitem" tabIndex="-1" to="/admin" onClick={() => setOpen(null)}>Admin</Link>}
                <button className={`${menuItem} text-muted-foreground`} role="menuitem" tabIndex="-1" type="button" onClick={handleLogout}>Log out</button>
              </div>}
            </div>
          </div>
        </div>
      </header>
      {!online && <div className="bg-muted px-4 py-2 text-center text-sm" role="status">You are offline. Lessons you opened before are still here. Answers need a connection.</div>}
      <div className="flex min-h-0 flex-1">
        <nav aria-label={t("nav.main")} className="hidden w-20 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-card p-2 md:flex">
          {places.map((place) => <PlaceLink key={place.to} place={place} pathname={pathname} variant="rail" />)}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <main className="page-wrap" id="main" tabIndex="-1">{children}</main>
          <ShortcutHelp />
          <footer className="mt-auto flex justify-center gap-4 px-4 py-6 text-sm text-muted-foreground"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></footer>
        </div>
        <TutorPanel />
      </div>
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-border bg-card p-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] md:hidden">
        {places.map((place) => <PlaceLink key={place.to} place={place} pathname={pathname} variant="tab" />)}
      </nav>
    </div>
  );
}

export default function AppShell({ children }) {
  return <TutorProvider><Shell>{children}</Shell></TutorProvider>;
}
