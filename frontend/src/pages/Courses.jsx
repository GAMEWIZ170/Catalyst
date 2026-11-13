import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ACCESS_ENDED } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Zap } from "lucide-react";
import { Badge, Button, Card, EmptyState, Progress } from "../components/ui";

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

// First lesson not yet completed in a course tree, with its "unit.lesson" number.
export function findNextLesson(course) {
  for (let u = 0; u < (course.units || []).length; u++) {
    const lessons = course.units[u].lessons || [];
    for (let l = 0; l < lessons.length; l++) {
      if (!lessons[l].completed) return { lesson: lessons[l], label: `${u + 1}.${l + 1}` };
    }
  }
  return null;
}

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [trees, setTrees] = useState({});
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => !welcomeSeen());

  function load() {
    setLoading(true);
    setError("");
    api.getCourses().then(({ data }) => {
      const list = data || [];
      setCourses(list);
      // Progress and the next lesson come from each course tree. A failed tree only hides that course's progress.
      return Promise.all(list.map((course) => api.getCourse(course._id).then((response) => [course._id, response.data]).catch(() => null)))
        .then((pairs) => setTrees(Object.fromEntries(pairs.filter(Boolean))));
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
    api.getStreak().then(({ data }) => setStreak(data.streak)).catch(() => setStreak(null));
  }

  useEffect(load, []);

  function dismissWelcome() {
    setShowWelcome(false);
    try { window.localStorage.setItem(welcomeKey, "1"); } catch { /* it will show again next visit */ }
  }

  const isStudent = user && user.role === "student";
  const firstName = (user?.name || "").trim().split(/\s+/)[0];
  // Prefer a course that is started but not finished, then any course with lessons left.
  const open = courses.map((course) => ({ course, tree: trees[course._id] })).filter(({ tree }) => tree && findNextLesson(tree));
  const resume = open.find(({ tree }) => tree.progress?.completedLessons > 0) || open[0];
  const next = resume ? findNextLesson(resume.tree) : null;
  const percent = (tree) => (tree?.progress?.totalLessons ? Math.round((tree.progress.completedLessons / tree.progress.totalLessons) * 100) : 0);

  return <div className="content student-page home-page">
    <header className="home-header">
      <h1>{firstName ? `Hello, ${firstName}` : "Courses"}</h1>
      {streak !== null && <Badge tone="accent" icon={Zap}>{streak} {streak === 1 ? "day" : "days"} streak</Badge>}
    </header>
    {isStudent && user.hasAccess === false && <p className="notice" role="status">Your access has ended. You can still look around, but lessons, tests and flashcards are locked until your subscription is renewed.</p>}
    {isStudent && showWelcome && <Welcome onDone={dismissWelcome} />}
    {loading && <Loading />}
    {error && <ErrorState message={error} onRetry={load} />}
    {!loading && !error && resume && next && <Card className="home-continue" aria-labelledby="continue-title">
      <h2 id="continue-title">{resume.tree.progress?.completedLessons > 0 ? "Continue where you left off" : "Start your first lesson"}</h2>
      <p className="home-continue-copy"><strong>{resume.course.code}</strong> · Lesson {next.label}: {next.lesson.title}</p>
      <Progress value={percent(resume.tree)} label={`${resume.course.code} progress`} showLabel />
      <div className="button-row button-row--stack"><Button as={Link} variant="primary" to={`/lessons/${next.lesson._id}`} state={{ from: `/courses/${resume.course._id}` }}>Resume: Lesson {next.label}</Button></div>
    </Card>}
    {!loading && !error && !courses.length && <EmptyState icon={BookOpen} title="No courses yet" description="Check back soon." />}
    {!loading && !error && courses.length > 0 && <section aria-labelledby="courses-title">
      <h2 id="courses-title">Your courses</h2>
      <div className="home-courses">
        {courses.map((course) => <Card as={Link} className="home-course" to={`/courses/${course._id}`} key={course._id}>
          <span className="home-course-code">{course.code}</span>
          <strong className="home-course-title">{course.title}</strong>
          {course.description && <span className="muted home-course-desc">{course.description}</span>}
          {trees[course._id] && <Progress value={percent(trees[course._id])} label={`${course.code} progress`} />}
        </Card>)}
      </div>
      {courses.length <= 1 && <p className="muted home-soon">More subjects coming soon.</p>}
    </section>}
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
