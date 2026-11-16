import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ACCESS_ENDED } from "../../api/client";
import { nearToPrefetch, prefetchCourse, prefetchLesson } from "../../api/prefetch";
import { useAuth } from "../../context/AuthContext";
import DueChip from "../../components/learn/DueChip";
import TodayPlan from "../../components/learn/TodayPlan";
import ExamCountdown from "../../components/learn/ExamCountdown";
import TopicsLink from "../../components/learn/TopicsLink";
import MistakesPanel from "../../components/learn/MistakesPanel";
import CourseByline from "../../components/learn/CourseByline";
import { Button, Card, EmptyState, Illustration, Progress, Skeleton, SkeletonGroup } from "../../components/ui";

const welcomeKey = "catalyst-welcome-seen";
const welcomeSeen = () => { try { return window.localStorage.getItem(welcomeKey) === "1"; } catch { return false; } };

// Shown once to a student, so the first visit explains the path through a course.
const HOME_COURSES = 6;

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
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => !welcomeSeen());

  function load() {
    setLoading(true);
    setError("");
    api.getHome().then(({ data, goal: today, weekly: week }) => { setCourses(data || []); setGoal(today || null); setWeekly(week || null); })
      .catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function dismissWelcome() {
    setShowWelcome(false);
    try { window.localStorage.setItem(welcomeKey, "1"); } catch { /* it will show again next visit */ }
  }

  const isStudent = user && user.role === "student";
  // A brand-new student sees the three welcome steps first.
  if (isStudent && user.onboarded === false) return <Navigate to="/welcome" replace />;
  // Continue where the student last was (most recent first). A lesson already finished moves on to the next one;
  // a flashcard deck part-way through resumes at its card. With nothing saved, use a started course, then any with lessons left.
  const open = courses.filter((course) => course.next);
  const recent = [...courses].filter((course) => course.last && course.next).sort((a, b) => new Date(b.last.at) - new Date(a.last.at))[0];
  const resume = recent || open.find((course) => course.progress?.completedLessons > 0) || open[0];
  const last = recent?.last;
  const midDeck = last && last.kind === "flashcards" && last.total > 0 && last.position < last.total;
  const target = !resume ? null : midDeck ? last : last && !last.completed ? last : resume.next;
  const next = target;
  const where = midDeck ? `flashcards ${last.position + 1}/${last.total}` : "";
  const nextHref = !target ? "" : midDeck ? `/lessons/${target.lessonId}/flashcards` : `/lessons/${target.lessonId}`;
  const nextState = !resume ? undefined : midDeck ? { from: `/courses/${resume._id}`, courseFrom: `/courses/${resume._id}`, resume: last.position } : { from: `/courses/${resume._id}` };
  const percent = (course) => (course?.progress?.totalLessons ? Math.round((course.progress.completedLessons / course.progress.totalLessons) * 100) : 0);

  return <div className="content student-page home-page">
    <header className="home-header">
      <h1>Home</h1>
    </header>
    {!loading && !error && goal && goal.kind !== "none" && <div className="home-goal">
      <Progress value={Math.round((Math.min(goal.done, goal.target) / goal.target) * 100)} label="Today's goal" />
      <p className="muted home-goal-text">{goal.kind === "minutes" ? `Today: ${goal.done} of ${goal.target} minutes` : `Today: ${goal.done} of 1 lesson`}{goal.met ? ". Goal met." : ""}</p>
    </div>}
    {!loading && !error && weekly && <div className="home-goal">
      <Progress value={Math.round((Math.min(weekly.done, weekly.target) / weekly.target) * 100)} label="This week" />
      <p className="muted home-goal-text">{`This week: ${weekly.done} of ${weekly.target} study days`}{weekly.met ? ". Weekly goal met. Enjoy your rest days." : ""}</p>
    </div>}
    {isStudent && user.hasAccess === false && <p className="notice" role="status">Your access has ended. You can still look around, but lessons, tests and flashcards are locked until your subscription is renewed.</p>}
    {loading && <Loading />}
    {error && <ErrorState message={error} onRetry={load} />}
    {!loading && !error && resume && next && <Card className="home-continue" aria-labelledby="continue-title">
      <h2 id="continue-title">{resume.progress?.completedLessons > 0 ? "Continue where you left off" : "Start your first lesson"}</h2>
      <p className="home-continue-copy"><strong>{resume.code}</strong> · Lesson {next.label}: {next.title}{where && `, ${where}`}</p>
      <Progress value={percent(resume)} label={`${resume.code} progress`} showLabel />
      <div className="button-row button-row--stack"><Button as={Link} variant="primary" to={nextHref} state={nextState} {...nearToPrefetch(() => prefetchLesson(next.lessonId))}>{midDeck ? "Resume flashcards" : `Resume: Lesson ${next.label}`}</Button></div>
    </Card>}
    {user && !loading && !error && <ExamCountdown />}
    {user && !loading && !error && <TodayPlan />}
    {user && !loading && !error && <DueChip />}
    {user && !loading && !error && <MistakesPanel from="/home" />}
    {user && !loading && !error && <TopicsLink />}
    {isStudent && showWelcome && <Welcome onDone={dismissWelcome} />}
    {!loading && !error && !courses.length && <EmptyState illustration={<Illustration name="empty" />} title="No courses yet" description="Check back soon." />}
    {!loading && !error && courses.length > 0 && <section aria-labelledby="courses-title">
      <h2 id="courses-title">Your courses</h2>
      <div className="home-courses">
        {courses.slice(0, HOME_COURSES).map((course) => <Card as={Link} className="home-course" to={`/courses/${course._id}`} key={course._id} {...nearToPrefetch(() => prefetchCourse(course._id))}>
          <span className="home-course-code">{course.code}{course.isFree && <span className="count-chip"> Free</span>}</span>
          <strong className="home-course-title">{course.title}</strong>
          <CourseByline course={course} />
          {course.description && <span className="muted home-course-desc">{course.description}</span>}
          {course.progress?.completedLessons > 0 && <Progress value={percent(course)} label={`${course.code} progress`} />}
        </Card>)}
      </div>
      {courses.length > HOME_COURSES && <p className="home-soon"><Link to="/courses">All {courses.length} courses</Link></p>}
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
