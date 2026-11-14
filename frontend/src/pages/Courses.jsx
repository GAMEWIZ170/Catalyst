import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ACCESS_ENDED } from "../api/client";
import { nearToPrefetch, prefetchCourse, prefetchLesson } from "../api/prefetch";
import { useAuth } from "../context/AuthContext";
import { Zap } from "lucide-react";
import { Badge, Button, Card, EmptyState, Illustration, Progress, Skeleton, SkeletonGroup } from "../components/ui";

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
  // Each course arrives with its progress and the next lesson to open ({ lessonId, label, title }).
  const [courses, setCourses] = useState([]);
  const streak = user?.streak ?? null;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => !welcomeSeen());

  function load() {
    setLoading(true);
    setError("");
    api.getHome().then(({ data }) => setCourses(data || []))
      .catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function dismissWelcome() {
    setShowWelcome(false);
    try { window.localStorage.setItem(welcomeKey, "1"); } catch { /* it will show again next visit */ }
  }

  const isStudent = user && user.role === "student";
  const firstName = (user?.name || "").trim().split(/\s+/)[0];
  // Prefer a course that is started but not finished, then any course with lessons left.
  const open = courses.filter((course) => course.next);
  const resume = open.find((course) => course.progress?.completedLessons > 0) || open[0];
  const next = resume ? resume.next : null;
  const percent = (course) => (course?.progress?.totalLessons ? Math.round((course.progress.completedLessons / course.progress.totalLessons) * 100) : 0);

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
      <h2 id="continue-title">{resume.progress?.completedLessons > 0 ? "Continue where you left off" : "Start your first lesson"}</h2>
      <p className="home-continue-copy"><strong>{resume.code}</strong> · Lesson {next.label}: {next.title}</p>
      <Progress value={percent(resume)} label={`${resume.code} progress`} showLabel />
      <div className="button-row button-row--stack"><Button as={Link} variant="primary" to={`/lessons/${next.lessonId}`} state={{ from: `/courses/${resume._id}` }} {...nearToPrefetch(() => prefetchLesson(next.lessonId))}>Resume: Lesson {next.label}</Button></div>
    </Card>}
    {!loading && !error && !courses.length && <EmptyState illustration={<Illustration name="empty" />} title="No courses yet" description="Check back soon." />}
    {!loading && !error && courses.length > 0 && <section aria-labelledby="courses-title">
      <h2 id="courses-title">Your courses</h2>
      <div className="home-courses">
        {courses.map((course) => <Card as={Link} className="home-course" to={`/courses/${course._id}`} key={course._id} {...nearToPrefetch(() => prefetchCourse(course._id))}>
          <span className="home-course-code">{course.code}</span>
          <strong className="home-course-title">{course.title}</strong>
          {course.description && <span className="muted home-course-desc">{course.description}</span>}
          {course.progress && <Progress value={percent(course)} label={`${course.code} progress`} />}
        </Card>)}
      </div>
      {courses.length <= 1 && <p className="muted home-soon">More subjects coming soon.</p>}
    </section>}
  </div>;
}

// Placeholder shapes in the page's own column, so the layout does not jump when content arrives.
export function Loading() {
  return <div className="content">
    <SkeletonGroup label="Loading">
      <Skeleton variant="title" />
      <Skeleton />
      <Skeleton width="70%" />
      <Skeleton variant="block" />
      <Skeleton variant="block" />
    </SkeletonGroup>
  </div>;
}
export function ErrorState({ message, onRetry }) {
  // A student whose subscription has ended gets a clear explanation instead of a retry button.
  if (String(message).startsWith(ACCESS_ENDED)) {
    return <div className="error-state"><strong>Your access has ended</strong><p>{message}</p><Link className="button button-secondary" to="/courses">Back to courses</Link></div>;
  }
  return <div className="error-state"><strong>We couldn’t load this.</strong><p>{message}</p>{onRetry && <button className="button button-secondary" type="button" onClick={onRetry}>Retry</button>}</div>;
}
