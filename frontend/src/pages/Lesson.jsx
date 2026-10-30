import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import QuestionCard from "../components/QuestionCard";
import { ErrorState, Loading } from "./Courses";

export default function Lesson() {
  const { id } = useParams();
  const [lesson, setLesson] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { api.getLesson(id).then((response) => setLesson(response.data)).catch((err) => setError(err.message)); }, [id]);
  if (error) return <div className="content"><ErrorState message={error} /></div>;
  if (!lesson) return <Loading />;

  async function completeLesson() {
    setSubmitting(true);
    try {
      const response = await api.completeLesson(id, lesson.questions.filter((q) => q.type !== "flashcard").map((q) => ({
        questionId: q._id, answer: answers[q._id] || ""
      })));
      setResult(response.data);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  }

  return <div className="content lesson-content"><Link className="back-link" to="/courses">← Back to courses</Link>
    <div className="lesson-header"><div className="eyebrow">LESSON {lesson.order}</div><h1>{lesson.title}</h1><p>{lesson.explanation}</p>
      {lesson.videoId && <a className="video-link" href={`https://${lesson.videoHost || "www.youtube.com"}/watch?v=${lesson.videoId}`} target="_blank" rel="noreferrer">▶ Watch lesson video</a>}</div>
    <div className="question-stack">{lesson.questions.map((question, index) => <QuestionCard key={question._id} question={question} index={index} onAnswered={(questionId, answer) => setAnswers((current) => ({ ...current, [questionId]: answer }))} />)}</div>
    {lesson.questions.some((q) => q.type !== "flashcard") && <section className="complete-panel"><div><h2>Ready to submit?</h2><p>Your answers will be graded and your best score will be saved.</p></div><button className="button button-primary" onClick={completeLesson} disabled={submitting}>{submitting ? "Submitting..." : "Complete lesson"}</button></section>}
    {result && <div className="result-banner"><div className="result-score">{result.score}<small>%</small></div><div><div className="eyebrow">LESSON COMPLETE</div><h2>Nice work.</h2><p>You got {result.correct} out of {result.total} graded questions correct. Best score: {result.bestScore}%.</p></div></div>}
  </div>;
}
