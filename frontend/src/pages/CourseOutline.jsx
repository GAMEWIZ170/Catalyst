import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Circle, PlayCircle } from "lucide-react";
import { api } from "../api/client";
import { nearToPrefetch, prefetchLesson } from "../api/prefetch";
import { Button, Card, EmptyState, Progress } from "../components/ui";
import { rememberCourse } from "../utils/courseCache";
import { ErrorState, Loading } from "./Courses";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Quiet meta line: "1 test · 20 cards · Video". Empty when the lesson has nothing extra.
function lessonMeta(lesson) {
  const parts = [];
  if (lesson.testCount > 0) parts.push(plural(lesson.testCount, "test"));
  if (lesson.flashcardCount > 0) parts.push(plural(lesson.flashcardCount, "card"));
  if (lesson.materialCount > 0) parts.push(plural(lesson.materialCount, "material"));
  if (lesson.hasVideo) parts.push("Video");
  return parts.join(" · ");
}

function StatusIcon({ done, next }) {
  if (done) return <><CheckCircle2 className="ol-status ol-status--done" size={20} aria-hidden="true" /><span className="sr-only">Completed. </span></>;
  if (next) return <><PlayCircle className="ol-status ol-status--next" size={20} aria-hidden="true" /><span className="sr-only">Up next. </span></>;
  return <><Circle className="ol-status" size={20} aria-hidden="true" /><span className="sr-only">Not started. </span></>;
}

function TestRow({ test, from }) {
  return <Link className="ol-row" to={`/tests/${test._id}`} state={{ from }}>
    <span className="ol-row-text"><span className="ol-row-title">{test.title}</span><span className="ol-row-meta">{test.bestScore === null ? "Not taken yet" : `Best score: ${test.bestScore}%`}</span></span>
    <ChevronRight className="ol-chevron" size={20} aria-hidden="true" />
  </Link>;
}

function Unit({ unit, number, nextId, from }) {
  const hasNext = unit.lessons.some((lesson) => lesson._id === nextId);
  // Phones start with only the unit being worked on open. Wider screens start open.
  const [open, setOpen] = useState(() => hasNext || window.matchMedia("(min-width: 768px)").matches);
  const done = unit.lessons.filter((lesson) => lesson.completed).length;
  const panelId = `unit-${unit._id}`;
  return <Card className="ol-unit">
    <h2 className="ol-unit-heading">
      <button type="button" className="ol-unit-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <span className="ol-unit-text"><span className="ol-unit-title">Unit {number} · {unit.title}</span><span className="ol-row-meta">{done} of {unit.lessons.length} done</span></span>
        <ChevronDown className="ol-unit-chevron" size={20} aria-hidden="true" />
      </button>
    </h2>
    <div id={panelId} className="ol-unit-body" hidden={!open}>
      <ol className="ol-list">
        {unit.lessons.map((lesson, index) => {
          const meta = lessonMeta(lesson);
          const isNext = lesson._id === nextId;
          return <li key={lesson._id}>
            <Link className={`ol-row ${isNext ? "ol-row--next" : ""}`} to={`/lessons/${lesson._id}`} state={{ from }} {...nearToPrefetch(() => prefetchLesson(lesson._id))}>
              <StatusIcon done={lesson.completed} next={isNext} />
              <span className="ol-row-text"><span className="ol-row-title"><span className="ol-num">{number}.{index + 1}</span> {lesson.title}</span>{meta && <span className="ol-row-meta">{meta}</span>}</span>
              {lesson.completed && lesson.testCount > 0 && lesson.score != null && <span className="ol-score">{lesson.score}%</span>}
              <ChevronRight className="ol-chevron" size={20} aria-hidden="true" />
            </Link>
          </li>;
        })}
      </ol>
      {unit.tests?.length > 0 && <div className="ol-tests"><h3>Unit tests</h3>{unit.tests.map((test) => <TestRow key={test._id} test={test} from={from} />)}</div>}
    </div>
  </Card>;
}

export default function CourseOutline() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    api.getCourse(id).then(({ data }) => { rememberCourse(data); setCourse(data); }).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);
  if (error) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!course) return <Loading />;

  const total = course.progress?.totalLessons || 0;
  const completed = course.progress?.completedLessons || 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const from = `/courses/${id}`;
  // The first lesson not yet completed is the one to continue with. Its number is "unit.lesson".
  let nextLesson = null;
  let nextLabel = "";
  course.units.forEach((unit, u) => unit.lessons.forEach((lesson, l) => {
    if (!nextLesson && !lesson.completed) { nextLesson = lesson; nextLabel = `${u + 1}.${l + 1}`; }
  }));
  return <div className="content student-outline">
    <Link className="back-link" to="/courses"><ArrowLeft size={16} aria-hidden="true" />Back to courses</Link>
    <header className="ol-header">
      <p className="ol-code">{course.code}</p>
      <h1>{course.title}</h1>
      <p className="muted">{completed} of {total} lessons complete</p>
      <Progress value={percent} label="Course progress" />
      {nextLesson && <div className="button-row button-row--stack">
        <Button as={Link} variant="primary" to={`/lessons/${nextLesson._id}`} state={{ from }} {...nearToPrefetch(() => prefetchLesson(nextLesson._id))}>{completed === 0 ? "Start" : "Resume"}: Lesson {nextLabel}</Button>
      </div>}
    </header>
    <div className="ol-units">
      {course.units.length === 0 && !course.tests?.length && <EmptyState title="No lessons yet" description="Lessons for this course will appear here when they are ready." action={<Button as={Link} variant="secondary" to="/courses">Back to courses</Button>} />}
      {course.units.map((unit, index) => <Unit key={unit._id} unit={unit} number={index + 1} nextId={nextLesson?._id} from={from} />)}
      {course.tests?.length > 0 && <Card className="ol-unit"><div className="ol-tests ol-tests--course"><h2>Course tests</h2>{course.tests.map((test) => <TestRow key={test._id} test={test} from={from} />)}</div></Card>}
    </div>
  </div>;
}
