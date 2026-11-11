import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import { api } from "../api/client";
import { rememberCourse } from "../utils/courseCache";
import { ErrorState, Loading } from "./Courses";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

function TestRow({ test, from }) {
  return <Link className="student-test-row" to={`/tests/${test._id}`} state={{ from }}>
    <span><strong>{test.title}</strong><span className="muted">{test.bestScore === null ? "Not taken yet" : `Best score: ${test.bestScore}%`}</span></span><span aria-hidden="true">Open</span>
  </Link>;
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
  // The first lesson not yet completed is the one to continue with.
  const nextLesson = course.units.flatMap((unit) => unit.lessons).find((lesson) => !lesson.completed);
  return <div className="content student-outline">
    <Link className="back-link" to="/courses">Back to courses</Link>
    <div className="outline-columns">
      <aside className="outline-summary sticky-summary">
        <p>{course.code}</p><h1>{course.title}</h1><p className="muted">{completed} of {total} lessons complete</p><ProgressBar value={percent} label="Course progress" />
        {nextLesson && <Link className="button button-primary outline-continue" to={`/lessons/${nextLesson._id}`} state={{ from }}>{completed === 0 ? "Start" : "Continue"}: {nextLesson.title}</Link>}
      </aside>
      <main className="outline-main">
        <h2 className="sr-only">Lessons</h2>
        {course.units.map((unit) => <section className="outline-unit" key={unit._id}>
          <div className="unit-title-row"><h3>{unit.title}</h3><span className="muted unit-progress">{unit.lessons.filter((lesson) => lesson.completed).length} of {unit.lessons.length} done</span></div>
          <div className="student-lesson-list">
            {unit.lessons.map((lesson) => {
              const isNext = nextLesson && lesson._id === nextLesson._id;
              return <Link className={`student-lesson-row ${isNext ? "student-lesson-row--next" : ""}`} to={`/lessons/${lesson._id}`} state={{ from }} key={lesson._id}>
                <span className={`lesson-marker ${lesson.completed ? "is-complete" : ""} ${isNext ? "is-next" : ""}`}>{lesson.completed ? "Completed" : isNext ? "Up next" : "Not started"}</span><span className="student-lesson-title">{lesson.title}</span>
                <span className="student-chips">{lesson.testCount > 0 && <span className="count-chip">{plural(lesson.testCount, "test")}</span>}{lesson.flashcardCount > 0 && <span className="count-chip">{plural(lesson.flashcardCount, "flashcard")}</span>}{lesson.materialCount > 0 && <span className="count-chip">{plural(lesson.materialCount, "material")}</span>}{lesson.hasVideo && <span className="count-chip">Video</span>}</span>
                {lesson.completed && lesson.testCount > 0 && lesson.score != null && <strong>{lesson.score}%</strong>}
              </Link>;
            })}
          </div>{unit.tests?.length > 0 && <div className="student-test-group"><h4>Unit tests</h4>{unit.tests.map((test) => <TestRow key={test._id} test={test} from={from} />)}</div>}
        </section>)}
        {course.tests?.length > 0 && <section className="student-test-group course-tests"><h3>Course tests</h3>{course.tests.map((test) => <TestRow key={test._id} test={test} from={from} />)}</section>}
      </main>
    </div>
  </div>;
}
