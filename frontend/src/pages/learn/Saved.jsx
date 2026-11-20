import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { api } from "../../api/client";
import { Button, EmptyState } from "../../components/ui";
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

  if (error) return <div className="mx-auto max-w-4xl"><ErrorState message={error} onRetry={load} /></div>;
  if (!items) return <Loading />;
  return <div className="mx-auto max-w-4xl student-page saved-page">
    <h1>Saved</h1>
    <p className="sr-only" role="status">{status}</p>
    {items.length === 0
      ? <EmptyState icon={Bookmark} title="Nothing saved yet" description="Use Save on a lesson, or on a question after you answer it." action={<Button as={Link} variant="secondary" to="/home">Back to home</Button>} />
      : <ul className="m-0 mt-4 grid list-none gap-2 p-0 [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-3 [&_li]:rounded-xl [&_li]:border [&_li]:bg-card [&_li]:px-4 [&_li]:py-3 [&_a]:grid [&_a]:min-h-11 [&_a]:flex-1 [&_a]:gap-0.5 [&_a]:text-inherit [&_a]:no-underline">
        {items.map((item) => <li key={`${item.kind}-${item.id}`}>
          <Link to={item.link}><strong>{item.title}</strong><span className="text-muted-foreground">{item.detail}</span></Link>
          <Button variant="tertiary" onClick={() => remove(item)}>Remove<span className="sr-only"> {item.title}</span></Button>
        </li>)}
      </ul>}
  </div>;
}
