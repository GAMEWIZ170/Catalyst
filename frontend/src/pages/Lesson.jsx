import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, FileText, Link2, Play } from "lucide-react";
import { api } from "../api/client";
import { nearToPrefetch, prefetchLesson } from "../api/prefetch";
import DeckSummary from "../components/DeckSummary";
import RichText from "../components/RichText";
import { Badge, Button, SelectField, Skeleton, SkeletonGroup } from "../components/ui";
import ResponsiveImage from "../components/ResponsiveImage";
import { recallCourse } from "../utils/courseCache";
import { ErrorState } from "./Courses";

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Shown while the lesson loads, so the page has its shape before the text arrives.
function LessonSkeleton() {
  return <div className="content lesson-hub">
    <div className="reading-column">
      <SkeletonGroup label="Loading lesson">
        <Skeleton variant="title" />
        <Skeleton />
        <Skeleton />
        <Skeleton width="55%" />
      </SkeletonGroup>
    </div>
  </div>;
}

// A still picture and a play button. The player (about 500 KB of YouTube code) loads only after a tap.
// The still is a small 320 by 180 image from YouTube; if it cannot load, the button still works.
function LessonVideo({ title, videoId }) {
  const [playing, setPlaying] = useState(false);
  const [stillFailed, setStillFailed] = useState(false);
  return <div className="video-frame">
    {playing
      ? <iframe title={`${title} video`} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      : <button type="button" className="video-play" onClick={() => setPlaying(true)}>
        {!stillFailed && <img className="video-still" src={`https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`} alt="" width="320" height="180" loading="lazy" decoding="async" onError={() => setStillFailed(true)} />}
        <span className="video-play-mark"><Play size={20} aria-hidden="true" /></span>
        <span className="video-play-label">Play video</span>
      </button>}
  </div>;
}

