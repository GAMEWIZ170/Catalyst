import { Outlet } from "react-router-dom";
import AdminNav from "./AdminNav";

export default function AdminLayout({ children, nav = true }) {
  return <div className="admin-layout min-h-[calc(100dvh-72px)] px-4 pt-6 pb-12">
    <div className="mx-auto max-w-[960px]">
      {nav && <AdminNav />}
      {children || <Outlet />}
    </div>
  </div>;
}
