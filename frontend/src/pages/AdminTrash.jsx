import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import StatusMessage from "../components/admin/StatusMessage";
import { Badge, Button, EmptyState } from "../components/ui";
import { formatDate } from "../utils/dates";
import { Loading } from "./Courses";

const TYPE_LABELS = { course: "Course", unit: "Unit", lesson: "Lesson", test: "Test", question: "Question", flashcard: "Flashcard", material: "Material" };

export default function AdminTrash() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems((await api.getTrash()).data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function restore(item) {
    setBusy(String(item.id));
    setError("");
    setMessage("");
    try {
      await api.restoreTrashItem(item.type, item.id);
      setItems((list) => list.filter((entry) => String(entry.id) !== String(item.id)));
      setMessage(`Restored "${item.title}". It is unpublished until you publish it.`);
      // Restoring a parent can unblock its children, so refresh their state.
      api.getTrash().then((response) => setItems(response.data || [])).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  return <AdminLayout>
    <div className="admin-heading">
      <div>
        <h1>Trash</h1>
        <p className="muted">Deleted content waits here until you restore it. Restored items come back unpublished, at the end of their list.</p>
      </div>
    </div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    {loading && <Loading />}
    {!loading && error && !items.length && <Button variant="secondary" onClick={load}>Retry</Button>}
    {!loading && !items.length && !error && <EmptyState icon={Trash2} title="The Trash is empty" description="Anything you delete will appear here." />}
    {!loading && items.length > 0 && <ul className="trash-list">
      {items.map((item) => <li className="trash-row" key={`${item.type}-${item.id}`}>
        <div className="trash-main">
          <Badge>{TYPE_LABELS[item.type]}</Badge>
          <strong>{item.title}</strong>
          <span className="muted">{item.parentTitle ? `In ${TYPE_LABELS[item.parentType].toLowerCase()} "${item.parentTitle}" · ` : ""}Deleted {formatDate(item.deletedAt)}</span>
          {item.blocked && <span className="trash-note">Restore the {TYPE_LABELS[item.parentType].toLowerCase()} first.</span>}
        </div>
        <Button variant="secondary" disabled={item.blocked} loading={busy === String(item.id)} onClick={() => restore(item)}>{busy === String(item.id) ? "Restoring..." : "Restore"}</Button>
      </li>)}
    </ul>}
  </AdminLayout>;
}
