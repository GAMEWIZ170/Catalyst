import { plural } from "../utils/plural";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import AdminLayout from "../components/admin/AdminLayout";
import { Badge, Button, Radio, RadioGroup, SelectField, TextArea, TextField } from "../components/ui";
import { Loading } from "./Courses";
import RichText from "../components/RichText";
import FormulaHelp from "../components/admin/FormulaHelp";
import ImageField from "../components/admin/ImageField";
import Breadcrumbs from "../components/admin/Breadcrumbs";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import InlineRename from "../components/admin/InlineRename";
import StatusBadge from "../components/admin/StatusBadge";
import StatusMessage from "../components/admin/StatusMessage";
import Switch from "../components/admin/Switch";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import MoveButton from "../components/admin/MoveButton";
import WorkedSolution from "../components/WorkedSolution";
import QuestionTypeFields, { TYPE_LABELS, typeBody, typeDefaults, typeProblem } from "../components/admin/QuestionTypeFields";

const dataOf = (payload) => payload.data || payload;
const idOf = (item) => item._id || item.id;

function blankQuestion(type = "mcq", order = 1) {
  return {
    type,
    text: "",
    image: null,
    explanation: "",
    explanationImage: null,
    hint: "",
    workedSolution: [],
    topic: "",
    source: "",
    year: "",
    options: type === "mcq" ? [{ text: "", image: null }, { text: "", image: null }] : [],
    correctIndex: 0,
    correctAnswer: "true",
    order
  };
}

