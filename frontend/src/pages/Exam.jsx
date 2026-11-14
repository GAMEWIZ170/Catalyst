import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Flag, TriangleAlert } from "lucide-react";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import RichText from "../components/RichText";
import ResponsiveImage from "../components/ResponsiveImage";
import WorkedSolution from "../components/WorkedSolution";
import { ChoiceInput, Correct, QuestionInput } from "../components/QuestionInputs";
import { Button, Card, Illustration } from "../components/ui";
import { api } from "../api/client";
import { ErrorState, Loading } from "./Courses";

const pad = (value) => String(value).padStart(2, "0");
const clock = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  return `${hours ? `${hours}:` : ""}${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
};

// A timed mock exam. The server sets the deadline and hides all feedback until the exam is handed in.
export default function Exam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [touched, setTouched] = useState({}); // questions answered on this page, as opposed to restored after a reload
  const [flags, setFlags] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const offset = useRef(0); // the server's clock minus this device's clock
  const latest = useRef({});
  const saveTimer = useRef(null);
  const submitted = useRef(false);

  async function load() {
    setError("");
    try {
      const data = (await api.startExam(id)).data;
      if (data.finished) { setResult(data.result); return; }
      offset.current = new Date(data.serverNow).getTime() - Date.now();
      setAttempt(data);
      setAnswers(data.answers || {});
      setFlags(data.flags || []);
    } catch (err) { setError(err.status === 404 ? "This exam is not available" : err.message); }
  }
  useEffect(() => { load(); }, [id]);

  latest.current = { answers, flags, attempt };

  async function submit() {
    if (submitted.current || !latest.current.attempt) return;
    submitted.current = true;
    setSubmitting(true);
    setConfirming(false);
    window.clearTimeout(saveTimer.current);
    try {
      const { answers: finalAnswers, flags: finalFlags, attempt: current } = latest.current;
      setResult((await api.submitExam(current.attemptId, finalAnswers, finalFlags)).data);
      window.dispatchEvent(new Event("catalyst:refresh-streak"));
    } catch (err) {
      submitted.current = false;
      setError(err.message);
    }
    setSubmitting(false);
  }

  // The countdown follows the server's deadline. At zero the page hands the exam in by itself.
  useEffect(() => {
    if (!attempt || result) return undefined;
    const endsAt = new Date(attempt.endsAt).getTime();
    const tick = () => {
      const left = endsAt - (Date.now() + offset.current);
      setRemaining(left);
      if (left <= 0) submit();
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, result]);

  // Save a moment after the student stops changing things, so a reload or a closed tab loses nothing.
  function scheduleSave() {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const { answers: current, flags: currentFlags, attempt: active } = latest.current;
      if (!active || submitted.current) return;
      api.saveExam(active.attemptId, current, currentFlags).catch(() => {});
    }, 800);
  }
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const answerFor = (questionId) => (value) => {
    setTouched((items) => ({ ...items, [questionId]: true }));
    setAnswers((items) => {
      const next = { ...items };
      if (value === null) delete next[questionId]; else next[questionId] = value;
      return next;
    });
    scheduleSave();
  };
  function toggleFlag(questionId) {
    setFlags((items) => items.includes(questionId) ? items.filter((item) => item !== questionId) : [...items, questionId]);
    scheduleSave();
  }

  const questions = attempt?.questions || [];
  const unanswered = useMemo(() => questions.filter((question) => !answers[question._id]).length, [questions, answers]);

  if (error && !attempt && !result) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!attempt && !result) return <Loading />;

  if (result) return <div className="exam exam--page">
    <section className="exam-results" aria-labelledby="exam-score">
      <h1 className="sr-only">Mock exam results</h1>
      <Illustration name="done" className="results-illustration" />
      <p className="exam-score" id="exam-score"><span className="sr-only">Your score: </span>{result.score}%</p>
      <p className="exam-correct">{result.correct} of {result.total} correct.</p>
      <p className="muted">Best score {result.bestScore}% · Attempts {result.attempts}</p>
      <div className="button-row button-row--stack">
        <Button as={Link} variant="primary" to="/courses">Back to home</Button>
      </div>
      <div className="exam-missed">
        <h2>Review</h2>
        {result.review.map((item, position) => <details key={item.question._id} open={!item.isCorrect}>
          <summary>Question {position + 1}: {item.yourAnswer === null ? "not answered" : item.isCorrect ? "correct" : "not correct"}{item.flagged ? " (flagged)" : ""}</summary>
          <div className="exam-missed-body">
            <div className="exam-question"><RichText>{item.question.text}</RichText></div>
            {item.question.image?.url && <ResponsiveImage className="exam-image" image={item.question.image} sizes="(max-width: 600px) 100vw, 600px" />}
            {item.unitWrong && <p>The number was right, but the unit was not.</p>}
            {!item.isCorrect && <div className="qi-correct"><strong>Correct answer:</strong> <Correct question={item.question} correct={item.correctAnswer} /></div>}
            {item.explanation && <RichText>{item.explanation}</RichText>}
            {item.explanationImage?.url && <ResponsiveImage image={item.explanationImage} sizes="(max-width: 600px) 100vw, 600px" />}
            <WorkedSolution steps={item.workedSolution} />
          </div>
        </details>)}
      </div>
    </section>
  </div>;

  const question = questions[index];
  const lowTime = remaining !== null && remaining <= 5 * 60 * 1000;
  return <div className="exam exam--mock">
    <header className="exam-top">
      <Link className="exam-close" to="/courses" aria-label="Leave exam (the timer keeps running)"><ArrowLeft size={20} aria-hidden="true" /></Link>
      <p className="exam-count" aria-live="off">{index + 1} / {questions.length}</p>
      <p className={`exam-timer ${lowTime ? "exam-timer--low" : ""}`} role="timer" aria-label="Time left">{remaining === null ? "" : clock(remaining)}</p>
    </header>
    <p className="sr-only" role="status">{remaining !== null && remaining <= 60000 && remaining > 0 ? "Less than one minute left" : lowTime && remaining > 60000 ? "Less than five minutes left" : ""}</p>
    <nav className="exam-grid" aria-label="Questions">
      {questions.map((item, position) => {
        const answered = Boolean(answers[item._id]);
        const flagged = flags.includes(item._id);
        return <button key={item._id} type="button" className={`exam-grid-cell ${position === index ? "is-current" : ""} ${answered ? "is-answered" : ""} ${flagged ? "is-flagged" : ""}`} aria-current={position === index ? "true" : undefined} aria-label={`Question ${position + 1}, ${answered ? "answered" : "not answered"}${flagged ? ", flagged for review" : ""}`} onClick={() => setIndex(position)}>{position + 1}</button>;
      })}
    </nav>
    <div className="exam-body">
      {questions.map((item, position) => <section key={item._id} hidden={position !== index} aria-label={`Question ${position + 1}`}>
        <div className="exam-question"><RichText>{item.text}</RichText></div>
        {item.image?.url && <ResponsiveImage className="exam-image" image={item.image} sizes="(max-width: 600px) 100vw, 600px" />}
        {item.type === "mcq" || item.type === "true_false"
          ? <ChoiceInput question={item} initial={answers[item._id]} onAnswer={answerFor(item._id)} />
          : <QuestionInput question={item} onAnswer={answerFor(item._id)} />}
        {answers[item._id] && !touched[item._id] && <p className="muted">You answered this before the page reloaded. Choose again to change it.</p>}
      </section>)}
      <div className="button-row">
        <Button variant={flags.includes(question._id) ? "secondary" : "tertiary"} icon={Flag} aria-pressed={flags.includes(question._id)} onClick={() => toggleFlag(question._id)}>{flags.includes(question._id) ? "Flagged for review" : "Flag for review"}</Button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="exam-bar exam-bar--split">
      <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
      {index < questions.length - 1
        ? <Button onClick={() => setIndex(index + 1)}>Next</Button>
        : <Button loading={submitting} onClick={() => setConfirming(true)}>Submit exam</Button>}
      {index < questions.length - 1 && <Button variant="tertiary" loading={submitting} onClick={() => setConfirming(true)}>Submit</Button>}
    </div>
    <ConfirmDialog open={confirming} title="Submit your exam?" description={`${unanswered ? `${unanswered} ${unanswered === 1 ? "question is" : "questions are"} not answered. ` : ""}${flags.length ? `${flags.length} flagged for review. ` : ""}You cannot change your answers after you submit.`} confirmLabel="Submit exam" cancelLabel="Keep working" onConfirm={submit} onCancel={() => setConfirming(false)} />
  </div>;
}
