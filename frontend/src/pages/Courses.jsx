import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCourses().then((response) => setCourses(response.data))
      .catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  return <div className="content">
    <section className="welcome-panel">
      <div><div className="eyebrow">YOUR LEARNING SPACE</div><h1>Good to see you, {user?.name?.split(" ")[0]}.</h1>
      <p>Choose a course and keep your momentum going.</p></div>
      <div className="sparkle">✦</div>
    </section>
    <div className="section-heading"><div><div className="eyebrow">EXPLORE</div><h2>Published courses</h2></div>
      <span className="course-count">{courses.length} {courses.length === 1 ? "course" : "courses"}</span></div>
    {loading && <Loading />}
    {error && <ErrorState message={error} />}
    {!loading && !error && courses.length === 0 && <div className="empty-state"><h3>No courses yet</h3><p>Published courses will appear here.</p></div>}
    <div className="course-grid">{courses.map((course) => <Link className="course-card" to={`/courses/${course._id}`} key={course._id}>
      <div className="course-icon">{course.code?.slice(0, 2)}</div><div className="course-code">{course.code}</div>
      <h3>{course.title}</h3><p>{course.description}</p><span className="card-link">View course <span>→</span></span>
    </Link>)}</div>
  </div>;
}

export function Loading() { return <div className="screen-center inline"><span className="spinner" /><span>Loading...</span></div>; }
export function ErrorState({ message }) { return <div className="error-state"><strong>We couldn’t load this.</strong><p>{message}</p></div>; }
