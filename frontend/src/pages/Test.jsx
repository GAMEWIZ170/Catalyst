import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../components/admin/ConfirmDialog";
import RichText from "../components/RichText";
import useUnsavedChanges from "../hooks/useUnsavedChanges";
import { api } from "../api/client";
import { imageUrl } from "../utils/cloudinary";
import { ErrorState, Loading } from "./Courses";

const dataOf = (payload) => payload.data || payload;

export default function Test() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [phase, setPhase] = useState("intro");
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [blocking, setBlocking] = useState(false);
  const feedbackHeading = useRef(null);
  const dirty = phase === "question" && answers.length > 0;
  const blocker = useUnsavedChanges(dirty);

  async function load() {
    setError("");
    try { setTest(dataOf(await api.getTest(id))); } catch (err) { setError(err.status === 404 ? "This test is not available" : err.message); }
  }
  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (blocker.state === "blocked") setBlocking(true);
  }, [blocker.state]);
  useEffect(() => { if (feedback) feedbackHeading.current?.focus(); }, [feedback]);

  function start() {
    setPhase("question");
    setIndex(0);
    setChosen(null);
    setFeedback(null);
    setAnswers([]);
  }
  function selectAnswer(value) { if (!feedback) setChosen(value); }
  async function checkAnswer() {
    if (chosen === null) return;
    try {
      const current = test.questions[index];
      const response = dataOf(await api.answerQuestion(current._id, chosen));
      setAnswers((items) => [...items.filter((item) => item.questionId !== current._id), { questionId: current._id, answer: chosen }]);
      setFeedback(response);
    } catch (err) { setError(err.message); }
  }
  async function finish() {
    try {
      const response = dataOf(await api.submitTest(id, answers));
      setResult(response);
      setPhase("results");
      window.dispatchEvent(new Event("catalyst:refresh-streak"));
    } catch (err) { setError(err.message); }
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
    else navigate(location.state?.from || "/courses");
  }
  if (error && !test) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!test) return <Loading />;
  if (phase === "intro") return <div className="content test-page"><Link className="back-link" to={location.state?.from || "/courses"}>Back</Link><section className="test-intro"><h1>{test.title}</h1><p>{test.questions.length} questions</p><button className="button button-primary" type="button" onClick={start}>Start test</button></section></div>;
  if (phase === "results") return <div className="content test-page"><section className="test-results"><p className="eyebrow">TEST COMPLETE</p><h1>{result.score}%</h1><p>{result.correct} of {result.total} correct</p><p>Best score: {result.bestScore}% · Attempts: {result.attempts}</p><div className="dialog-actions"><button className="button button-primary" type="button" onClick={async () => { await load(); start(); }}>Try again</button><Link className="button button-secondary" to={location.state?.from || "/courses"}>Back to {location.state?.from?.startsWith("/lessons/") ? "lesson" : "course"}</Link></div></section></div>;
  const question = test.questions[index];
  const correct = feedback?.correctAnswer;
  return <div className="content test-page">
    <div className="test-progress"><Progress value={index + 1} max={test.questions.length} /><p>Question {index + 1} of {test.questions.length}</p></div>
    <section className="question-screen">
      <RichText>{question.text}</RichText>
      {question.image?.url && <img className="question-image" src={imageUrl(question.image.url, 400)} alt={question.image.alt} />}
      {question.type === "mcq" ? <fieldset className="answer-options"><legend>Choose an answer</legend>{question.options.map((option) => <button className={`answer-option ${chosen === option._id ? "selected" : ""} ${feedback && correct?._id === option._id ? "correct" : ""} ${feedback && chosen === option._id && !feedback.isCorrect ? "wrong" : ""}`} type="button" disabled={Boolean(feedback)} key={option._id} onClick={() => selectAnswer(option._id)}><RichText>{option.text}</RichText>{option.image?.url && <img src={imageUrl(option.image.url, 400)} alt={option.image.alt} />}</button>)}</fieldset> : <div className="true-false-options"><button className={chosen === "true" ? "selected" : ""} type="button" disabled={Boolean(feedback)} onClick={() => selectAnswer("true")}>True</button><button className={chosen === "false" ? "selected" : ""} type="button" disabled={Boolean(feedback)} onClick={() => selectAnswer("false")}>False</button></div>}
      {feedback && <section className={`feedback-panel ${feedback.isCorrect ? "correct" : "wrong"}`} aria-live="polite"><h2 tabIndex="-1" ref={feedbackHeading}>{feedback.isCorrect ? "Correct" : "Not quite"}</h2><p><strong>Correct answer:</strong> {typeof correct === "object" ? <RichText>{correct.text}</RichText> : correct}</p><RichText>{feedback.explanation}</RichText>{feedback.explanationImage?.url && <img src={imageUrl(feedback.explanationImage.url, 800)} alt={feedback.explanationImage.alt} />}</section>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!feedback ? <button className="button button-primary" type="button" disabled={chosen === null} onClick={checkAnswer}>Check answer</button> : <button className="button button-primary" type="button" onClick={continueQuestion}>{index === test.questions.length - 1 ? "Finish test" : "Continue"}</button>}
    </section>
    <ConfirmDialog open={blocking} title="Leave this test?" description="Your answers will not be saved." confirmLabel="Leave" cancelLabel="Stay" onConfirm={leave} onCancel={() => { setBlocking(false); blocker.reset?.(); }} />
  </div>;
}

function Progress({ value, max }) {
  return <div className="test-progress-line" role="progressbar" aria-valuemin="0" aria-valuemax={max} aria-valuenow={value} style={{ "--progress": `${(value / max) * 100}%` }} />;
}