export default function AdminTestEditor() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [question, setQuestion] = useState(null);
  const [originalQuestion, setOriginalQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [passDraft, setPassDraft] = useState("");
  const [timeDraft, setTimeDraft] = useState("");
  const dirty = Boolean(question && originalQuestion && JSON.stringify(question) !== JSON.stringify(originalQuestion));
  const blocker = useUnsavedChanges(dirty);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = dataOf(await api.getAdminTest(id));
      setTest(next);
      setQuestions(next.questions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (blocker.state === "blocked") setMessage("");
  }, [blocker.state]);

  const trail = useMemo(() => location.state?.trail || [{ label: "Courses", to: "/admin" }, { label: test?.title || "Test" }], [location.state, test]);

  async function rename(title) {
    try {
      const next = dataOf(await api.updateTest(id, { title }));
      setTest((current) => ({ ...current, ...next }));
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { setPassDraft(test?.passPercent ?? ""); }, [test?.passPercent]);
  useEffect(() => { setTimeDraft(test?.timeLimitMinutes ?? ""); }, [test?.timeLimitMinutes]);

  // A time limit turns the test into a timed mock exam. Empty makes it an ordinary test again.
  async function saveTimeLimit(event) {
    event.preventDefault();
    const value = String(timeDraft).trim();
    const timeLimitMinutes = value === "" ? null : Number(value);
    if (timeLimitMinutes !== null && (!Number.isInteger(timeLimitMinutes) || timeLimitMinutes < 1 || timeLimitMinutes > 360)) {
      setMessage("");
      setError("Time limit must be a whole number of minutes from 1 to 360");
      return;
    }
    try {
      const next = dataOf(await api.updateTest(id, { timeLimitMinutes }));
      setTest((current) => ({ ...current, ...next }));
      setError("");
      setMessage(timeLimitMinutes === null ? "Time limit cleared" : "Time limit saved");
    } catch (err) { setError(err.message); }
  }

  async function savePassPercent(event) {
    event.preventDefault();
    const value = String(passDraft).trim();
    const passPercent = value === "" ? null : Number(value);
    if (passPercent !== null && (!Number.isInteger(passPercent) || passPercent < 0 || passPercent > 100)) {
      setMessage("");
      setError("Pass percent must be a whole number from 0 to 100");
      return;
    }
    try {
      const next = dataOf(await api.updateTest(id, { passPercent }));
      setTest((current) => ({ ...current, ...next }));
      setError("");
      setMessage(passPercent === null ? "Pass percent cleared" : "Pass percent saved");
    } catch (err) { setError(err.message); }
  }

  async function publish(isPublished) {
    try {
      const next = dataOf(await api.updateTest(id, { isPublished }));
      setTest((current) => ({ ...current, ...next }));
      setMessage(isPublished ? "Published" : "Unpublished");
    } catch (err) { setError(err.message); }
  }

  function openQuestion(item) {
    const next = JSON.parse(JSON.stringify(item));
    setQuestion(next);
    setOriginalQuestion(JSON.parse(JSON.stringify(next)));
  }

  function addQuestion() {
    const next = blankQuestion("mcq", questions.length + 1);
    setQuestion(next);
    setOriginalQuestion(JSON.parse(JSON.stringify(next)));
  }

  function updateOption(index, patch) {
    setQuestion((current) => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  }

  async function saveQuestion(addAnother = false) {
    setError("");
    if (!question.text.trim()) return setError("Question text is required.");
    if ([question.image, question.explanationImage].some((image) => image && !image.alt?.trim())) return setError("Add an image description before saving.");
    if (question.type === "mcq") {
      if (question.options.length < 2) return setError("A multiple choice question needs at least 2 options.");
      if (question.options.some((option) => !option.text?.trim() && !option.image?.url)) return setError("Each option needs text or an image.");
      if (!Number.isInteger(question.correctIndex)) return setError("Choose a correct answer.");
    }
    if (question.type === "true_false" && !question.correctAnswer) return setError("Choose the correct answer.");
    const problem = typeProblem(question);
    if (problem) return setError(problem);
    try {
      const body = {
        test: id,
        type: question.type,
        text: question.text,
        image: question.image,
        explanation: question.explanation,
        explanationImage: question.explanationImage,
        topic: question.topic || "",
        source: question.source || "",
        year: question.year === "" || question.year == null ? null : Number(question.year),
        hint: question.hint || "",
        workedSolution: (question.workedSolution || []).map((step) => step.trim()).filter(Boolean),
        order: question.order
      };
      if (question.type === "mcq") {
        body.options = question.options.map(({ text, image }) => ({ text, image }));
        body.correctIndex = question.correctIndex;
      } else if (question.type === "true_false") body.correctAnswer = question.correctAnswer;
      else Object.assign(body, typeBody(question));
      // The server refuses a type on update (a question's type cannot change), so only a new question sends it.
      if (question._id) delete body.type;
      const saved = dataOf(question._id ? await api.updateQuestion(question._id, body) : await api.createQuestion(body));
      if (addAnother && !question._id) {
        setQuestions((current) => [...current, saved]);
        const next = blankQuestion(question.type, questions.length + 2);
        setQuestion(next);
        setOriginalQuestion(JSON.parse(JSON.stringify(next)));
      } else {
        await load();
        setQuestion(null);
        setOriginalQuestion(null);
        setMessage("Question saved");
      }
    } catch (err) { setError(err.message); }
  }

  async function deleteQuestion() {
    try {
      await api.deleteQuestion(idOf(deleteTarget));
      setDeleteTarget(null);
      if (question && idOf(question) === idOf(deleteTarget)) {
        setQuestion(null);
        setOriginalQuestion(null);
      }
      await load();
      setMessage("Question deleted");
    } catch (err) { setError(err.message); }
  }

  async function moveQuestion(item, direction) {
    const index = questions.findIndex((entry) => idOf(entry) === idOf(item));
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    const ids = questions.map(idOf);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    try {
      await api.reorderQuestions({ test: id, ids });
      await load();
      setMessage("Moved");
    } catch (err) { setError(err.message); }
  }

  if (loading) return <AdminLayout nav={false}><Loading /></AdminLayout>;
  if (!test) return <div className="admin-layout"><div className="admin-layout-inner"><StatusMessage message={error || "Test not found"} error /></div></div>;

  return <div className="admin-layout"><div className="admin-layout-inner">
    <Breadcrumbs items={trail} />
    <div className="admin-heading">
      <div><InlineRename as="h1" name={test.title} onSave={rename} /><p className="muted">{test.scope === "true_false" ? "True or false" : `${test.scope[0].toUpperCase()}${test.scope.slice(1)} test`} · {plural(questions.length, "question")}</p></div>
      <div className="heading-actions">
        <Button as={Link} variant="secondary" to={`/admin/preview/tests/${id}`} state={{ from: location.pathname }}>Preview as student</Button>
        <Button as={Link} variant="secondary" to={`/admin/tests/${id}/import`} state={{ from: location.pathname }}>Import CSV</Button>
        <Switch checked={test.isPublished} onChange={publish} label={test.isPublished ? "Published" : "Publish"} />
      </div>
    </div>
    {test.scope === "lesson" && <form className="pass-percent" onSubmit={savePassPercent}>
      <div className="pass-percent-row">
        <TextField label="Pass percent" id="pass-percent" type="number" inputMode="numeric" min="0" max="100" step="1" placeholder="None" value={passDraft} onChange={(event) => setPassDraft(event.target.value)} hint="A student needs at least this score to complete the lesson. Leave it empty for no requirement." />
        <Button variant="secondary" type="submit" disabled={String(passDraft) === String(test.passPercent ?? "")}>Save</Button>
      </div>
    </form>}
    <form className="pass-percent" onSubmit={saveTimeLimit}>
      <div className="pass-percent-row">
        <TextField label="Time limit (minutes)" id="time-limit" type="number" inputMode="numeric" min="1" max="360" step="1" placeholder="None" value={timeDraft} onChange={(event) => setTimeDraft(event.target.value)} hint="Set a limit to make this a timed mock exam: no feedback until the end, and handed in automatically when time runs out. Leave it empty for an ordinary test." />
        <Button variant="secondary" type="submit" disabled={String(timeDraft) === String(test.timeLimitMinutes ?? "")}>Save</Button>
      </div>
    </form>
    <StatusMessage message={error || message} error={Boolean(error)} />
    {!questions.length && <p className="notice">A test with no questions gives no credit and stays hidden from students until it has at least one.</p>}
    <section className="admin-editor-section">
      <div className="section-heading"><h2>Questions</h2><Button variant="primary" type="button" onClick={addQuestion}>Add question</Button></div>
      <div className="question-list">
        {questions.map((item, index) => <div className="question-row" key={idOf(item)}>
          <button className="question-row-main" type="button" onClick={() => openQuestion(item)}><span>{index + 1}</span><span className="question-preview"><RichText>{item.text}</RichText></span><Badge>{TYPE_LABELS[item.type] || item.type}</Badge>{(item.image || item.options?.some((option) => option.image)) && <span aria-label="Has image">Image</span>}</button>
          <div className="row-actions"><MoveButton direction="up" disabled={index === 0} onClick={() => moveQuestion(item, -1)} /><MoveButton direction="down" disabled={index === questions.length - 1} onClick={() => moveQuestion(item, 1)} /><Button variant="tertiary" type="button" onClick={() => setDeleteTarget(item)}>Delete</Button></div>
        </div>)}
      </div>
    </section>
    {question && <aside className="question-editor admin-editor-section">
      <div className="section-heading"><h2>{question._id ? "Edit question" : "Add question"}</h2><Button variant="tertiary" type="button" onClick={() => { setQuestion(null); setOriginalQuestion(null); }}>Close</Button></div>
      <fieldset className="ui-fieldset" disabled={Boolean(question._id)}><SelectField label="Type" value={question.type} onChange={(event) => setQuestion({ ...question, type: event.target.value, ...typeDefaults(event.target.value) })}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</SelectField>{question._id && <p className="muted">A question's type cannot be changed.</p>}</fieldset>
      <TextArea label="Question text" maxLength="1500" rows="5" value={question.text} onChange={(event) => setQuestion({ ...question, text: event.target.value })} hint={`${question.text.length}/1500`} />
      <FormulaHelp /><div className="preview-box"><RichText>{question.text}</RichText></div>
      <ImageField label="Question image" value={question.image} onChange={(image) => setQuestion({ ...question, image })} />
      {!["mcq", "true_false"].includes(question.type) ? <QuestionTypeFields question={question} setQuestion={setQuestion} /> : question.type === "mcq" ? <div className="option-editor"><h3>Options</h3>{question.options.map((option, index) => <div className="option-row" key={index}><TextField label={`Option ${index + 1}`} maxLength="300" value={option.text || ""} onChange={(event) => updateOption(index, { text: event.target.value })} /><Radio name="correct-option" label="Correct answer" checked={question.correctIndex === index} onChange={() => setQuestion({ ...question, correctIndex: index })} /><ImageField compact label={`Option ${index + 1} image`} value={option.image} onChange={(image) => updateOption(index, { image })} /><Button variant="tertiary" type="button" disabled={question.options.length <= 2} onClick={() => setQuestion({ ...question, options: question.options.filter((_, optionIndex) => optionIndex !== index), correctIndex: question.correctIndex === index ? 0 : question.correctIndex > index ? question.correctIndex - 1 : question.correctIndex })}>Remove</Button></div>)}<Button variant="secondary" type="button" disabled={question.options.length >= 6} onClick={() => setQuestion({ ...question, options: [...question.options, { text: "", image: null }] })}>Add option</Button></div> : <RadioGroup legend="Correct answer"><Radio name="correct-answer" label="True" checked={question.correctAnswer === "true"} onChange={() => setQuestion({ ...question, correctAnswer: "true" })} /><Radio name="correct-answer" label="False" checked={question.correctAnswer === "false"} onChange={() => setQuestion({ ...question, correctAnswer: "false" })} /></RadioGroup>}
      <TextArea label="Explanation" maxLength="4000" rows="5" value={question.explanation || ""} onChange={(event) => setQuestion({ ...question, explanation: event.target.value })} /><FormulaHelp /><div className="preview-box"><RichText>{question.explanation || ""}</RichText></div><ImageField label="Explanation image" value={question.explanationImage} onChange={(explanationImage) => setQuestion({ ...question, explanationImage })} />
      <div className="option-row"><TextField label="Topic (optional)" maxLength="60" value={question.topic || ""} onChange={(event) => setQuestion({ ...question, topic: event.target.value })} hint="Students can practise a topic across lessons." /><TextField label="Source (optional)" maxLength="60" value={question.source || ""} onChange={(event) => setQuestion({ ...question, source: event.target.value })} hint="For example a past paper." /><TextField label="Year (optional)" inputMode="numeric" maxLength="4" value={question.year ?? ""} onChange={(event) => setQuestion({ ...question, year: event.target.value })} /></div>
      <TextArea label="Hint (optional)" maxLength="500" rows="2" value={question.hint || ""} onChange={(event) => setQuestion({ ...question, hint: event.target.value })} hint="Students can open it before they answer. Do not give the answer away." /><div className="preview-box"><RichText>{question.hint || ""}</RichText></div>
      <TextArea label="Worked solution (optional)" rows="6" value={(question.workedSolution || []).join("\n")} onChange={(event) => setQuestion({ ...question, workedSolution: event.target.value.split("\n") })} hint="One step per line, up to 12. Students see it as numbered steps after they answer." /><div className="preview-box"><WorkedSolution steps={question.workedSolution} /></div>
      <div className="editor-actions"><Button variant="secondary" type="button" disabled={!dirty} onClick={() => setQuestion(JSON.parse(JSON.stringify(originalQuestion)))}>Discard</Button><Button variant="secondary" type="button" onClick={() => saveQuestion(true)} disabled={Boolean(question._id)}>Save and add another</Button><Button variant="primary" type="button" onClick={() => saveQuestion(false)}>Save</Button></div>
    </aside>}
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete question?" description="This question will be removed from the test. You can restore it later from the Trash." confirmLabel="Delete question" onCancel={() => setDeleteTarget(null)} onConfirm={deleteQuestion} />
    <ConfirmDialog open={blocker.state === "blocked"} title="Leave without saving?" description="Your question changes will be lost." confirmLabel="Leave" cancelLabel="Stay" onCancel={() => blocker.reset()} onConfirm={() => blocker.proceed()} />
  </div></div>;
}
