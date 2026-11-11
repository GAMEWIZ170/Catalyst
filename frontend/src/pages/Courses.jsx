import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ACCESS_ENDED } from "../api/client";
import { useAuth } from "../context/AuthContext";

const welcomeKey = "catalyst-welcome-seen";
const welcomeSeen = () => { try { return window.localStorage.getItem(welcomeKey) === "1"; } catch { return false; } };

// Shown once to a student, so the first visit explains the path through a course.
function Welcome({ onDone }) {
  return <section className="welcome" aria-labelledby="welcome-title">
    <h2 id="welcome-title">How Catalyst works</h2>
    <ol>
      <li>Pick a course and work through its lessons in order.</li>
      <li>Each lesson has an explanation, then a test or flashcards. Pass the test or finish the deck to complete it.</li>
      <li>Study on any day to keep your streak going.</li>
    </ol>
    <button className="button button-secondary" type="button" onClick={onDone}>Got it</button>
  </section>;
}

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => !welcomeSeen());

  function load() {
    setLoading(true);
    setError("");
    api.getCourses().then(({ data }) => setCourses(data || []))
      .catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function dismissWelcome() {
    setShowWelcome(false);
    try { window.localStorage.setItem(welcomeKey, "1"); } catch { /* it will show again next visit */ }
  }

  return <div className="content student-page">
    <header className="student-page-header"><h1>Courses</h1></header>
    {user && user.role === "student" && user.hasAccess === false && <p className="notice" role="status">Your access has ended. You can still look around, but lessons, tests and flashcards are locked until your subscription is renewed.</p>}
    {user && user.role === "student" && showWelcome && <Welcome onDone={dismissWelcome} />}
    {loading && <Loading />}
    {error && <ErrorState message={error} onRetry={load} />}
    {!loading && !error && !courses.length && <div className="empty-state"><h2>No courses yet. Check back soon.</h2></div>}
    {!loading && !error && <div className="course-list" aria-label="Courses">{courses.map((course) => <Link className="course-list-row" to={`/courses/${course._id}`} key={course._id}>
      <span className="course-list-code">{course.code}</span><span className="course-list-copy"><strong>{course.title}</strong><span className="muted">{course.description}</span></span><span aria-hidden="true">View</span>
    </Link>)}</div>}
  </div>;
}

export function Loading() { return <div className="screen-center inline"><span className="spinner" /><span>Loading...</span></div>; }
export function ErrorState({ message, onRetry }) {
  // A student whose subscription has ended gets a clear explanation instead of a retry button.
  if (String(message).startsWith(ACCESS_ENDED)) {
    return <div className="error-state"><strong>Your access has ended</strong><p>{message}</p><Link className="button button-secondary" to="/courses">Back to courses</Link></div>;
  }
  return <div className="error-state"><strong>We couldn’t load this.</strong><p>{message}</p>{onRetry && <button className="button button-secondary" type="button" onClick={onRetry}>Retry</button>}</div>;
}
