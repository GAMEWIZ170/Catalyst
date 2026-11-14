import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { Button, Card, EmptyState, SelectField } from "../components/ui";
import { ErrorState, Loading } from "./Courses";

// Pick a topic (and, if the admin tagged them, a source and year) and practise questions from every lesson.
export default function Topics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("");
  const [source, setSource] = useState("");
  const [year, setYear] = useState("");

  function load() {
    setError("");
    api.getTopics().then((payload) => setData(payload.data)).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  if (error) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return <Loading />;
  const back = <Link className="back-link" to="/courses"><ArrowLeft size={16} aria-hidden="true" />Back to home</Link>;
  if (!data.topics.length && !data.sources.length && !data.years.length) {
    return <div className="content student-page">{back}<EmptyState title="No topics yet" description="Practice by topic appears here once questions are tagged." action={<Button as={Link} variant="secondary" to="/courses">Back to home</Button>} /></div>;
  }

  function start(event) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (topic) query.set("topic", topic);
    if (source) query.set("source", source);
    if (year) query.set("year", year);
    navigate(`/practice/topic?${query}`, { state: { from: "/topics" } });
  }

  return <div className="content student-page">
    {back}
    <h1>Practise by topic</h1>
    <Card>
      <form className="topic-form" onSubmit={start}>
        {data.topics.length > 0 && <SelectField label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
          <option value="">Any topic</option>
          {data.topics.map((item) => <option value={item.value} key={item.value}>{item.value} ({item.count})</option>)}
        </SelectField>}
        {data.sources.length > 0 && <SelectField label="Source" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">Any source</option>
          {data.sources.map((item) => <option value={item.value} key={item.value}>{item.value} ({item.count})</option>)}
        </SelectField>}
        {data.years.length > 0 && <SelectField label="Year" value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">Any year</option>
          {data.years.map((item) => <option value={item.value} key={item.value}>{item.value} ({item.count})</option>)}
        </SelectField>}
        <p className="muted">You get up to 20 questions from every lesson, in random order. Pick at least one filter.</p>
        <div className="button-row button-row--stack"><Button type="submit" disabled={!topic && !source && !year}>Start practice</Button></div>
      </form>
    </Card>
  </div>;
}
