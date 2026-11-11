import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../api/client";
import DeckSummary from "../components/DeckSummary";
import RichText from "../components/RichText";
import { imageUrl } from "../utils/cloudinary";
import { recallCourse } from "../utils/courseCache";
import { ErrorState } from "./Courses";

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Shown while the lesson loads, so the page has its shape before the text arrives.
function LessonSkeleton() {
  return <div className="content lesson-hub" aria-busy="true">
    <span className="sr-only" role="status">Loading lesson</span>
    <div className="reading-column" aria-hidden="true">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line skeleton-line--short" />
    </div>
  </div>;
}

export default function Lesson() {
  const { id } = useParams();
  const location = useLocation();
  const [lesson, setLesson] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [progress, setProgress] = useState([]);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");
  const [doneMessage, setDoneMessage] = useState("");

  const from = location.state?.from || "/courses";
  const courseId = /^\/courses\/([^/]+)$/.exec(from)?.[1];

  function load() {
    setError("");
    Promise.all([api.getLesson(id), api.getProgress()]).then(([lessonResponse, progressResponse]) => {
      setLesson(lessonResponse.data);
      setProgress(progressResponse.data || []);
      if (lessonResponse.data.materialCount > 0) return api.getLessonMaterials(id);
      return { data: [] };
    }).then((materialsResponse) => setMaterials(materialsResponse.data || []))
      .catch((err) => setError(err.status === 404 ? "This lesson is not available" : err.message));
  }

  useEffect(() => {
    setLesson(null);
    setDoneMessage("");
    load();
  }, [id]);

  // The course outline gives the lesson its place and the next lesson. It never blocks the page.
  // The outline's copy shows at once; a fresh one replaces it when it arrives.
  useEffect(() => {
    setCourse(courseId ? recallCourse(courseId) : null);
    if (!courseId) return undefined;
    let current = true;
    api.getCourse(courseId).then(({ data }) => { if (current) setCourse(data); }).catch(() => {});
    return () => { current = false; };
  }, [courseId]);

  async function markDone() {
    try {
      await api.markLessonDone(id);
      setDoneMessage("Completed");
      window.dispatchEvent(new Event("catalyst:refresh-streak"));
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!lesson) return <LessonSkeleton />;

  const completed = progress.some((item) => String(item.lesson) === String(id) && item.completed);
  const canMarkDone = lesson.tests.length === 0 && lesson.flashcards.total === 0;
  const allLessons = course ? course.units.flatMap((unit) => unit.lessons.map((item) => ({ ...item, unitTitle: unit.title }))) : [];
  const position = allLessons.findIndex((item) => String(item._id) === String(id));
  const nextLesson = position >= 0 ? allLessons[position + 1] : null;
  // One main action at a time: the test, else the flashcards, else Mark as done. Once complete, the next lesson.
  const nextStep = completed ? null : lesson.tests.length > 0 ? "test" : lesson.flashcards.total > 0 ? "deck" : canMarkDone ? "done" : null;
  const mainTest = lesson.tests.find((test) => test.bestScore === null) || lesson.tests[0];
  const state = { from: `/lessons/${id}`, courseFrom: from };
  return <div className="content lesson-hub">
    <Link className="back-link" to={from}>Back to course</Link>
    <article className="reading-column">
      <h1>{lesson.title}</h1>
      <p className={`lesson-meta ${courseId && !course ? "lesson-meta--pending" : ""}`}>
        {position >= 0 && <span>{allLessons[position].unitTitle} · Lesson {position + 1} of {allLessons.length}</span>}
        {completed && <span className="completion-badge">Completed</span>}
      </p>
      <div className="lesson-explanation"><RichText>{lesson.explanation}</RichText></div>
      {lesson.explanationImage?.url && <img className="lesson-explanation-image" src={imageUrl(lesson.explanationImage.url, 800)} alt={lesson.explanationImage.alt} loading="lazy" />}
      {lesson.videoHost === "youtube" && lesson.videoId && <div className="video-frame"><iframe title={`${lesson.title} video`} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(lesson.videoId)}`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" /></div>}
    </article>
    {lesson.tests.length > 0 && <section className="lesson-section"><h2>Practice</h2><div className="student-test-list">{lesson.tests.map((test) => <Link className="student-test-row" to={`/tests/${test._id}`} state={state} key={test._id}><span><strong>{test.title}</strong><span className="muted">{test.questionCount} questions · {test.passPercent != null ? `Pass at ${test.passPercent}% · ` : ""}{test.bestScore === null ? "Not taken yet" : `Best score: ${test.bestScore}%`}</span></span><span className={`row-action ${nextStep === "test" && test._id === mainTest._id ? "row-action--primary" : ""}`}>{test.bestScore === null ? "Start" : "Retake"}</span></Link>)}</div></section>}
    {lesson.flashcards.total > 0 && <section className="lesson-section"><h2>Flashcards</h2><DeckSummary summary={lesson.flashcards} /><div className="lesson-links"><Link className={`button ${nextStep === "deck" ? "button-primary" : "button-secondary"}`} to={`/lessons/${id}/flashcards`} state={{ courseFrom: from }}>Study all cards</Link>{lesson.flashcards.unsure + lesson.flashcards.unknown + lesson.flashcards.unrated > 0 && <Link className="button button-secondary" to={`/lessons/${id}/flashcards?filter=review`} state={{ courseFrom: from }}>Review cards I'm not sure about</Link>}</div></section>}
    {lesson.materialCount > 0 && <section className="lesson-section"><h2>Materials</h2><div className="material-list">{materials.map((material) => <div className="material-row" key={material._id}><span aria-hidden="true">{material.kind === "file" ? "PDF" : "Link"}</span><span><strong>{material.title}</strong><span className="muted">{material.description}{material.bytes ? ` · ${formatBytes(material.bytes)}` : ""}</span></span><a href={material.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${material.title}${material.kind === "file" ? " (PDF)" : ""}`}>Open</a></div>)}</div></section>}
    {canMarkDone && <section className="lesson-complete"><button className="button button-primary" type="button" onClick={markDone} disabled={completed}>{doneMessage || (completed ? "Completed" : "Mark as done")}</button><div aria-live="polite">{doneMessage}</div></section>}
    {nextLesson && <section className="lesson-next"><Link className={`button ${nextStep ? "button-secondary" : "button-primary"}`} to={`/lessons/${nextLesson._id}`} state={{ from }}>Next lesson: {nextLesson.title}</Link></section>}
  </div>;
}
