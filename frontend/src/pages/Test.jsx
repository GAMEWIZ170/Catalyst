import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Check, CheckCircle2, TriangleAlert, X } from "lucide-react";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import RichText from "../components/RichText";
import { Button, Card, EmptyState, Illustration } from "../components/ui";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { api } from "../api/client";
import ResponsiveImage from "../components/ResponsiveImage";
import { ErrorState, Loading } from "./Courses";

const dataOf = (payload) => payload.data || payload;

function scoreMessage(score) {
  if (score === 100) return "Every answer was right.";
  if (score >= 70) return "Solid work. Look at what you missed.";
  if (score >= 40) return "A start. Read the lesson again, then retry.";
  return "Go back through the lesson, then try again.";
}

export default function Test() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // /practice/mistakes has no test behind it: the questions come from the student's mistakes queue.
  const isMistakes = location.pathname === "/practice/mistakes";
  const [subset, setSubset] = useState(false); // "Practise the ones I missed" inside a normal test
  const practice = isMistakes || subset; // practice runs are graded per question but never submitted
  const [test, setTest] = useState(null);
  const [phase, setPhase] = useState("intro");
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [missed, setMissed] = useState([]);
  const [showMissed, setShowMissed] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [busy, setBusy] = useState(false);
  const feedbackHeading = useRef(null);
  const missedRef = useRef(null);
  const backTo = location.state?.from || "/courses";
  const backState = location.state?.courseFrom ? { from: location.state.courseFrom } : undefined;
  const backLabel = isMistakes ? "Back" : `Back to ${backTo.startsWith("/lessons/") ? "lesson" : "course"}`;
  const dirty = phase === "question" && answers.length > 0;
  const blocker = useUnsavedChanges(dirty);

  async function load() {
    setError("");
    try {
      if (isMistakes) {
        const query = {};
        if (searchParams.get("course")) query.course = searchParams.get("course");
        if (searchParams.get("unit")) query.unit = searchParams.get("unit");
        setTest(dataOf(await api.getMistakePractice(query)));
      } else setTest(dataOf(await api.getTest(id)));
    } catch (err) { setError(err.status === 404 ? "This test is not available" : err.message); }
  }
  useEffect(() => { load(); }, [id, isMistakes]);
  useEffect(() => {
    if (blocker.state === "blocked") setBlocking(true);
  }, [blocker.state]);
  useEffect(() => { if (feedback) feedbackHeading.current?.focus(); }, [feedback]);

  // Keys 1 to 4 pick an answer. True is 1, False is 2. Enter checks the answer, then moves on.
  const enterAction = useRef(null);
  enterAction.current = feedback ? continueQuestion : checkAnswer;
  useEffect(() => {
    if (phase !== "question" || !test) return undefined;
    const question = test.questions[index];
    const values = question.type === "mcq" ? question.options.map((option) => option._id) : ["true", "false"];
    function onKey(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.("input, textarea, select")) return;
      if (event.key === "Enter") {
        // On a focused button or link, Enter already activates it; do not do it twice.
        if ((event.target.closest?.("button, a") && !event.target.closest?.(".exam-option")) || event.repeat) return;
        event.preventDefault();
        enterAction.current?.();
        return;
      }
      if (feedback) return;
      const position = Number(event.key) - 1;
      if (Number.isInteger(position) && position >= 0 && position < values.length) setChosen(values[position]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, feedback, test, index]);

  function start() {
    setPhase("question");
    setIndex(0);
    setChosen(null);
    setFeedback(null);
    setAnswers([]);
    setMissed([]);
    setShowMissed(false);
  }
  // Saving is idempotent on the server; the list here only tracks what was saved during this test.
  const [savedQuestions, setSavedQuestions] = useState(() => new Set());
  async function toggleSavedQuestion(questionId) {
    const wasSaved = savedQuestions.has(questionId);
    setSavedQuestions((items) => { const next = new Set(items); if (wasSaved) next.delete(questionId); else next.add(questionId); return next; });
    try {
      if (wasSaved) await api.removeBookmark("question", questionId);
      else await api.saveBookmark("question", questionId);
    } catch (err) {
      setSavedQuestions((items) => { const next = new Set(items); if (wasSaved) next.add(questionId); else next.delete(questionId); return next; });
      setError(err.message);
    }
  }
  function selectAnswer(value) { if (!feedback) setChosen(value); }
  async function checkAnswer() {
    if (chosen === null || busy) return;
    setBusy(true);
    try {
      const current = test.questions[index];
      const response = dataOf(await api.answerQuestion(current._id, chosen));
      setAnswers((items) => [...items.filter((item) => item.questionId !== current._id), { questionId: current._id, answer: chosen }]);
      setMissed((items) => {
        const rest = items.filter((item) => item.id !== current._id);
        return response.isCorrect ? rest : [...rest, { id: current._id, number: index + 1, text: current.text, correct: response.correctAnswer, explanation: response.explanation }];
      });
      setFeedback(response);
    } catch (err) { setError(err.message); }
    setBusy(false);
  }
  async function finish() {
    setBusy(true);
    try {
      if (practice) {
        const total = test.questions.length;
        const correct = total - missed.length;
        setResult({ practice: true, score: Math.round((correct / total) * 100), correct, total });
        setPhase("results");
        setBusy(false);
        return;
      }
      const response = dataOf(await api.submitTest(id, answers));
      setResult(response);
      setPhase("results");
      window.dispatchEvent(new Event("catalyst:refresh-streak"));
    } catch (err) { setError(err.message); }
    setBusy(false);
  }
  function continueQuestion() {
    if (index === test.questions.length - 1) return finish();
    setIndex((value) => value + 1);
    setChosen(null);
    setFeedback(null);
    setError("");
  }
  function leave() {
    setBlocking(false);
    if (blocker.state === "blocked") blocker.proceed();
    else navigate(backTo, { state: backState });
  }
  // Run the test again with only the questions answered wrong. Nothing is submitted, so scores stay as they were.
  function practiseMissed() {
    const ids = new Set(missed.map((item) => item.id));
    setTest((current) => ({ ...current, questions: current.questions.filter((item) => ids.has(item._id)) }));
    setSubset(true);
    start();
  }
  async function tryAgain() {
    if (!subset) await load(); // a mistakes queue may have changed; a normal test is fetched fresh
    start();
  }
  function reviewMistakes() {
    setShowMissed(true);
    window.setTimeout(() => missedRef.current?.focus(), 0);
  }

  if (error && !test) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!test) return <Loading />;
  // Only lesson tests can complete a lesson, so only they show a pass percent.
  const needsPass = !practice && test.scope === "lesson" && test.passPercent != null;

  if (isMistakes && test.questions.length === 0) return <div className="exam exam--page">
    <Link className="back-link" to={backTo} state={backState}><ArrowLeft size={16} aria-hidden="true" />{backLabel}</Link>
    <EmptyState illustration={<Illustration name="done" />} title="No mistakes to practise" description="Questions you get wrong will appear here until you answer them right on two different days." action={<Button as={Link} variant="secondary" to={backTo} state={backState}>{backLabel}</Button>} />
  </div>;

  if (phase === "intro") return <div className="exam exam--page">
    <Link className="back-link" to={backTo} state={backState}><ArrowLeft size={16} aria-hidden="true" />{backLabel}</Link>
    <Card className="exam-intro">
      <h1>{test.title}</h1>
      <p>{test.questions.length} {test.questions.length === 1 ? "question" : "questions"}{isMistakes ? " you got wrong before" : ""}. Pick an answer, check it, then continue.</p>
      {needsPass && <p className="muted">You need at least {test.passPercent}% to complete the lesson.</p>}
      <div><Button onClick={start}>Start test</Button></div>
    </Card>
  </div>;

  if (phase === "results") {
    const passed = needsPass && result.passed;
    return <div className="exam exam--page">
      <section className="exam-results" aria-labelledby="score-heading">
        <h1 className="sr-only">{test.title}: results</h1>
        <Illustration name="done" className="results-illustration" />
        <p className="exam-score" id="score-heading"><span className="sr-only">Your score: </span>{result.score}%</p>
        <p className="exam-correct">{result.correct} of {result.total} correct. {scoreMessage(result.score)}</p>
        {!result.practice && <p className="muted">Best score {result.bestScore}% · Attempts {result.attempts}</p>}
        {needsPass && <p className={`exam-verdict ${result.passed ? "exam-verdict--passed" : ""}`} role="status">
          {result.passed ? <CheckCircle2 size={16} aria-hidden="true" /> : <TriangleAlert size={16} aria-hidden="true" />}
          {result.passed ? "Passed. This lesson is complete." : `Not yet. You need ${result.passPercent}% to pass.`}
        </p>}
        <div className="button-row button-row--stack">
          {missed.length > 0 && !practice && <Button variant="secondary" onClick={practiseMissed}>Practise the ones I missed</Button>}
          {missed.length > 0 && !showMissed && <Button variant="secondary" onClick={reviewMistakes}>Review mistakes</Button>}
          <Button variant={passed || missed.length === 0 ? "secondary" : "tertiary"} onClick={tryAgain}>Try again</Button>
          <Button as={Link} variant={passed || !needsPass ? "primary" : "secondary"} to={backTo} state={backState}>{backLabel}</Button>
        </div>
        {missed.length > 0 && showMissed && <div className="exam-missed" ref={missedRef} tabIndex="-1">
          <h2>{missed.length} to review</h2>
          {missed.map((item) => <details key={item.id} open>
            <summary>Question {item.number}</summary>
            <div className="exam-missed-body">
              <div className="exam-question"><RichText>{item.text}</RichText></div>
              <p><strong>Correct answer:</strong> {typeof item.correct === "object" ? <RichText>{item.correct.text}</RichText> : item.correct}</p>
              {item.explanation && <RichText>{item.explanation}</RichText>}
            </div>
          </details>)}
        </div>}
      </section>
    </div>;
  }

  const question = test.questions[index];
  const total = test.questions.length;
  const correct = feedback?.correctAnswer;
  const isLast = index === total - 1;
  const stateOf = (value, isRightOption) => {
    if (feedback && isRightOption) return "correct";
    if (feedback && chosen === value && !feedback.isCorrect) return "wrong";
    return chosen === value ? "selected" : "";
  };
  const mark = (state) => state === "correct" ? <Check size={16} aria-hidden="true" /> : state === "wrong" ? <X size={16} aria-hidden="true" /> : null;
  const srState = (state) => state === "correct" ? <span className="sr-only"> (correct answer)</span> : state === "wrong" ? <span className="sr-only"> (your answer, not correct)</span> : null;
  const optionClass = (state) => `exam-option ${state ? `exam-option--${state}` : ""}`;

  return <div className="exam">
    <header className="exam-top">
      <button className="exam-close" type="button" aria-label="Close test" onClick={() => navigate(backTo, { state: backState })}><X size={20} aria-hidden="true" /></button>
      <div className="exam-progress" role="progressbar" aria-label="Test progress" aria-valuemin="0" aria-valuemax={total} aria-valuenow={index + (feedback ? 1 : 0)} style={{ "--progress": `${((index + (feedback ? 1 : 0)) / total) * 100}%` }} />
      <p className="exam-count">{index + 1} / {total}</p>
    </header>
    <div className="exam-body">
      <h1 className="sr-only">{test.title}</h1>
      <div className="exam-question"><RichText>{question.text}</RichText></div>
      {question.image?.url && <ResponsiveImage className="exam-image" image={question.image} sizes="(max-width: 600px) 100vw, 600px" />}
      {question.type === "mcq"
        ? <fieldset className="exam-options"><legend>Choose an answer. Keys 1 to {question.options.length}.</legend>
          {question.options.map((option, position) => {
            const state = stateOf(option._id, correct?._id === option._id);
            return <button className={optionClass(state)} type="button" aria-pressed={chosen === option._id} disabled={Boolean(feedback)} key={option._id} onClick={() => selectAnswer(option._id)}>
              <span className="exam-key" aria-hidden="true">{position + 1}</span>
              <span className="exam-option-text"><RichText>{option.text}</RichText>{option.image?.url && <ResponsiveImage image={option.image} sizes="(max-width: 600px) 80vw, 300px" />}{srState(state)}</span>
              {mark(state)}
            </button>;
          })}
        </fieldset>
        : <fieldset className="exam-options exam-options--two"><legend>Choose an answer. Keys 1 and 2.</legend>
          {["true", "false"].map((value, position) => {
            const state = stateOf(value, correct === value);
            return <button className={optionClass(state)} type="button" aria-pressed={chosen === value} disabled={Boolean(feedback)} key={value} onClick={() => selectAnswer(value)}>
              <span className="exam-key" aria-hidden="true">{position + 1}</span>
              <span className="exam-option-text">{value === "true" ? "True" : "False"}{srState(state)}</span>
              {mark(state)}
            </button>;
          })}
        </fieldset>}
      {feedback && <section className={`exam-feedback exam-feedback--${feedback.isCorrect ? "correct" : "wrong"}`} aria-live="polite">
        <h2 tabIndex="-1" ref={feedbackHeading}>{feedback.isCorrect ? <CheckCircle2 size={20} aria-hidden="true" /> : <TriangleAlert size={20} aria-hidden="true" />}{feedback.isCorrect ? "Correct" : "Not quite"}</h2>
        {!feedback.isCorrect && <p><strong>Correct answer:</strong> {typeof correct === "object" ? <RichText>{correct.text}</RichText> : correct === "true" ? "True" : correct === "false" ? "False" : correct}</p>}
        <RichText>{feedback.explanation}</RichText>
        <Button variant="tertiary" icon={Bookmark} aria-pressed={savedQuestions.has(question._id)} onClick={() => toggleSavedQuestion(question._id)}>{savedQuestions.has(question._id) ? "Saved" : "Save question"}</Button>
        {feedback.explanationImage?.url && <ResponsiveImage image={feedback.explanationImage} sizes="(max-width: 600px) 100vw, 600px" />}
      </section>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
    <div className="exam-bar">
      {!feedback
        ? <Button block disabled={chosen === null} loading={busy} onClick={checkAnswer}>Check</Button>
        : <Button block loading={busy} onClick={continueQuestion}>{isLast ? "Finish test" : "Continue"}</Button>}
    </div>
    <ConfirmDialog open={blocking} title="Leave this test?" description="Your answers will not be saved." confirmLabel="Leave" cancelLabel="Stay" onConfirm={leave} onCancel={() => { setBlocking(false); blocker.reset?.(); }} />
  </div>;
}
