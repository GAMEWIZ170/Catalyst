import { Outlet } from "react-router-dom";
import AdminNav from "./AdminNav";

export default function AdminLayout({ children, nav = true }) {
  return <div className="admin-layout">
    <div className="admin-layout-inner">
      {nav && <AdminNav />}
      {children || <Outlet />}
    </div>
  </div>;
}
