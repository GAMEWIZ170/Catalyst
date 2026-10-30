import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import ProgressBar from "../components/ProgressBar";
import { ErrorState, Loading } from "./Courses";

export default function CourseOutline() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.getCourse(id).then((response) => setCourse(response.data)).catch((err) => setError(err.message)); }, [id]);
  if (error) return <div className="content"><ErrorState message={error} /></div>;
  if (!course) return <Loading />;
  const percent = course.progress.totalLessons ? Math.round((course.progress.completedLessons / course.progress.totalLessons) * 100) : 0;
  return <div className="content">
    <Link className="back-link" to="/courses">← All courses</Link>
    <section className="course-hero"><div className="course-icon large">{course.code?.slice(0, 2)}</div><div><div className="eyebrow">{course.code}</div><h1>{course.title}</h1><p>{course.description}</p></div></section>
    <div className="outline-summary"><div><strong>{course.progress.completedLessons}</strong><span> lessons complete</span></div><ProgressBar value={percent} label="Course progress" /></div>
    <div className="section-heading"><div><div className="eyebrow">COURSE CONTENT</div><h2>Your outline</h2></div></div>
    <div className="unit-list">{course.units.map((unit, unitIndex) => <section className="unit-card" key={unit._id}>
      <div className="unit-heading"><span className="unit-number">0{unitIndex + 1}</span><div><h3>{unit.title}</h3><p>{unit.lessons.length} lessons</p></div></div>
      <div className="lesson-list">{unit.lessons.map((lesson) => <Link className="lesson-row" to={`/lessons/${lesson._id}`} key={lesson._id}>
        <span className={`lesson-status ${lesson.completed ? "done" : ""}`}>{lesson.completed ? "✓" : "○"}</span><span className="lesson-title">{lesson.title}</span>
        {lesson.hasVideo && <span className="video-tag">Video</span>}<span className="lesson-score">{lesson.completed ? `${lesson.score}%` : "Start"} <span>→</span></span>
      </Link>)}</div>
    </section>)}</div>
  </div>;
}
