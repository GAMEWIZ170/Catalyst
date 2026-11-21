import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useMatch, useNavigate } from "react-router-dom";
import { Bell, ChartLine, ChevronRight, FlaskConical, House, Layers, LogOut, Settings, Shield, Zap } from "lucide-react";
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
import ShortcutHelp from "./ShortcutHelp";
import { TimerAnnouncer, TimerButton, TimerPanel } from "./TimerMenu";
import TutorPanel from "./TutorPanel";
import { iconButton, menuItem, popoverHost, popoverPanel } from "./topbarStyles";

// The places a student goes. Laptops show them in a slim rail on the left, phones in tabs along the bottom (never both).
// Progress stands where "Me" was until Me is redesigned (the /me page still exists, just not in the nav).
// The course catalog and community are hidden for the beta (code kept), so they are not in the list.
const PLACES = [
  { to: "/home", label: "nav.home", icon: House, end: true },
  { to: "/lab", label: "nav.lab", icon: FlaskConical },
  { to: "/review", label: "nav.review", icon: Layers },
  { to: "/progress", label: "nav.progress", icon: ChartLine }
];
const ADMIN_PLACE = { to: "/admin", label: "nav.admin", icon: Shield };

// Second crumb for pages that sit inside a place.
const CRUMBS = [
  ["/lab/", "Study set"], ["/lessons/", "Lesson"], ["/courses", "Courses"],
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
  const rail = variant === "rail";
  // Rail and bottom tabs show the icon only; the name stays for screen readers (and as a tooltip in the rail).
  const body = <><Icon size={22} aria-hidden="true" /><span className="sr-only">{t(place.label)}</span></>;
  const size = rail ? "size-12 self-center" : "min-h-14 flex-1";
  const title = rail ? t(place.label) : undefined;
  // NavLink would overwrite aria-current on a page inside this place, so those use a plain Link.
  if (isInside(place, pathname)) return <Link to={place.to} title={title} className={cn(railItem, railOn, size)} aria-current="page">{body}</Link>;
  return <NavLink to={place.to} end={place.end} title={title} className={({ isActive }) => cn(railItem, size, isActive && railOn)}>{body}</NavLink>;
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

// True from 768 px up, where the side rail shows (Tailwind md). The profile button lives in the rail there, in the top bar below it.
function useDesktop() {
  const query = "(min-width: 768px)";
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const change = (event) => setDesktop(event.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return desktop;
}

// The profile button and its menu. In the rail (laptops) the menu opens to the right, lined up with the button's bottom edge.
// In the bottom tabs (phones) the button sits in the middle, raised half above the bar, and the menu opens above the bar.
function ProfileMenu({ user, isAdmin, open, inRail, buttonRef, menuRef, onToggle, onClose, onKeyDown, onLogout }) {
  const place = inRail
    ? "absolute bottom-0 left-[calc(100%+0.75rem)] w-64 origin-bottom-left"
    : "fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] mx-auto w-auto max-w-xs origin-bottom";
  return <div className={cn("popover-host relative", !inRail && "flex flex-1 justify-center")}>
    <button
      ref={buttonRef}
      className={cn("inline-flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 transition-shadow motion-safe:active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        inRail ? "size-12 hover:ring-2 hover:ring-border" : "-mt-7 size-14 bg-card shadow-md ring-4 ring-card", open && "ring-2 ring-primary hover:ring-primary", open && !inRail && "ring-4")}
      type="button"
      aria-label={t("tools.profile")}
      title={t("tools.profile")}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={onToggle}
    >
      <Avatar avatar={user?.avatar} name={user?.name} size={inRail ? 36 : 48} />
    </button>
    {open && <div className={cn("z-[4] max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-card p-1.5 shadow-lg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150", place)} ref={menuRef} role="menu" aria-label={t("tools.profile")} onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 px-2.5 pt-2 pb-3">
        <Avatar avatar={user?.avatar} name={user?.name} size={36} />
        <div className="grid min-w-0">
          <strong className="truncate text-sm">{user?.name}</strong>
          <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
        </div>
      </div>
      <div className="my-1 h-px bg-border" role="separator" />
      <Link className={menuItem} role="menuitem" tabIndex="-1" to="/settings" onClick={onClose}><Settings aria-hidden="true" />{t("me.settings")}</Link>
      {isAdmin && <Link className={menuItem} role="menuitem" tabIndex="-1" to="/admin" onClick={onClose}><Shield aria-hidden="true" />Admin</Link>}
      <div className="my-1 h-px bg-border" role="separator" />
      <button className={menuItem} role="menuitem" tabIndex="-1" type="button" onClick={onLogout}><LogOut aria-hidden="true" />Log out</button>
    </div>}
  </div>;
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
  // Study time is counted while a focus session runs (the server needs it to count focus minutes). Goals are paused.
  useStudyTimer(Boolean(user) && Boolean(timer && !timer.done && timer.phase === "work"));
  const notifications = useNotifications(Boolean(user));
  const online = useOnline();
  // Only one top bar popover is open at a time: "timer", "notifications", "profile" or none.
  const [open, setOpen] = useState(null);
  const buttons = useRef({});
  const profileMenuRef = useRef(null);
  const isAdmin = user?.role === "admin";
  // Admin is reached from the profile menu, never the rail or bottom tabs. The breadcrumb still knows it.
  const places = isAdmin ? [...PLACES, ADMIN_PLACE] : PLACES;
  const desktop = useDesktop();

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

  const profileMenu = <ProfileMenu user={user} isAdmin={isAdmin} open={open === "profile"} inRail={desktop}
    buttonRef={(node) => { buttons.current.profile = node; }} menuRef={profileMenuRef}
    onToggle={() => toggle("profile")} onClose={() => setOpen(null)} onKeyDown={moveProfileFocus} onLogout={handleLogout} />;

  if (focusMode) return <div><a className="fixed top-2 left-2 z-10 -translate-y-[200%] rounded-md border-2 border-primary bg-card px-3 py-2 text-foreground focus:translate-y-0" href="#main">Skip to content</a><main className="mx-auto w-full flex-1" id="main" tabIndex="-1">{children}</main><ShortcutHelp /></div>;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <a className="fixed top-2 left-2 z-10 -translate-y-[200%] rounded-md border-2 border-primary bg-card px-3 py-2 text-foreground focus:translate-y-0" href="#main">Skip to content</a>
      <TimerAnnouncer />
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Link to="/home" aria-label="Catalyst home" className="hidden size-9 place-items-center rounded-full bg-primary font-display text-lg font-semibold text-primary-foreground min-[400px]:grid sm:hidden">C</Link>
        <Breadcrumb places={places} pathname={pathname} />
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <HeaderSearch />
          <div className="flex min-w-0 shrink-0 items-center gap-1">
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
                {notifications.unread > 0 && <span className="absolute top-1.5 right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-primary-foreground ring-2 ring-card" aria-hidden="true">{notifications.unread > 9 ? "9+" : notifications.unread}</span>}
              </button>
              {open === "notifications" && <NotificationPanel notifications={notifications} onNavigate={() => setOpen(null)} />}
            </div>
            {streak !== null && <span className="hidden min-h-11 items-center gap-1 px-2 text-sm font-semibold min-[460px]:inline-flex" aria-label={`Current streak: ${streak} ${streak === 1 ? "day" : "days"}`}>
              <Zap size={16} aria-hidden="true" /><span>{streak}</span>
            </span>}
          </div>
        </div>
      </header>
      {!online && <div className="bg-muted px-4 py-2 text-center text-sm" role="status">You are offline. Lessons you opened before are still here. Answers need a connection.</div>}
      <div className="flex min-h-0 flex-1">
        <nav aria-label={t("nav.main")} className="hidden w-16 shrink-0 flex-col border-r border-border bg-card px-2 py-3 md:flex">
          {/* Only the places scroll on a short screen, so the profile menu can open outside the rail without being clipped. */}
          <div className="flex min-h-0 flex-col gap-2 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PLACES.map((place) => <PlaceLink key={place.to} place={place} pathname={pathname} variant="rail" />)}
          </div>
          {desktop && <div className="mt-auto flex justify-center pt-2">{profileMenu}</div>}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-16 sm:pt-12 md:px-6 motion-safe:[&>*]:animate-[rise-in_200ms_cubic-bezier(0.23,1,0.32,1)]" id="main" tabIndex="-1">{children}</main>
          <ShortcutHelp />
          <footer className="mt-auto flex justify-center gap-4 px-4 py-6 text-sm text-muted-foreground"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></footer>
        </div>
        <TutorPanel />
      </div>
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t border-border bg-card p-1 pb-[calc(0.25rem+env(safe-area-inset-bottom))] md:hidden">
        {PLACES.slice(0, Math.floor(PLACES.length / 2)).map((place) => <PlaceLink key={place.to} place={place} pathname={pathname} variant="tab" />)}
        {!desktop && profileMenu}
        {PLACES.slice(Math.floor(PLACES.length / 2)).map((place) => <PlaceLink key={place.to} place={place} pathname={pathname} variant="tab" />)}
      </nav>
    </div>
  );
}

export default function AppShell({ children }) {
  return <TutorProvider><Shell>{children}</Shell></TutorProvider>;
}
