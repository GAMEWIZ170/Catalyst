import { Outlet } from "react-router-dom";

export default function AdminLayout({ children }) {
  return <div className="admin-layout">
    <div className="admin-layout-inner">
      {children || <Outlet />}
    </div>
  </div>;
}
