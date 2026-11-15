import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

// Used every day: always visible. The rest sit behind the "More" button.
const MAIN = [
  { label: "Courses", to: "/admin" },
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Catalog", to: "/admin/catalog" }
];
const MORE = [
  { label: "Reports", to: "/admin/reports" },
  { label: "Community", to: "/admin/community" },
  { label: "Analytics", to: "/admin/analytics" },
  { label: "Users", to: "/admin/users" },
  { label: "Trash", to: "/admin/trash" }
];

// Courses covers the list and every editor under it.
const isCurrent = (to, pathname) => (to === "/admin"
  ? ![...MORE, ...MAIN.slice(1)].some((section) => pathname.startsWith(section.to))
  : pathname.startsWith(to));

export default function AdminNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const host = useRef(null);
  const button = useRef(null);
  const moreCurrent = MORE.some((section) => isCurrent(section.to, pathname));

  // A page change, a click outside or Escape closes the menu (Escape returns focus to the button).
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => { if (!host.current?.contains(event.target)) setOpen(false); };
    const onKeyDown = (event) => { if (event.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const link = (section) => <Link key={section.to} to={section.to} className={isCurrent(section.to, pathname) ? "is-current" : ""} aria-current={isCurrent(section.to, pathname) ? "page" : undefined}>{section.label}</Link>;

  return <nav className="admin-nav" aria-label="Admin sections">
    {MAIN.map(link)}
    <div className="admin-more" ref={host}>
      <button ref={button} type="button" className={moreCurrent ? "is-current" : ""} aria-expanded={open} aria-controls="admin-more-panel" onClick={() => setOpen((value) => !value)}>
        More<ChevronDown className="more-chevron" size={16} aria-hidden="true" />
      </button>
      {open && <div className="admin-more-panel" id="admin-more-panel">{MORE.map(link)}</div>}
    </div>
  </nav>;
}
