import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FlaskConical, Plus, Users } from "lucide-react";
import { api } from "../api/client";
import { Button, Card, Dialog, EmptyState, SelectField, TextArea, TextField } from "../components/ui";
import { ErrorState, Loading } from "./Courses";
import { t } from "../i18n";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The Study Lab: a student's own study sets. Each set holds notes, flashcards and quizzes on one topic.
export default function Lab() {
  const navigate = useNavigate();
  const [sets, setSets] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ title: "", topic: "", description: "", course: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // A slower answer for an older search must not replace a newer one.
  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      api.getSets(query.trim()).then(({ data }) => { if (live) { setSets(data); setError(""); } }).catch((err) => { if (live) setError(err.message); });
    }, query ? 250 : 0);
    return () => { live = false; window.clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (creating && !courses.length) api.getCourses().then(({ data }) => setCourses(data || [])).catch(() => {});
  }, [creating]);

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const { data } = await api.createSet({ title: form.title, topic: form.topic, description: form.description, course: form.course || null });
      navigate(`/lab/${data.id}`);
    } catch (err) {
      setFormError(err.message);
      setSaving(false);
    }
  }

  return <div className="content student-page lab-page">
    <header className="lab-header">
      <div className="lab-heading">
        <h1>{t("lab.title")}</h1>
        <p className="muted">Your own notes, flashcards and quizzes. Only you can see them.</p>
      </div>
      <div className="lab-actions">
        <Button as={Link} variant="secondary" icon={Users} to="/community">Community sets</Button>
        <Button icon={Plus} onClick={() => { setForm({ title: "", topic: "", description: "", course: "" }); setFormError(""); setSaving(false); setCreating(true); }}>New set</Button>
      </div>
    </header>
    <TextField label="Search my sets" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
    {error && !sets && <ErrorState message={error} onRetry={() => setQuery((q) => q + " ")} />}
    {!sets && !error && <Loading />}
    {sets && sets.length === 0 && (query
      ? <EmptyState icon={FlaskConical} title="No sets match" description="Try a different word." />
      : <EmptyState icon={FlaskConical} title="Make your first set" description="A set is a place for your notes, flashcards and quizzes on one topic. Use New set above to start." />)}
    {sets && sets.length > 0 && <div className="home-courses lab-sets">
      {sets.map((set) => <Card as={Link} className="home-course" to={`/lab/${set.id}`} key={set.id}>
        <strong className="home-course-title">{set.title}</strong>
        {(set.topic || set.course) && <span className="muted">{[set.course?.code, set.topic].filter(Boolean).join(" · ")}</span>}
        {set.description && <span className="muted home-course-desc">{set.description}</span>}
        <span className="muted">{plural(set.cardCount, "card")} · {plural(set.quizCount, "quiz")}</span>
      </Card>)}
    </div>}
    <Dialog open={creating} onClose={() => setCreating(false)} title="New study set" actions={<>
      <Button variant="secondary" type="button" onClick={() => setCreating(false)}>Cancel</Button>
      <Button type="submit" form="new-set-form" loading={saving}>Create set</Button>
    </>}>
      <form id="new-set-form" className="form-stack" onSubmit={create}>
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <TextField label="Title" required maxLength="80" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <TextField label="Topic (optional)" maxLength="80" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} />
        <SelectField label="Course (optional)" value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })}>
          <option value="">None</option>
          {courses.map((course) => <option key={course._id} value={course._id}>{course.code}: {course.title}</option>)}
        </SelectField>
        <TextArea label="Description (optional)" maxLength="300" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      </form>
    </Dialog>
  </div>;
}