export default function Lesson() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");
  const [doneMessage, setDoneMessage] = useState("");

  const from = location.state?.from || "/courses";
  const courseId = /^\/courses\/([^/]+)$/.exec(from)?.[1];

  function load() {
    setError("");
    // One call returns the lesson, whether it is finished, and its materials.
    api.getLessonHub(id).then(({ data }) => setLesson(data))
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

  const completed = lesson.completed;
  const canMarkDone = lesson.tests.length === 0 && lesson.flashcards.total === 0;
  const allLessons = course ? course.units.flatMap((unit) => unit.lessons) : [];
  const position = allLessons.findIndex((item) => String(item._id) === String(id));
  const prevLesson = position > 0 ? allLessons[position - 1] : null;
  const nextLesson = position >= 0 ? allLessons[position + 1] : null;
  const unit = course?.units.find((item) => item.lessons.some((entry) => String(entry._id) === String(id)));
  const unitPosition = unit ? unit.lessons.findIndex((entry) => String(entry._id) === String(id)) : -1;
  // One main action at a time: the test, else the flashcards, else Mark as done. Once complete, the next lesson.
  const nextStep = completed ? null : lesson.tests.length > 0 ? "test" : lesson.flashcards.total > 0 ? "deck" : canMarkDone ? "done" : null;
  const mainTest = lesson.tests.find((test) => test.bestScore === null) || lesson.tests[0];
  const state = { from: `/lessons/${id}`, courseFrom: from };
  const goTo = (lessonId) => navigate(`/lessons/${lessonId}`, { state: { from } });
  const primaryLabel = { test: "Take the test", deck: "Practise flashcards", done: doneMessage || "Mark as done" }[nextStep];

  return <div className="content lesson-hub">
    <Link className="back-link" to={from}><ArrowLeft size={16} aria-hidden="true" />Back to course</Link>
    <div className={`lesson-layout ${unit ? "has-sidebar" : ""}`}>
      {unit && <aside className="lesson-side">
        <div className="lesson-picker">
          <SelectField label={`${unit.title}: lesson ${unitPosition + 1} of ${unit.lessons.length}`} value={String(id)} onChange={(event) => goTo(event.target.value)}>
            {unit.lessons.map((entry, index) => <option key={entry._id} value={entry._id}>{index + 1}. {entry.title}{entry.completed ? " (done)" : ""}</option>)}
          </SelectField>
        </div>
        <nav className="lesson-nav" aria-label={`Lessons in ${unit.title}`}>
          <p className="lesson-nav-title">{unit.title}</p>
          <ol>
            {unit.lessons.map((entry) => {
              const current = String(entry._id) === String(id);
              const done = entry.completed || (current && completed);
              return <li key={entry._id}>
                <Link to={`/lessons/${entry._id}`} state={{ from }} aria-current={current ? "page" : undefined} className={current ? "is-current" : ""} {...nearToPrefetch(() => prefetchLesson(entry._id))}>
                  {done ? <CheckCircle2 size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
                  <span>{entry.title}</span>
                  {done && <span className="sr-only">(done)</span>}
                </Link>
              </li>;
            })}
          </ol>
        </nav>
      </aside>}
      <div className="lesson-main">
        <article className="reading-column">
          <h1>{lesson.title}</h1>
          {(unit || completed) && <p className="lesson-meta">
            {unit && <span>{unit.title}</span>}
            {completed && <Badge tone="success" icon={CheckCircle2}>Completed</Badge>}
          </p>}
          <div className="lesson-explanation"><RichText>{lesson.explanation}</RichText></div>
          {lesson.explanationImage?.url && <figure className="lesson-figure">
            <ResponsiveImage image={lesson.explanationImage} loading="lazy" />
            {lesson.explanationImage.alt && <figcaption>{lesson.explanationImage.alt}</figcaption>}
          </figure>}
          {lesson.videoHost === "youtube" && lesson.videoId && <LessonVideo title={lesson.title} videoId={lesson.videoId} />}
        </article>
        {lesson.tests.length > 0 && <section className="lesson-section"><h2>Practice</h2><div className="student-test-list">{lesson.tests.map((test) => <Link className="student-test-row" to={`/tests/${test._id}`} state={state} key={test._id}><span><strong>{test.title}</strong><span className="muted">{test.questionCount} questions · {test.passPercent != null ? `Pass at ${test.passPercent}% · ` : ""}{test.bestScore === null ? "Not taken yet" : `Best score: ${test.bestScore}%`}</span></span><span className="row-action">{test.bestScore === null ? "Start" : "Retake"}</span></Link>)}</div></section>}
        {lesson.flashcards.total > 0 && <section className="lesson-section"><h2>Flashcards</h2><DeckSummary summary={lesson.flashcards} /><div className="button-row button-row--stack"><Button as={Link} variant={nextStep === "deck" ? "primary" : "secondary"} to={`/lessons/${id}/flashcards`} state={{ courseFrom: from }}>Study all cards</Button>{lesson.flashcards.unsure + lesson.flashcards.unknown + lesson.flashcards.unrated > 0 && <Button as={Link} variant="secondary" to={`/lessons/${id}/flashcards?filter=review`} state={{ courseFrom: from }}>Review cards I'm not sure about</Button>}</div></section>}
        {lesson.materialCount > 0 && <section className="lesson-section"><h2>Materials</h2><div className="material-list">{(lesson.materials || []).map((material) => <div className="material-row" key={material._id}>{material.kind === "file" ? <FileText size={20} aria-hidden="true" /> : <Link2 size={20} aria-hidden="true" />}<span><strong>{material.title}</strong><span className="muted">{material.description}{material.bytes ? ` · ${formatBytes(material.bytes)}` : ""}</span></span><a href={material.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${material.title}${material.kind === "file" ? " (PDF)" : ""}`}>Open<ExternalLink size={16} aria-hidden="true" /></a></div>)}</div></section>}
        <section className="lesson-end" aria-label="Next steps">
          {nextStep === "test" && <Button as={Link} to={`/tests/${mainTest._id}`} state={state}>{primaryLabel}</Button>}
          {nextStep === "deck" && <Button as={Link} to={`/lessons/${id}/flashcards`} state={{ courseFrom: from }}>{primaryLabel}</Button>}
          {nextStep === "done" && <Button onClick={markDone} disabled={completed}>{primaryLabel}</Button>}
          <div className="sr-only" aria-live="polite">{doneMessage}</div>
          {(prevLesson || nextLesson) && <div className="lesson-pager">
            {prevLesson ? <Button as={Link} variant="secondary" icon={ArrowLeft} to={`/lessons/${prevLesson._id}`} state={{ from }} {...nearToPrefetch(() => prefetchLesson(prevLesson._id))}>Previous lesson</Button> : <span />}
            {nextLesson && <Button as={Link} variant={nextStep ? "secondary" : "primary"} to={`/lessons/${nextLesson._id}`} state={{ from }} {...nearToPrefetch(() => prefetchLesson(nextLesson._id))}>Next lesson</Button>}
          </div>}
        </section>
      </div>
    </div>
  </div>;
}
