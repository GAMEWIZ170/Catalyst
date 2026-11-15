import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import { api } from "../api/client";
import { EmptyState } from "../components/ui";
import { ErrorState } from "./Courses";

// "See all results" for the search field in the top bar. The query comes from the address (?q=).
// Ignores answers from older searches.
export default function Search() {
  const [params] = useSearchParams();
  const text = (params.get("q") || "").trim();
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setResults(null);
    setError("");
    if (text.length < 2) return undefined;
    let current = true;
    api.search(text)
      .then(({ data }) => { if (current) setResults(data || []); })
      .catch((err) => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [text, retry]);

  return <div className="content student-page search-page">
    <h1>{text.length >= 2 ? `Results for “${text}”` : "Search"}</h1>
    {text.length < 2 && <EmptyState icon={SearchIcon} title="Search lessons" description="Use the search field at the top of the page. Press / to jump to it." />}
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
