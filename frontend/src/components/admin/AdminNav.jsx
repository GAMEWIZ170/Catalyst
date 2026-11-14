import { Link, useLocation } from "react-router-dom";

const SECTIONS = [
  { label: "Courses", to: "/admin" },
  { label: "Reports", to: "/admin/reports" },
  { label: "Analytics", to: "/admin/analytics" },
  { label: "Users", to: "/admin/users" },
  { label: "Trash", to: "/admin/trash" }
];

// Courses covers the list and every editor under it.
const isCurrent = (to, pathname) => (to === "/admin"
  ? !["/admin/users", "/admin/trash", "/admin/reports", "/admin/analytics"].some((prefix) => pathname.startsWith(prefix))
  : pathname.startsWith(to));

export default function AdminNav() {
  const { pathname } = useLocation();
  return <nav className="admin-nav" aria-label="Admin sections">
    {SECTIONS.map((section) => <Link key={section.to} to={section.to} className={isCurrent(section.to, pathname) ? "is-current" : ""} aria-current={isCurrent(section.to, pathname) ? "page" : undefined}>{section.label}</Link>)}
  </nav>;
}
