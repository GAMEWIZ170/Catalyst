import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { api } from "../api/client";
import { Button, EmptyState } from "../components/ui";
import { ErrorState, Loading } from "./Courses";

// Everything the student saved: lessons and test questions. A saved item can be removed here.
export default function Saved() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  function load() {
    setError("");
    api.getBookmarks().then(({ data }) => setItems(data || [])).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  async function remove(item) {
    setStatus("");
    try {
      await api.removeBookmark(item.kind, item.id);
      setItems((list) => list.filter((entry) => !(entry.kind === item.kind && entry.id === item.id)));
      setStatus(`Removed “${item.title}”`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  if (error) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!items) return <Loading />;
  return <div className="content student-page saved-page">
    <h1>Saved</h1>
    <p className="sr-only" role="status">{status}</p>
    {items.length === 0
      ? <EmptyState icon={Bookmark} title="Nothing saved yet" description="Use Save on a lesson, or on a question after you answer it." action={<Button as={Link} variant="secondary" to="/courses">Back to home</Button>} />
      : <ul className="saved-list">
        {items.map((item) => <li key={`${item.kind}-${item.id}`}>
          <Link to={item.link}><strong>{item.title}</strong><span className="muted">{item.detail}</span></Link>
          <Button variant="tertiary" onClick={() => remove(item)}>Remove<span className="sr-only"> {item.title}</span></Button>
        </li>)}
      </ul>}
  </div>;
}
