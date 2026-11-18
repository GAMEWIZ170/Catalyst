import { useEffect, useState } from "react";
import { AlertCircle, CalendarDays, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { Button, Dialog, DropdownMenu, EmptyState, Picker } from "../../components/ui";
import { ErrorState, Loading } from "./Courses";

const TYPES = [
  { value: "mid_semester", label: "Mid-semester" },
  { value: "end_semester", label: "End of semester" },
  { value: "quiz", label: "Quiz" }
];
const typeLabel = (value) => TYPES.find((item) => item.value === value)?.label || value;
const when = (days) => (days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`);
const show = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const inDays = (n) => { const date = new Date(); date.setDate(date.getDate() + n); return iso(date); };
const QUICK = [{ label: "Tomorrow", days: 1 }, { label: "In a week", days: 7 }, { label: "In a month", days: 30 }];
const blank = () => ({ course: "", type: "end_semester", date: "", time: "09:00" });
const dateField = "min-h-11 rounded-pill border border-input bg-card px-4 font-sans text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

// The student's own exams. The list comes first; "Add exam" opens a small dialog with a date picker and quick chips.
// The nearest exam shows on Home with the days left, and Today's plan counts down to it.
export default function Exams() {
  const [exams, setExams] = useState(null);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(null);       // null = closed
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState("");
  const [problem, setProblem] = useState("");
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

  async function add() {
    setSaving(true);
    setProblem("");
    try {
      // The date and time are in the student's own time, so the browser turns them into one exact moment.
      await api.addMyExam({ course: form.course, type: form.type, startsAt: new Date(`${form.date}T${form.time || "09:00"}`).toISOString() });
      setForm(null);
      await load();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try { await api.deleteMyExam(target.id); await load(); } catch (err) { setError(err.message); }
  }

  if (error && !exams) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!exams) return <Loading />;
  const row = (exam, past) => <li key={exam.id} className="flex items-center gap-2 border-b border-border py-3 last:border-b-0">
    <div className="grid min-w-0 flex-1 gap-0.5">
      <span className="font-semibold">{exam.course.code} · {typeLabel(exam.type)}</span>
      <span className="text-sm text-muted-foreground">{show(exam.startsAt)}{past ? "" : `, ${when(exam.daysLeft)}`}</span>
    </div>
    <DropdownMenu trigger={<Button variant="tertiary" size="sm" aria-label={`Options for ${exam.course.code} ${typeLabel(exam.type)}`}><MoreHorizontal size={18} aria-hidden="true" /></Button>}
      items={[{ label: "Delete exam", icon: Trash2, danger: true, onSelect: () => setRemoving(exam) }]} />
  </li>;
  const ready = form && form.course && form.date;
  const close = () => setForm(null);
  const openForm = () => { setProblem(""); setForm(blank()); };

  return <div className="content mx-auto grid max-w-3xl gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="m-0 text-3xl leading-tight font-bold">My exams</h1>
      <Button icon={Plus} onClick={openForm}>Add exam</Button>
    </div>
    {error && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}
      <button type="button" aria-label="Dismiss error" onClick={() => setError("")} className="ml-auto grid size-8 cursor-pointer place-items-center rounded-pill border-0 bg-transparent hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><X size={16} aria-hidden="true" /></button></p>}
    <section className="grid gap-2" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title" className="m-0 text-xl font-semibold">Upcoming</h2>
      {exams.upcoming.length === 0
        ? <EmptyState icon={CalendarDays} title="No exams yet" description="Add one to see a countdown on Home." action={<Button onClick={openForm}>Add exam</Button>} />
        : <ul className="m-0 grid list-none p-0">{exams.upcoming.map((exam) => row(exam, false))}</ul>}
    </section>
    {exams.past.length > 0 && <section className="grid gap-2" aria-labelledby="past-title">
      <h2 id="past-title" className="m-0 text-xl font-semibold">Past exams</h2>
      <ul className="m-0 grid list-none p-0">{exams.past.map((exam) => row(exam, true))}</ul>
    </section>}

    <Dialog open={Boolean(form)} onClose={close} title="Add an exam"
      actions={<><Button variant="tertiary" onClick={close}>Cancel</Button><Button disabled={!ready} loading={saving} onClick={add}>Add exam</Button></>}>
      {form && <div className="grid gap-4">
        {problem && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{problem}</p>}
        <div className="grid gap-1.5"><span className="font-semibold">Course</span>
          <Picker label="Course" placeholder="Choose a course" value={form.course} onChange={(course) => setForm({ ...form, course })} className="w-full justify-between"
            options={courses.map((course) => ({ value: course._id, label: `${course.code}: ${course.title}` }))} /></div>
        <div className="grid gap-1.5"><span className="font-semibold">Type</span>
          <Picker label="Type" value={form.type} onChange={(type) => setForm({ ...form, type })} options={TYPES} className="w-full justify-between" /></div>
        <div className="flex flex-wrap gap-2">{QUICK.map((item) => <Button key={item.label} size="sm" variant={form.date === inDays(item.days) ? "primary" : "secondary"} aria-pressed={form.date === inDays(item.days)} onClick={() => setForm({ ...form, date: inDays(item.days) })}>{item.label}</Button>)}</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1.5 font-semibold">Date<input type="date" className={dateField} value={form.date} min={iso(new Date())} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <label className="grid gap-1.5 font-semibold">Time<input type="time" className={dateField} value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label>
        </div>
      </div>}
    </Dialog>

    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this exam?"
      actions={<><Button variant="tertiary" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
      <p className="m-0">It leaves your countdown and plan.</p>
    </Dialog>
  </div>;
}
