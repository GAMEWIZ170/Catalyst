import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ChevronDown, ChevronRight, Circle, PlayCircle } from "lucide-react";
import { api } from "../../api/client";
import { nearToPrefetch, prefetchLesson } from "../../api/prefetch";
import MistakesPanel from "../../components/learn/MistakesPanel";
import { Button, EmptyState, Progress } from "../../components/ui";
import { rememberCourse } from "../../utils/courseCache";
import { ErrorState, Loading } from "./Courses";
import CourseByline from "../../components/learn/CourseByline";
import { cn } from "@/lib/utils";

const MASTERY = ["Not started", "Attempted", "Familiar", "Proficient", "Mastered"];
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const row = "flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-foreground no-underline transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const panel = "grid gap-1 rounded-lg border border-border bg-card p-2";

// Quiet meta line: "1 test · 20 cards · Video". Empty when the lesson has nothing extra.
function lessonMeta(lesson) {
  const parts = [];
  if (lesson.testCount > 0) parts.push(plural(lesson.testCount, "test"));
  if (lesson.flashcardCount > 0) parts.push(plural(lesson.flashcardCount, "card"));
  if (lesson.materialCount > 0) parts.push(plural(lesson.materialCount, "material"));
  if (lesson.hasVideo) parts.push("Video");
  if (lesson.mastery > 0) parts.push(MASTERY[lesson.mastery]);
  return parts.join(" · ");
}

// The state is an icon plus hidden words, never colour alone. Gold marks the lesson to do next.
function StatusIcon({ done, next }) {
  if (done) return <><CheckCircle2 className="shrink-0 text-success" size={20} aria-hidden="true" /><span className="sr-only">Completed. </span></>;
  if (next) return <><PlayCircle className="shrink-0 text-brand-ink" size={20} aria-hidden="true" /><span className="sr-only">Up next. </span></>;
  return <><Circle className="shrink-0 text-muted-foreground" size={20} aria-hidden="true" /><span className="sr-only">Not started. </span></>;
}

function TestRow({ test, from }) {
  return <Link className={row} to={`/tests/${test._id}`} state={{ from }}>
    <span className="grid min-w-0 flex-1 gap-0.5"><span className="font-semibold">{test.title}</span><span className="text-sm text-muted-foreground">{test.bestScore === null ? "Not taken yet" : `Best score: ${test.bestScore}%`}</span></span>
    <ChevronRight className="shrink-0 text-muted-foreground" size={20} aria-hidden="true" />
  </Link>;
}

function Unit({ unit, number, nextId, from }) {
  const hasNext = unit.lessons.some((lesson) => lesson._id === nextId);
  // Phones start with only the unit being worked on open. Wider screens start open.
  const [open, setOpen] = useState(() => hasNext || window.matchMedia("(min-width: 768px)").matches);
  const done = unit.lessons.filter((lesson) => lesson.completed).length;
  const panelId = `unit-${unit._id}`;
  return <section className={panel}>
    <h2 className="m-0">
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-3 py-2 text-left font-sans text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <span className="grid min-w-0 flex-1 gap-0.5"><span className="text-lg font-semibold">Unit {number} · {unit.title}</span><span className="text-sm font-normal text-muted-foreground">{done} of {unit.lessons.length} done</span></span>
        <ChevronDown className={cn("shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none", open && "rotate-180")} size={20} aria-hidden="true" />
      </button>
    </h2>
    <div id={panelId} hidden={!open} className="grid gap-1">
      <ol className="m-0 grid list-none gap-0.5 p-0">
        {unit.lessons.map((lesson, index) => {
          const meta = lessonMeta(lesson);
          const isNext = lesson._id === nextId;
          return <li key={lesson._id}>
            <Link className={cn(row, isNext && "bg-primary/20")} to={`/lessons/${lesson._id}`} state={{ from }} {...nearToPrefetch(() => prefetchLesson(lesson._id))}>
              <StatusIcon done={lesson.completed} next={isNext} />
              <span className="grid min-w-0 flex-1 gap-0.5"><span className="font-semibold"><span className="text-muted-foreground tabular-nums">{number}.{index + 1}</span> {lesson.title}</span>{meta && <span className="text-sm text-muted-foreground">{meta}</span>}</span>
              {lesson.completed && lesson.testCount > 0 && lesson.score != null && <span className="shrink-0 text-sm font-semibold tabular-nums">{lesson.score}%</span>}
              <ChevronRight className="shrink-0 text-muted-foreground" size={20} aria-hidden="true" />
            </Link>
          </li>;
        })}
      </ol>
      {unit.tests?.length > 0 && <div className="grid gap-0.5 border-t border-border pt-2"><h3 className="m-0 px-3 text-sm font-semibold text-muted-foreground">Unit tests</h3>{unit.tests.map((test) => <TestRow key={test._id} test={test} from={from} />)}</div>}
    </div>
  </section>;
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
  if (error) return <div className="mx-auto max-w-4xl"><ErrorState message={error} onRetry={load} /></div>;
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
  return <div className="mx-auto grid max-w-3xl gap-5">
    <div><Button as={Link} to="/courses" variant="tertiary" size="sm" icon={ArrowLeft}>Back to courses</Button></div>
    <header className="grid gap-2">
      <p className="m-0 text-sm font-semibold text-brand-ink">{course.code}</p>
      <h1 className="m-0 text-3xl leading-tight font-bold">{course.title}</h1>
      <CourseByline course={course} className="ol-byline" />
      {course.authors?.some((author) => author.bio) && <ul className="m-0 grid list-none gap-1 p-0 text-sm text-muted-foreground">{course.authors.filter((author) => author.bio).map((author, index) => <li key={`${author.displayName}-${index}`}><strong className="text-foreground">{author.displayName}</strong>: {author.bio}</li>)}</ul>}
      <p className="m-0 text-muted-foreground">{completed} of {total} lessons complete</p>
      <Progress value={percent} label="Course progress" />
      {nextLesson && <div className="pt-1">
        <Button as={Link} variant="primary" to={`/lessons/${nextLesson._id}`} state={{ from }} {...nearToPrefetch(() => prefetchLesson(nextLesson._id))}>{completed === 0 ? "Start" : "Resume"}: Lesson {nextLabel}</Button>
      </div>}
    </header>
    <MistakesPanel courseId={id} from={from} />
    <div className="grid gap-3">
      {course.units.length === 0 && !course.tests?.length && <EmptyState title="No lessons yet" description="Lessons for this course will appear here when they are ready." action={<Button as={Link} variant="secondary" to="/courses">Back to courses</Button>} />}
      {course.units.map((unit, index) => <Unit key={unit._id} unit={unit} number={index + 1} nextId={nextLesson?._id} from={from} />)}
      {course.tests?.length > 0 && <section className={panel}><h2 className="m-0 px-3 pt-2 text-lg font-semibold">Course tests</h2>{course.tests.map((test) => <TestRow key={test._id} test={test} from={from} />)}</section>}
    </div>
  </div>;
}
