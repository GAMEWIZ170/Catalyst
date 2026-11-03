import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProgressBar from "../components/ProgressBar";
import { api } from "../api/client";
import { ErrorState, Loading } from "./Courses";

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
    api.getCourse(id).then(({ data }) => setCourse(data)).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);
  if (error) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!course) return <Loading />;

  const total = course.progress?.totalLessons || 0;
  const completed = course.progress?.completedLessons || 0;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const from = `/courses/${id}`;
  return <div className="content student-outline">
    <Link className="back-link" to="/courses">Back to courses</Link>
    <div className="outline-columns">
      <aside className="outline-summary sticky-summary"><p>{course.code}</p><h1>{course.title}</h1><p className="muted">{completed} of {total} lessons complete</p><ProgressBar value={percent} label="Course progress" /></aside>
      <main className="outline-main">
        <h2>{course.title}</h2>
        {course.units.map((unit) => <section className="outline-unit" key={unit._id}><h3>{unit.title}</h3><div className="student-lesson-list">
          {unit.lessons.map((lesson) => <Link className="student-lesson-row" to={`/lessons/${lesson._id}`} state={{ from }} key={lesson._id}>
            <span className={`lesson-marker ${lesson.completed ? "is-complete" : ""}`}>{lesson.completed ? "Completed" : "Not started"}</span><span className="student-lesson-title">{lesson.title}</span>
            <span className="student-chips">{lesson.testCount > 0 && <span className="count-chip">Tests {lesson.testCount}</span>}{lesson.flashcardCount > 0 && <span className="count-chip">Flashcards {lesson.flashcardCount}</span>}{lesson.materialCount > 0 && <span className="count-chip">Materials {lesson.materialCount}</span>}{lesson.hasVideo && <span className="count-chip">Video</span>}</span>
            {lesson.completed && <strong>{lesson.score}%</strong>}
          </Link>)}
        </div>{unit.tests?.length > 0 && <div className="student-test-group"><h4>Unit tests</h4>{unit.tests.map((test) => <TestRow key={test._id} test={test} from={from} />)}</div>}</section>)}
        {course.tests?.length > 0 && <section className="student-test-group course-tests"><h3>Course tests</h3>{course.tests.map((test) => <TestRow key={test._id} test={test} from={from} />)}</section>}
      </main>
    </div>
  </div>;
}
