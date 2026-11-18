import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Flag, TriangleAlert } from "lucide-react";
import RichText from "../../components/shared/RichText";
import ResponsiveImage from "../../components/shared/ResponsiveImage";
import WorkedSolution from "../../components/learn/WorkedSolution";
import { ChoiceInput, Correct, QuestionInput } from "../../components/learn/QuestionInputs";
import { Button, Confirm, Illustration } from "../../components/ui";
import { api } from "../../api/client";
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
      const query = new URLSearchParams(window.location.search);
      const data = (await api.startExam(id, query.get("timed") === "1", query.get("board") === "1")).data;
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

  if (result) return <div className="mx-auto grid max-w-2xl gap-5 px-4 py-6">
    <section className="grid justify-items-center gap-3 text-center" aria-labelledby="exam-score">
      <h1 className="sr-only">Mock exam results</h1>
      <Illustration name="done" className="w-40 text-foreground" />
      <p className="m-0 text-6xl leading-none font-bold tabular-nums" id="exam-score"><span className="sr-only">Your score: </span>{result.score}%</p>
      <p className="m-0 text-lg">{result.correct} of {result.total} correct.</p>
      <p className="m-0 text-sm text-muted-foreground">Best score {result.bestScore}% · Attempts {result.attempts}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button as={Link} variant="primary" to="/home">Back to home</Button>
      </div>
      <div className="grid w-full gap-2 text-left">
        <h2 className="m-0 text-xl font-semibold">Review</h2>
        {result.review.map((item, position) => <details key={item.question._id} open={!item.isCorrect} className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer font-semibold">Question {position + 1}: {item.yourAnswer === null ? "not answered" : item.isCorrect ? "correct" : "not correct"}{item.flagged ? " (flagged)" : ""}</summary>
          <div className="mt-3 grid gap-2">
            <div className="text-lg font-semibold"><RichText>{item.question.text}</RichText></div>
            {item.question.image?.url && <ResponsiveImage className="max-h-72 rounded-lg" image={item.question.image} sizes="(max-width: 600px) 100vw, 600px" />}
            {item.unitWrong && <p>The number was right, but the unit was not.</p>}
            {!item.isCorrect && <div className="rounded-md bg-muted p-3"><strong>Correct answer:</strong> <Correct question={item.question} correct={item.correctAnswer} /></div>}
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
  return <div className="mx-auto grid max-w-2xl content-start gap-5 px-4 py-4 pb-24">
    <header className="flex items-center gap-3">
      <Link to="/home" aria-label="Leave exam (the timer keeps running)" className="grid size-11 shrink-0 place-items-center rounded-pill text-muted-foreground no-underline hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><ArrowLeft size={20} aria-hidden="true" /></Link>
      <p className="m-0 flex-1 text-sm text-muted-foreground tabular-nums" aria-live="off">{index + 1} / {questions.length}</p>
      <p className={`m-0 rounded-pill px-3 py-1 text-lg font-semibold tabular-nums ${lowTime ? "bg-warning/20" : "bg-muted"}`} role="timer" aria-label="Time left">{remaining === null ? "" : clock(remaining)}</p>
    </header>
    <p className="sr-only" role="status">{remaining !== null && remaining <= 60000 && remaining > 0 ? "Less than one minute left" : lowTime && remaining > 60000 ? "Less than five minutes left" : ""}</p>
    <nav className="flex flex-wrap gap-1.5" aria-label="Questions">
      {questions.map((item, position) => {
        const answered = Boolean(answers[item._id]);
        const flagged = flags.includes(item._id);
        return <button key={item._id} type="button" className={`grid size-11 cursor-pointer place-items-center rounded-lg border font-sans text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${position === index ? "border-2 border-foreground" : "border-input"} ${answered ? "bg-primary text-primary-foreground" : "bg-card text-foreground"} ${flagged ? "outline-2 outline-offset-2 outline-warning" : ""}`} aria-current={position === index ? "true" : undefined} aria-label={`Question ${position + 1}, ${answered ? "answered" : "not answered"}${flagged ? ", flagged for review" : ""}`} onClick={() => setIndex(position)}>{position + 1}</button>;
      })}
    </nav>
    <div className="grid gap-5">
      {questions.map((item, position) => <section key={item._id} hidden={position !== index} aria-label={`Question ${position + 1}`} className="grid gap-4">
        <div className="text-xl leading-snug font-semibold sm:text-2xl"><RichText>{item.text}</RichText></div>
        {item.image?.url && <ResponsiveImage className="max-h-72 rounded-lg" image={item.image} sizes="(max-width: 600px) 100vw, 600px" />}
        {item.type === "mcq" || item.type === "true_false"
          ? <ChoiceInput question={item} initial={answers[item._id]} onAnswer={answerFor(item._id)} />
          : <QuestionInput question={item} onAnswer={answerFor(item._id)} />}
        {answers[item._id] && !touched[item._id] && <p className="m-0 text-sm text-muted-foreground">You answered this before the page reloaded. Choose again to change it.</p>}
      </section>)}
      <div>
        <Button variant={flags.includes(question._id) ? "secondary" : "tertiary"} icon={Flag} aria-pressed={flags.includes(question._id)} onClick={() => toggleFlag(question._id)}>{flags.includes(question._id) ? "Flagged for review" : "Flag for review"}</Button>
      </div>
      {error && <p className="m-0 text-destructive" role="alert">{error}</p>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button variant="secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</Button>
      {index < questions.length - 1
        ? <Button onClick={() => setIndex(index + 1)}>Next</Button>
        : <Button loading={submitting} onClick={() => setConfirming(true)}>Submit exam</Button>}
      {index < questions.length - 1 && <Button variant="tertiary" loading={submitting} onClick={() => setConfirming(true)}>Submit</Button>}
    </div>
    <Confirm tone="primary" open={confirming} title="Submit your exam?" description={`${unanswered ? `${unanswered} ${unanswered === 1 ? "question is" : "questions are"} not answered. ` : ""}${flags.length ? `${flags.length} flagged for review. ` : ""}You cannot change your answers after you submit.`} confirmLabel="Submit exam" cancelLabel="Keep working" onConfirm={submit} onCancel={() => setConfirming(false)} />
  </div>;
}
