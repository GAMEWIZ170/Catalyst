import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import InlineRename from "../components/admin/InlineRename";
import { Button, Card, EmptyState, SelectField, TextArea, TextField } from "../components/ui";
import { ErrorState, Loading } from "./Courses";

const blank = () => ({ id: null, type: "mcq", text: "", options: ["", ""], correct: 0, truth: "true", explanation: "" });

// One quiz of a study set: its questions (multiple choice or true or false) and a form to add or change them.
export default function LabQuiz() {
  const { testId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blank);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(null);

  function load() {
    api.getSetQuiz(testId).then(({ data }) => setQuiz(data)).catch((err) => setError(err.status === 404 ? "This quiz was not found" : err.message));
  }
  useEffect(load, [testId]);

  function edit(question) {
    setStatus("");
    setForm({
      id: question._id, type: question.type, text: question.text,
      options: question.type === "mcq" ? question.options.map((option) => option.text) : ["", ""],
      correct: question.correctIndex ?? 0, truth: question.correctAnswer || "true", explanation: question.explanation || ""
    });
    document.getElementById("question-form")?.scrollIntoView({ block: "start" });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const base = { text: form.text.trim(), explanation: form.explanation.trim() };
    const body = form.type === "mcq"
      ? { ...base, options: form.options.map((text) => ({ text: text.trim() })), correctIndex: form.correct }
      : { ...base, correctAnswer: form.truth };
    try {
      if (form.id) await api.updateSetQuestion(form.id, body);
      else await api.createSetQuestion({ ...body, test: testId, type: form.type, order: quiz.questions.length + 1 });
      setForm(blank());
      setStatus(form.id ? "Question saved" : "Question added");
      load();
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const target = removing;
    setRemoving(null);
    try {
      await api.deleteSetQuestion(target._id);
      if (form.id === target._id) setForm(blank());
      setStatus("Question deleted");
      load();
    } catch (err) {
      setStatus(err.message);
    }
  }

  if (error && !quiz) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!quiz) return <Loading />;
  const mcq = form.type === "mcq";
  const setOption = (index, value) => setForm({ ...form, options: form.options.map((option, i) => (i === index ? value : option)) });
  const removeOption = (index) => setForm({ ...form, options: form.options.filter((_, i) => i !== index), correct: form.correct === index ? 0 : form.correct > index ? form.correct - 1 : form.correct });

  return <div className="content student-page lab-quiz">
    <Link className="back-link" to={`/lab/${quiz.set}?tab=quizzes`}><ArrowLeft size={16} aria-hidden="true" />Back to my set</Link>
    <header className="lab-set-header">
      <InlineRename as="h1" name={quiz.title} onSave={async (title) => { try { await api.renameSetQuiz(testId, title); load(); } catch (err) { setStatus(err.message); } }} />
      {quiz.questions.length > 0 && <Button as={Link} to={`/tests/${testId}`} state={{ from: `/lab/${quiz.set}?tab=quizzes` }}>Take quiz</Button>}
    </header>

    <section className="settings-section" aria-labelledby="questions-heading">
      <h2 id="questions-heading">Questions ({quiz.questions.length})</h2>
      {quiz.questions.length === 0
        ? <EmptyState title="No questions yet" description="Add your first question below." />
        : <ol className="set-card-list">{quiz.questions.map((question) => <li key={question._id}>
          <span className="set-card-text"><strong>{question.text}</strong><span className="muted">{question.type === "mcq" ? `Multiple choice, ${question.options.length} options` : "True or false"}</span></span>
          <span className="catalog-actions">
            <Button variant="secondary" type="button" onClick={() => edit(question)}>Edit</Button>
            <Button variant="secondary" type="button" onClick={() => setRemoving(question)}>Delete</Button>
          </span>
        </li>)}</ol>}
    </section>

    <Card as="section" className="question-form-card" id="question-form" aria-labelledby="form-heading">
      <h2 id="form-heading">{form.id ? "Change the question" : "Add a question"}</h2>
      <form className="form-stack" onSubmit={submit}>
        {!form.id && <SelectField label="Type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="mcq">Multiple choice</option>
          <option value="true_false">True or false</option>
        </SelectField>}
        <TextArea label="Question" required maxLength="1500" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} hint="Formulas work: $x^2$ or $\ce{H2O}$." />
        {mcq && <fieldset className="author-picker">
          <legend>Options (choose the right one)</legend>
          {form.options.map((option, index) => <div className="option-row" key={index}>
            <input type="radio" name="correct" aria-label={`Option ${index + 1} is correct`} checked={form.correct === index} onChange={() => setForm({ ...form, correct: index })} />
            <TextField label={`Option ${index + 1}`} required maxLength="300" value={option} onChange={(event) => setOption(index, event.target.value)} />
            {form.options.length > 2 && <Button variant="secondary" type="button" onClick={() => removeOption(index)} aria-label={`Remove option ${index + 1}`}>Remove</Button>}
          </div>)}
          {form.options.length < 6 && <Button variant="secondary" type="button" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>Add option</Button>}
        </fieldset>}
        {!mcq && <SelectField label="The answer is" value={form.truth} onChange={(event) => setForm({ ...form, truth: event.target.value })}>
          <option value="true">True</option>
          <option value="false">False</option>
        </SelectField>}
        <TextArea label="Explanation (optional, shown after answering)" maxLength="4000" value={form.explanation} onChange={(event) => setForm({ ...form, explanation: event.target.value })} />
        <div className="button-row">
          <Button type="submit" loading={saving}>{form.id ? "Save question" : "Add question"}</Button>
          {form.id && <Button variant="secondary" type="button" onClick={() => { setForm(blank()); setStatus(""); }}>Cancel</Button>}
        </div>
      </form>
      <p className="settings-status" role="status">{status}</p>
    </Card>
    <ConfirmDialog open={Boolean(removing)} title="Delete this question?" description="This cannot be undone." confirmLabel="Delete" onConfirm={remove} onCancel={() => setRemoving(null)} />
  </div>;
}
