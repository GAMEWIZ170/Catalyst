import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { api } from "../api/client";
import { EmptyState, TextField } from "../components/ui";
import { ErrorState } from "./Courses";

// Search across lesson titles and text. Waits for a pause in typing, and ignores answers from older searches.
export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const text = query.trim();

  useEffect(() => {
    if (text.length < 2) { setResults(null); setError(""); return undefined; }
    let current = true;
    const timer = window.setTimeout(() => {
      setError("");
      api.search(text)
        .then(({ data }) => { if (current) setResults(data || []); })
        .catch((err) => { if (current) setError(err.message); });
    }, 300);
    return () => { current = false; window.clearTimeout(timer); };
  }, [text, retry]);

  return <div className="content student-page search-page">
    <h1>Search</h1>
    <TextField label="Search lessons" type="search" value={query} onChange={(event) => setQuery(event.target.value)} hint="Search lesson titles and text. Type at least 2 letters." autoComplete="off" />
    {error && <ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} />}
    {!error && results && results.length === 0 && <EmptyState icon={SearchIcon} title="Nothing found" description={`No lessons match “${text}”. Try a different word.`} />}
    {!error && results && results.length > 0 && <ul className="search-results" aria-label="Search results">
      {results.map((item) => <li key={item.lessonId}>
        <Link to={`/lessons/${item.lessonId}`} state={{ from: `/courses/${item.courseId}` }}>
          <strong>{item.title}</strong>
          <span className="muted">{item.course} · {item.unit}</span>
        </Link>
      </li>)}
    </ul>}
  </div>;
}
