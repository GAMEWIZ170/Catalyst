import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TAB = "-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-4 font-semibold text-muted-foreground transition-colors hover:text-foreground max-[479px]:px-[calc(0.5rem-2px)]";
const MENU_LINK = "inline-flex min-h-11 items-center rounded-[6px] px-4 font-semibold text-muted-foreground hover:bg-background hover:text-foreground";

// Used every day: always visible. The rest sit behind the "More" button.
const MAIN = [
  { label: "Courses", to: "/admin" },
  { label: "Dashboard", to: "/admin/dashboard" }
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

  const link = (section, inMenu = false) => <Link key={section.to} to={section.to} className={cn(inMenu ? MENU_LINK : TAB, isCurrent(section.to, pathname) && (inMenu ? "bg-primary/15 text-brand-ink" : "border-b-primary text-foreground"))} aria-current={isCurrent(section.to, pathname) ? "page" : undefined}>{section.label}</Link>;

  return <nav className="mb-6 flex flex-wrap gap-1 border-b border-border max-[479px]:gap-0" aria-label="Admin sections">
    {MAIN.map((section) => link(section))}
    <div className="relative" ref={host}>
      <button ref={button} type="button" className={cn(TAB, "cursor-pointer gap-1 bg-transparent", moreCurrent && "border-b-primary text-foreground")} aria-expanded={open} aria-controls="admin-more-panel" onClick={() => setOpen((value) => !value)}>
        More<ChevronDown className={cn("motion-safe:transition-transform", open && "rotate-180")} size={16} aria-hidden="true" />
      </button>
      {open && <div className="absolute top-[calc(100%+0.25rem)] left-0 z-[4] grid min-w-48 origin-top-left rounded-[6px] border border-border bg-card p-2 shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 max-[479px]:right-0 max-[479px]:left-auto max-[479px]:origin-top-right" id="admin-more-panel">{MORE.map((section) => link(section, true))}</div>}
    </div>
  </nav>;
}
