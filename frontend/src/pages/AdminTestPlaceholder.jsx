import { useParams } from "react-router-dom";
import Breadcrumbs from "../components/admin/Breadcrumbs";

export default function AdminTestPlaceholder() {
  const { id } = useParams();
  return <div className="admin-layout"><div className="admin-layout-inner"><Breadcrumbs items={[{ label: "Courses", to: "/admin" }, { label: `Test ${id}` }]} /><h1>Test editor</h1><p>The test editor arrives in the next update.</p></div></div>;
}
