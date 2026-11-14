import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Button, EmptyState, SelectField, TextField } from "../components/ui";
import { ErrorState, Loading } from "./Courses";

const TYPES = [
  { value: "mid_semester", label: "Mid-semester exam" },
  { value: "end_semester", label: "End of semester exam" },
  { value: "quiz", label: "Quiz" }
];
const typeLabel = (value) => TYPES.find((item) => item.value === value)?.label || value;
const when = (days) => (days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`);
const show = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

// The student's own exams. The nearest one shows on Home with the days left, and Today's plan counts down to it.
export default function Exams() {
  const [exams, setExams] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState({ course: "", startsAt: "", type: "end_semester" });
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      const [mine, list] = await Promise.all([api.getMyExams(), api.getCourses()]);
      setExams(mine.data);
      setCourses(list.data || []);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function add(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      // The date and time are typed in the student's own time, so the browser turns them into one exact moment.
      await api.addMyExam({ course: form.course, type: form.type, startsAt: new Date(form.startsAt).toISOString() });
      setForm({ ...form, startsAt: "" });
      setStatus("Exam added");
      await load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(exam) {
    setStatus("");
    try {
      await api.deleteMyExam(exam.id);
      setStatus("Exam deleted");
      await load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  if (error && !exams) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!exams) return <Loading />;
  const row = (exam, past) => <li className="exam-row" key={exam.id}>
    <span>
      <strong>{exam.course.code}</strong> · {typeLabel(exam.type)}
      <span className="muted exam-row-when">{show(exam.startsAt)}{past ? "" : `, ${when(exam.daysLeft)}`}</span>
    </span>
    <Button variant="secondary" type="button" onClick={() => remove(exam)} aria-label={`Delete ${exam.course.code} ${typeLabel(exam.type)}`}>Delete</Button>
  </li>;

  return <div className="content student-page exams-page">
    <h1>My exams</h1>
    <section className="settings-section" aria-labelledby="add-exam-heading">
      <h2 id="add-exam-heading">Add an exam</h2>
      <form className="form-stack" onSubmit={add}>
        <SelectField label="Course" required value={form.course} onChange={(event) => setForm({ ...form, course: event.target.value })}>
          <option value="">Choose a course</option>
          {courses.map((course) => <option key={course._id} value={course._id}>{course.code}: {course.title}</option>)}
        </SelectField>
        <TextField label="Date and time" type="datetime-local" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
        <SelectField label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          {TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </SelectField>
        <div><Button type="submit" loading={saving}>Add exam</Button></div>
      </form>
      <p className="settings-status" role="status">{status}</p>
    </section>
    <section aria-labelledby="upcoming-heading">
      <h2 id="upcoming-heading">Upcoming</h2>
      {exams.upcoming.length === 0
        ? <EmptyState title="No exams yet" description="Add one to see a countdown on Home and a plan that counts down to it." />
        : <ul className="exam-list">{exams.upcoming.map((exam) => row(exam, false))}</ul>}
    </section>
    {exams.past.length > 0 && <section aria-labelledby="past-heading">
      <h2 id="past-heading">Past exams</h2>
      <ul className="exam-list">{exams.past.map((exam) => row(exam, true))}</ul>
    </section>}
  </div>;
}
