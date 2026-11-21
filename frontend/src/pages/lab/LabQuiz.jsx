import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Circle, ListChecks, MoreHorizontal, NotebookPen, Pencil, Plus, TextCursorInput, ToggleLeft, Trash2, X } from "lucide-react";
import { api } from "../../api/client";
import { Button, Dialog, DropdownMenu, EditableTitle, EmptyState, Segmented } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";

const blank = (type) => ({ id: null, type, text: "", options: ["", ""], correct: 0, truth: "true", answers: "", modelAnswer: "", keyPoints: "", explanation: "" });
const lines = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean);
const TYPE_NAMES = { mcq: "Multiple choice", true_false: "True or false", fill_blank: "Fill in the blank", short_answer: "Short answer" };
const field = "w-full resize-y rounded-lg border border-input bg-card p-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const input = "min-h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 font-sans text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

// One quiz of a study set. A question is added by choosing its type from four cards, then filling it in a dialog.
// The right answer is chosen by tapping it.
export default function LabQuiz() {
  const { testId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);       // null = closed; { type: null } = choosing a type
  const [problem, setProblem] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  function load() {
    api.getSetQuiz(testId).then(({ data }) => setQuiz(data)).catch((err) => setError(err.status === 404 ? "This quiz was not found" : err.message));
  }
  useEffect(load, [testId]);

  function edit(question) {
    setProblem("");
    setForm({
      id: question._id, type: question.type, text: question.text,
      options: question.type === "mcq" ? question.options.map((option) => option.text) : ["", ""],
      correct: question.correctIndex ?? 0, truth: question.correctAnswer || "true", explanation: question.explanation || "",
      answers: (question.acceptedAnswers || []).join("\n"), modelAnswer: question.modelAnswer || "", keyPoints: (question.keyPoints || []).join("\n")
    });
  }

  async function save() {
    setSaving(true);
    setProblem("");
    const base = { text: form.text.trim(), explanation: form.explanation.trim() };
    const body = form.type === "mcq" ? { ...base, options: form.options.map((text) => ({ text: text.trim() })), correctIndex: form.correct }
      : form.type === "fill_blank" ? { ...base, acceptedAnswers: lines(form.answers) }
      : form.type === "short_answer" ? { ...base, modelAnswer: form.modelAnswer.trim(), keyPoints: lines(form.keyPoints) }
      : { ...base, correctAnswer: form.truth };
    try {
      if (form.id) await api.updateSetQuestion(form.id, body);
      else await api.createSetQuestion({ ...body, test: testId, type: form.type, order: quiz.questions.length + 1 });
      setForm(null);
      load();
    } catch (err) {
      setProblem(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try { await api.deleteSetQuestion(target._id); load(); } catch (err) { setError(err.message); }
  }

  async function rename(title) {
    try { await api.renameSetQuiz(testId, title); load(); } catch (err) { setError(err.message); }
  }

  if (error && !quiz) return <div className="mx-auto max-w-4xl"><ErrorState message={error} onRetry={load} /></div>;
  if (!quiz) return <Loading />;
  const set = (patch) => setForm({ ...form, ...patch });
  const mcq = form?.type === "mcq";
  const typeReady = !form?.type ? false
    : mcq ? form.options.length >= 2 && form.options.every((option) => option.trim())
    : form.type === "fill_blank" ? lines(form.answers).length > 0
    : form.type === "short_answer" ? Boolean(form.modelAnswer.trim()) && lines(form.keyPoints).length >= 1 && lines(form.keyPoints).length <= 6
    : true;
  const valid = form?.type && form.text.trim() && typeReady;
  const close = () => setForm(null);
  const typeCard = "grid min-h-28 cursor-pointer content-center justify-items-center gap-1 rounded-lg border border-input bg-card p-4 text-center font-sans text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return <div className="mx-auto grid max-w-3xl gap-4">
    <div><Button as={Link} to={`/lab/${quiz.set}?tab=quizzes`} variant="tertiary" size="sm" icon={ArrowLeft}>Back to my set</Button></div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <EditableTitle heading label="Quiz name" value={quiz.title} placeholder="Untitled quiz" onSave={rename} />
      <div className="flex flex-wrap gap-2">
        {quiz.questions.length > 0 && <Button as={Link} to={`/tests/${testId}`}>Take quiz</Button>}
        <Button variant="secondary" icon={Plus} onClick={() => { setProblem(""); setForm({ type: null }); }}>Add question</Button>
      </div>
    </div>
    {error && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p>}
    {quiz.questions.length === 0
      ? <EmptyState icon={ListChecks} title="No questions yet" description="Add your first question." />
      : <ul className="m-0 grid list-none p-0">
        {quiz.questions.map((question) => <li key={question._id} className="flex items-center gap-2 border-b border-border py-2 last:border-b-0">
          <button type="button" onClick={() => edit(question)} className="grid min-w-0 flex-1 cursor-pointer gap-0.5 rounded-md border-0 bg-transparent p-2 text-left font-sans text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
            <span className="line-clamp-2 font-semibold">{question.text}</span>
            <span className="text-sm text-muted-foreground">{question.type === "mcq" ? `Multiple choice, ${question.options.length} options` : TYPE_NAMES[question.type] || "Question"}</span>
          </button>
          <DropdownMenu
            trigger={<Button variant="tertiary" size="sm" aria-label="Question options"><MoreHorizontal size={18} aria-hidden="true" /></Button>}
            items={[
              { label: "Edit", icon: Pencil, onSelect: () => edit(question) },
              { separator: true },
              { label: "Delete question", icon: Trash2, danger: true, onSelect: () => setRemoving(question) }
            ]} />
        </li>)}
      </ul>}

    <Dialog open={Boolean(form)} onClose={close} title={!form?.type ? "Choose a question type" : form.id ? "Change the question" : "New question"}
      actions={form?.type ? <><Button variant="tertiary" onClick={close}>Cancel</Button><Button disabled={!valid} loading={saving} onClick={save}>{form.id ? "Save question" : "Add question"}</Button></> : null}>
      {form && !form.type && <div className="grid grid-cols-2 gap-3">
        <button type="button" className={typeCard} onClick={() => setForm(blank("mcq"))}><ListChecks size={28} aria-hidden="true" /><strong>Multiple choice</strong><span className="text-sm text-muted-foreground">Pick the right answer</span></button>
        <button type="button" className={typeCard} onClick={() => setForm(blank("true_false"))}><ToggleLeft size={28} aria-hidden="true" /><strong>True or false</strong><span className="text-sm text-muted-foreground">A statement</span></button>
        <button type="button" className={typeCard} onClick={() => setForm(blank("fill_blank"))}><TextCursorInput size={28} aria-hidden="true" /><strong>Fill in the blank</strong><span className="text-sm text-muted-foreground">Type the missing word</span></button>
        <button type="button" className={typeCard} onClick={() => setForm(blank("short_answer"))}><NotebookPen size={28} aria-hidden="true" /><strong>Short answer</strong><span className="text-sm text-muted-foreground">Explain in a few sentences</span></button>
      </div>}
      {form?.type && <div className="grid gap-4">
        {problem && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{problem}</p>}
        <textarea aria-label="Question" autoFocus placeholder={form.type === "fill_blank" ? "Sentence with a blank, for example: Water boils at ____ °C." : "Question (formulas work: $x^2$ or $\\ce{H2O}$)"} rows={3} maxLength={1500} className={field} value={form.text} onChange={(event) => set({ text: event.target.value })} />
        {mcq && <div className="grid gap-2">
          <p className="m-0 text-sm text-muted-foreground">Tap the circle next to the right answer.</p>
          {form.options.map((option, index) => <div key={index} className="flex items-center gap-2">
            <button type="button" aria-pressed={form.correct === index} title="Correct answer"
              aria-label={form.correct === index ? `Option ${index + 1} is the correct answer` : `Mark option ${index + 1} as the correct answer`}
              onClick={() => set({ correct: index })}
              className={"grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " + (form.correct === index ? "border-transparent bg-primary text-primary-foreground" : "border-input bg-card text-muted-foreground hover:bg-muted")}>
              {form.correct === index ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
            </button>
            <input aria-label={`Option ${index + 1}`} placeholder={`Option ${index + 1}`} maxLength={300} className={input} value={option}
              onChange={(event) => set({ options: form.options.map((item, i) => (i === index ? event.target.value : item)) })} />
            {form.options.length > 2 && <button type="button" aria-label={`Remove option ${index + 1}`}
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => set({ options: form.options.filter((_, i) => i !== index), correct: form.correct === index ? 0 : form.correct > index ? form.correct - 1 : form.correct })}><X size={18} aria-hidden="true" /></button>}
          </div>)}
          {form.options.length < 6 && <div><Button variant="tertiary" size="sm" icon={Plus} onClick={() => set({ options: [...form.options, ""] })}>Add option</Button></div>}
        </div>}
        {form.type === "true_false" && <Segmented label="The answer is" value={form.truth} onChange={(truth) => set({ truth })} options={[{ value: "true", label: "True" }, { value: "false", label: "False" }]} />}
        {form.type === "fill_blank" && <textarea aria-label="Accepted answers" placeholder={"Accepted answers, one per line (case does not matter)"} rows={3} className={field} value={form.answers} onChange={(event) => set({ answers: event.target.value })} />}
        {form.type === "short_answer" && <>
          <textarea aria-label="Model answer" placeholder="Model answer: what a top answer says, in 1 to 3 sentences" rows={3} maxLength={1000} className={field} value={form.modelAnswer} onChange={(event) => set({ modelAnswer: event.target.value })} />
          <textarea aria-label="Key points" placeholder={"Key points a right answer must make, one per line (1 to 6). The AI marks answers on these."} rows={3} className={field} value={form.keyPoints} onChange={(event) => set({ keyPoints: event.target.value })} />
        </>}
        <textarea aria-label="Explanation" placeholder="Explanation shown after answering (optional)" rows={2} maxLength={4000} className={field} value={form.explanation} onChange={(event) => set({ explanation: event.target.value })} />
      </div>}
    </Dialog>

    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Delete this question?"
      actions={<><Button variant="tertiary" onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" onClick={remove}>Delete</Button></>}>
      <p className="m-0">This cannot be undone.</p>
    </Dialog>
  </div>;
}
