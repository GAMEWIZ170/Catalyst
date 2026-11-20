import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, Info, Loader2, Trash2 } from "lucide-react";
import { api } from "../../api/client";
import { Button, EditableTitle, Picker } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import { appendToDoc, draftToNodes, notesToDraft } from "../../utils/draftToDoc";

const field = "w-full resize-y rounded-lg border border-input bg-card p-3 font-sans text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const input = "min-h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 font-sans text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const iconButton = "grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
const h2 = "m-0 text-xl font-semibold";
let keyCounter = 0;
const withKey = (item) => ({ ...item, key: `d${keyCounter++}` });

// Review what the AI drafted: edit or delete each item, then save. Nothing is saved to the set until the student says so.
export default function LabReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [build, setBuild] = useState(null);
  const [set, setSet] = useState(null);
  const [courses, setCourses] = useState([]);
  const [cards, setCards] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  function load() {
    setError("");
    api.getSetBuild(id).then(({ data }) => {
      setBuild(data);
      if (data.status === "ready" && !loaded) {
        setCards((data.drafts?.cards || []).map(withKey));
        setQuestions((data.drafts?.questions || []).map(withKey));
        setNotes(data.drafts?.notes ? notesToDraft(data.drafts.notes) : "");
        setLoaded(true);
      }
      if (data.status === "none") navigate(`/lab/${id}`, { replace: true });
    }).catch((err) => setError(err.status === 404 ? "This set was not found" : err.message));
  }
  useEffect(load, [id]);
  useEffect(() => {
    api.getSet(id).then(({ data }) => setSet(data)).catch(() => {});
    api.getCourses().then(({ data }) => setCourses(data || [])).catch(() => {});
  }, [id]);

  // While the AI is still working, look again every few seconds.
  useEffect(() => {
    if (build?.status !== "processing") return undefined;
    const timer = window.setInterval(load, 3000);
    return () => window.clearInterval(timer);
  }, [build?.status]);

  async function patchSet(body) {
    try {
      const { data } = await api.updateSet(id, body);
      setSet(data);
      setBuild((current) => ({ ...current, title: data.title, topic: data.topic }));
    } catch (err) {
      setError(err.message);
    }
  }

  const change = (setter) => (index, patch) => setter((rows) => rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));
  const remove = (setter) => (index) => setter((rows) => rows.filter((_, at) => at !== index));

  async function save() {
    setBusy(true);
    setError("");
    try {
      const doneCards = cards.map((row) => ({ front: row.front.trim(), back: row.back.trim() })).filter((row) => row.front && row.back);
      const doneQuestions = questions.filter((row) => row.text.trim() && row.options.every((option) => option.trim()));
      const nodes = draftToNodes(notes);
      if (!doneCards.length && !doneQuestions.length && !nodes.length) throw new Error("There is nothing to save. Add something back, or choose Start empty.");
      if (doneCards.length) await api.addSetCards(id, doneCards);
      if (doneQuestions.length) {
        const quizId = (await api.createSetQuiz(id, "AI quiz")).data.id;
        for (const [at, row] of doneQuestions.entries()) {
          await api.createSetQuestion({ test: quizId, type: "mcq", order: at + 1, text: row.text.trim(), options: row.options.map((option) => ({ text: option.trim() })), correctIndex: row.correctIndex, explanation: (row.explanation || "").trim() });
        }
      }
      if (nodes.length) {
        const { data } = await api.getSetNotes(id);
        await api.saveSetNotes(id, appendToDoc(data.content, nodes));
      }
      await api.finishSetBuild(id);
      navigate(`/lab/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function startEmpty() {
    setBusy(true);
    try {
      await api.finishSetBuild(id);
      navigate(`/lab/${id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function retry() {
    try { await api.retrySetBuild(id); load(); } catch (err) { setError(err.message); }
  }

  if (error && !build) return <div className="mx-auto max-w-4xl"><ErrorState message={error} onRetry={load} /></div>;
  if (!build) return <Loading />;

  const back = <div><Button as={Link} to="/lab" variant="tertiary" size="sm" icon={ArrowLeft}>Study Lab</Button></div>;
  const wrap = "content mx-auto grid max-w-3xl gap-5";

  if (build.status === "processing") {
    return <div className={wrap}>{back}
      <div className="flex items-center gap-3"><Loader2 size={28} className="shrink-0 animate-spin motion-reduce:animate-none" aria-label="Making your set" />
        <div className="grid gap-1"><h2 className={h2}>Making your set…</h2><p className="m-0 text-muted-foreground">The AI is reading your material. You can leave this page.</p></div></div>
    </div>;
  }

  if (build.status === "issue") {
    return <div className={wrap}>{back}
      <div className="grid gap-1 rounded-lg bg-warning/15 p-4" role="status"><strong>The AI could not build this set</strong><span>{build.message}</span></div>
      <div className="flex gap-2"><Button onClick={retry}>Try again</Button><Button variant="tertiary" loading={busy} onClick={startEmpty}>Start empty</Button></div>
    </div>;
  }

  const total = cards.length + questions.length + (notes.trim() ? 1 : 0);
  return <div className={wrap}>
    {back}
    <div className="grid gap-1">
      <EditableTitle heading label="Title" value={build.title} placeholder="Untitled set" onSave={(title) => patchSet({ title })} />
      <div className="flex flex-wrap items-center gap-2">
        <EditableTitle label="Topic" value={build.topic} placeholder="Add a topic" onSave={(topic) => patchSet({ topic })} />
        <Picker label="Course" placeholder="Add a course" clearLabel="No course" value={set?.course?.id || ""} onChange={(value) => patchSet({ course: value || null })}
          options={courses.map((course) => ({ value: course._id, label: course.code + ": " + course.title }))} />
      </div>
    </div>
    {build.message && <p className="m-0 flex items-start gap-2 rounded-lg bg-info/15 p-4" role="status"><Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />{build.message}</p>}
    {error && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
    <p className="m-0 text-muted-foreground">Check what the AI drafted. Change or delete anything, then save.</p>

    {cards.length > 0 && <section className="grid gap-3" aria-label="Flashcards">
      <h2 className={h2}>Flashcards ({cards.length})</h2>
      {cards.map((row, index) => <div key={row.key} className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-2">
          <textarea aria-label={"Card " + (index + 1) + " front"} rows={2} className={field} value={row.front} onChange={(event) => change(setCards)(index, { front: event.target.value })} />
          <textarea aria-label={"Card " + (index + 1) + " back"} rows={2} className={field} value={row.back} onChange={(event) => change(setCards)(index, { back: event.target.value })} />
        </div>
        <button type="button" aria-label={"Delete card " + (index + 1)} className={iconButton} onClick={() => remove(setCards)(index)}><Trash2 size={18} aria-hidden="true" /></button>
      </div>)}
    </section>}

    {questions.length > 0 && <section className="grid gap-3" aria-label="Quiz questions">
      <h2 className={h2}>Quiz questions ({questions.length})</h2>
      {questions.map((row, index) => <div key={row.key} className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-2">
          <textarea aria-label={"Question " + (index + 1)} rows={2} className={field} value={row.text} onChange={(event) => change(setQuestions)(index, { text: event.target.value })} />
          {row.options.map((option, at) => <div key={at} className="flex items-center gap-2">
            <button type="button" aria-pressed={row.correctIndex === at} title="Correct answer"
              aria-label={row.correctIndex === at ? "Option " + (at + 1) + " is the correct answer" : "Mark option " + (at + 1) + " as the correct answer"}
              onClick={() => change(setQuestions)(index, { correctIndex: at })}
              className={"grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " + (row.correctIndex === at ? "border-transparent bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:bg-muted")}><Check size={16} aria-hidden="true" /></button>
            <input aria-label={"Option " + (at + 1)} className={input} value={option} onChange={(event) => change(setQuestions)(index, { options: row.options.map((item, i) => (i === at ? event.target.value : item)) })} />
          </div>)}
        </div>
        <button type="button" aria-label={"Delete question " + (index + 1)} className={iconButton} onClick={() => remove(setQuestions)(index)}><Trash2 size={18} aria-hidden="true" /></button>
      </div>)}
    </section>}

    {notes.trim() && <section className="grid gap-3" aria-label="Notes">
      <div className="flex items-center justify-between gap-3"><h2 className={h2}>Notes</h2><Button variant="tertiary" size="sm" icon={Trash2} onClick={() => setNotes("")}>Delete notes</Button></div>
      <textarea aria-label="Notes draft" rows={12} className={field} value={notes} onChange={(event) => setNotes(event.target.value)} />
    </section>}

    <div className="flex flex-wrap gap-2">
      <Button disabled={!total} loading={busy} onClick={save}>Save to my set</Button>
      <Button variant="tertiary" disabled={busy} tooltip="Skip the drafts and open the empty set" onClick={startEmpty}>Start empty</Button>
    </div>
  </div>;
}
