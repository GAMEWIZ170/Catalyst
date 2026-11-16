import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Trophy, Users } from "lucide-react";
import { api } from "../../api/client";
import { Button, Card, EmptyState, SelectField, TextField } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";

// The community shelf: study sets other students shared and an admin approved. Separate from official courses.
export default function Community() {
  const [filters, setFilters] = useState({ courses: [], categories: [], topics: [] });
  const [query, setQuery] = useState("");
  const [course, setCourse] = useState("");
  const [category, setCategory] = useState("");
  const [topic, setTopic] = useState("");
  const [sort, setSort] = useState("new");
  const [saved, setSaved] = useState(false);
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => { api.getCommunityFilters().then(({ data }) => setFilters(data)).catch(() => {}); }, []);

  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ sort, page: String(page) });
      if (query.trim()) params.set("q", query.trim());
      if (course) params.set("course", course);
      if (category) params.set("category", category);
      if (topic) params.set("topic", topic);
      if (saved) params.set("saved", "1");
      setState((s) => ({ ...s, loading: true, error: "" }));
      api.getCommunity(params.toString()).then(({ data }) => { if (live) setState({ loading: false, error: "", data }); })
        .catch((error) => { if (live) setState({ loading: false, error: error.message, data: null }); });
    }, query ? 250 : 0);
    return () => { live = false; window.clearTimeout(timer); };
  }, [query, course, category, topic, sort, saved, page]);

  const reset = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const { data } = state;

  return <div className="content student-page community-page">
    <header className="lab-header">
      <h1>Community sets</h1>
      <Button as={Link} variant="secondary" icon={Trophy} to="/community/boards">Top sets and creators</Button>
    </header>
    <p className="muted">Study sets made by other students. They are not part of your official courses, so check what you learn against your lessons.</p>
    <div className="community-filters">
      <TextField label="Search" type="search" value={query} onChange={reset(setQuery)} />
      <SelectField label="Sort by" value={sort} onChange={reset(setSort)}>
        <option value="new">Newest</option>
        <option value="studied">Most studied</option>
        <option value="saved">Most saved</option>
      </SelectField>
    </div>
    <details className="community-more">
      <summary>More filters{category || course || topic || saved ? " (on)" : ""}</summary>
      <div className="community-filters">
        <SelectField label="Category" value={category} onChange={reset(setCategory)}>
          <option value="">Any category</option>
          {filters.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </SelectField>
        <SelectField label="Course" value={course} onChange={reset(setCourse)}>
          <option value="">Any course</option>
          {filters.courses.map((item) => <option key={item.id} value={item.id}>{item.code}: {item.title}</option>)}
        </SelectField>
        <SelectField label="Topic" value={topic} onChange={reset(setTopic)}>
          <option value="">Any topic</option>
          {filters.topics.map((item) => <option key={item} value={item}>{item}</option>)}
        </SelectField>
        <Button variant={saved ? "primary" : "secondary"} icon={Bookmark} aria-pressed={saved} onClick={() => { setSaved(!saved); setPage(1); }}>Saved sets</Button>
      </div>
    </details>
    {state.error && !data && <ErrorState message={state.error} onRetry={() => setPage((p) => p)} />}
    {state.loading && !data && <Loading />}
    {data && data.items.length === 0 && <EmptyState icon={Users} title={saved ? "No saved sets yet" : "No sets found"} description={saved ? "Save a set to find it here later." : "Try a different word or filter. You can share your own set from its page in the Study Lab."} />}
    {data && data.items.length > 0 && <ul className="community-list" aria-busy={state.loading}>
      {data.items.map((item) => <li key={item.id}><Card as={Link} to={`/community/${item.id}`} className="community-card">
        <strong>{item.title}</strong>
        <span className="muted">by {item.author}{item.course ? ` · ${item.course.code}` : ""}{item.topic ? ` · ${item.topic}` : ""}</span>
        {item.description && <span className="community-desc">{item.description}</span>}
        <span className="muted">{item.studied} studied · {item.saved} saved</span>
      </Card></li>)}
    </ul>}
    {data && data.pages > 1 && <nav className="pager" aria-label="Pages">
      <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
      <span className="muted">Page {data.page} of {data.pages}</span>
      <Button variant="secondary" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
    </nav>}
  </div>;
}
