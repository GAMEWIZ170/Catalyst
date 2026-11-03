import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
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

const dataOf = (payload) => payload.data || payload;
const idOf = (item) => item._id || item.id;

function blankQuestion(type = "mcq", order = 1) {
  return {
    type,
    text: "",
    image: null,
    explanation: "",
    explanationImage: null,
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
    try {
      const body = {
        test: id,
        type: question.type,
        text: question.text,
        image: question.image,
        explanation: question.explanation,
        explanationImage: question.explanationImage,
        order: question.order
      };
      if (question.type === "mcq") {
        body.options = question.options.map(({ text, image }) => ({ text, image }));
        body.correctIndex = question.correctIndex;
      } else body.correctAnswer = question.correctAnswer;
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

  if (loading) return <div className="admin-layout"><div className="admin-layout-inner"><p>Loading test...</p></div></div>;
  if (!test) return <div className="admin-layout"><div className="admin-layout-inner"><StatusMessage message={error || "Test not found"} error /></div></div>;

  return <div className="admin-layout"><div className="admin-layout-inner">
    <Breadcrumbs items={trail} />
    <div className="admin-heading">
      <div><InlineRename name={test.title} onSave={rename} /><p className="muted">{test.scope === "true_false" ? "True or false" : `${test.scope[0].toUpperCase()}${test.scope.slice(1)} test`} · {questions.length} questions</p></div>
      <Switch checked={test.isPublished} onChange={publish} label={test.isPublished ? "Published" : "Publish"} />
    </div>
    <StatusMessage message={error || message} error={Boolean(error)} />
    {!questions.length && <p className="notice">A test with no questions gives no credit and stays hidden from students until it has at least one.</p>}
    <section className="admin-editor-section">
      <div className="section-heading"><h2>Questions</h2><button className="button button-primary" type="button" onClick={addQuestion}>Add question</button></div>
      <div className="question-list">
        {questions.map((item, index) => <div className="question-row" key={idOf(item)}>
          <button className="question-row-main" type="button" onClick={() => openQuestion(item)}><span>{index + 1}</span><span className="question-preview"><RichText>{item.text}</RichText></span><span className="status-badge status-badge--draft">{item.type === "mcq" ? "Multiple choice" : "True or false"}</span>{(item.image || item.options?.some((option) => option.image)) && <span aria-label="Has image">Image</span>}</button>
          <div className="row-actions"><MoveButton direction="up" disabled={index === 0} onClick={() => moveQuestion(item, -1)} /><MoveButton direction="down" disabled={index === questions.length - 1} onClick={() => moveQuestion(item, 1)} /><button className="text-button" type="button" onClick={() => setDeleteTarget(item)}>Delete</button></div>
        </div>)}
      </div>
    </section>
    {question && <aside className="question-editor admin-editor-section">
      <div className="section-heading"><h2>{question._id ? "Edit question" : "Add question"}</h2><button className="text-button" type="button" onClick={() => { setQuestion(null); setOriginalQuestion(null); }}>Close</button></div>
      <fieldset disabled={Boolean(question._id)}><legend>Type</legend><label><input type="radio" checked={question.type === "mcq"} onChange={() => setQuestion({ ...question, type: "mcq", options: blankQuestion().options, correctIndex: 0 })} /> Multiple choice</label><label><input type="radio" checked={question.type === "true_false"} onChange={() => setQuestion({ ...question, type: "true_false", options: [] })} /> True or false</label>{question._id && <p className="muted">A question's type cannot be changed.</p>}</fieldset>
      <label className="admin-field">Question text<textarea maxLength="1500" rows="5" value={question.text} onChange={(event) => setQuestion({ ...question, text: event.target.value })} /><span className="muted">{question.text.length}/1500</span></label>
      <FormulaHelp /><div className="preview-box"><RichText>{question.text}</RichText></div>
      <ImageField label="Question image" value={question.image} onChange={(image) => setQuestion({ ...question, image })} />
      {question.type === "mcq" ? <div className="option-editor"><h3>Options</h3>{question.options.map((option, index) => <div className="option-row" key={index}><label className="admin-field">Option {index + 1}<input maxLength="300" value={option.text || ""} onChange={(event) => updateOption(index, { text: event.target.value })} /></label><label><input type="radio" name="correct-option" checked={question.correctIndex === index} onChange={() => setQuestion({ ...question, correctIndex: index })} /> Correct answer</label><ImageField compact label={`Option ${index + 1} image`} value={option.image} onChange={(image) => updateOption(index, { image })} /><button className="text-button" type="button" disabled={question.options.length <= 2} onClick={() => setQuestion({ ...question, options: question.options.filter((_, optionIndex) => optionIndex !== index), correctIndex: question.correctIndex === index ? 0 : question.correctIndex > index ? question.correctIndex - 1 : question.correctIndex })}>Remove</button></div>)}<button className="button button-secondary" type="button" disabled={question.options.length >= 6} onClick={() => setQuestion({ ...question, options: [...question.options, { text: "", image: null }] })}>Add option</button></div> : <fieldset><legend>Correct answer</legend><label><input type="radio" checked={question.correctAnswer === "true"} onChange={() => setQuestion({ ...question, correctAnswer: "true" })} /> True</label><label><input type="radio" checked={question.correctAnswer === "false"} onChange={() => setQuestion({ ...question, correctAnswer: "false" })} /> False</label></fieldset>}
      <label className="admin-field">Explanation<textarea maxLength="4000" rows="5" value={question.explanation || ""} onChange={(event) => setQuestion({ ...question, explanation: event.target.value })} /></label><FormulaHelp /><div className="preview-box"><RichText>{question.explanation || ""}</RichText></div><ImageField label="Explanation image" value={question.explanationImage} onChange={(explanationImage) => setQuestion({ ...question, explanationImage })} />
      <div className="editor-actions"><button className="button button-secondary" type="button" disabled={!dirty} onClick={() => setQuestion(JSON.parse(JSON.stringify(originalQuestion)))}>Discard</button><button className="button button-secondary" type="button" onClick={() => saveQuestion(true)} disabled={Boolean(question._id)}>Save and add another</button><button className="button button-primary" type="button" onClick={() => saveQuestion(false)}>Save</button></div>
    </aside>}
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete question?" description="This question will be removed from the test." confirmLabel="Delete question" onCancel={() => setDeleteTarget(null)} onConfirm={deleteQuestion} />
    <ConfirmDialog open={blocker.state === "blocked"} title="Leave without saving?" description="Your question changes will be lost." confirmLabel="Leave" cancelLabel="Stay" onCancel={() => blocker.reset()} onConfirm={() => blocker.proceed()} />
  </div></div>;
}
