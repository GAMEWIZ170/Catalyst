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
import SetCard from "../../components/lab/SetCard";
import { Button, EmptyState, Illustration, Progress, Skeleton, SkeletonGroup } from "../../components/ui";

const welcomeKey = "catalyst-welcome-seen";
const welcomeSeen = () => { try { return window.localStorage.getItem(welcomeKey) === "1"; } catch { return false; } };

// Shown once to a student, so the first visit explains the path through a course.
const HOME_COURSES = 6;

function Welcome({ onDone }) {
  return <section className="grid gap-3 rounded-xl bg-muted p-6" aria-labelledby="welcome-title">
    <h2 id="welcome-title" className="m-0 text-xl font-semibold">How Catalyst works</h2>
    <ol className="m-0 grid gap-1.5 pl-5">
      <li>Pick a course and work through its lessons in order.</li>
      <li>Each lesson has an explanation, then a test or flashcards. Pass the test or finish the deck to complete it.</li>
      <li>Study on any day to keep your streak going.</li>
    </ol>
    <div><Button variant="secondary" onClick={onDone}>Got it</Button></div>
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
  const [sets, setSets] = useState([]);

  function load() {
    setLoading(true);
    setError("");
    api.getHome().then(({ data, goal: today, weekly: week }) => { setCourses(data || []); setGoal(today || null); setWeekly(week || null); })
      .catch((err) => setError(err.message)).finally(() => setLoading(false));
  }

  useEffect(load, []);
  // The student's own sets, newest first. If this fails the section is simply left out.
  useEffect(() => { api.getSets("").then(({ data }) => setSets((data || []).filter((set) => set.build.status !== "processing" && set.build.status !== "issue").slice(0, 4))).catch(() => {}); }, []);

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
  // "Your courses" are the ones the student joined or has started. A new student with none sees the first few courses instead.
  const joined = new Set((user?.enrolledCourses || []).map(String));
  const mine = courses.filter((course) => course.progress?.completedLessons > 0 || joined.has(String(course._id)) || course._id === resume?._id);
  const listed = (mine.length ? mine : courses).slice(0, HOME_COURSES);
  const percent = (course) => (course?.progress?.totalLessons ? Math.round((course.progress.completedLessons / course.progress.totalLessons) * 100) : 0);

  const goalRow = (value, label, text) => <div className="grid gap-1.5"><Progress value={value} label={label} /><p className="m-0 text-sm text-muted-foreground">{text}</p></div>;
  const ready = !loading && !error;
  const tileClass = "grid content-start gap-1 rounded-lg border border-border bg-card p-4 text-foreground no-underline transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return <div className="mx-auto grid max-w-4xl gap-6">
    <h1 className="m-0 text-3xl leading-tight font-bold">Home</h1>
    {isStudent && user.hasAccess === false && <p className="m-0 rounded-lg bg-muted p-4" role="status">Your access has ended. You can still look around, but lessons, tests and flashcards are locked until your subscription is renewed.</p>}
    {loading && <Loading />}
    {error && <ErrorState message={error} onRetry={load} />}
    {ready && resume && next && <section className="grid gap-3 rounded-xl border border-border bg-card p-6" aria-labelledby="continue-title">
      <h2 id="continue-title" className="m-0 text-xl font-semibold">{resume.progress?.completedLessons > 0 ? "Continue where you left off" : "Start your first lesson"}</h2>
      <p className="m-0 text-muted-foreground"><strong className="text-foreground">{resume.code}</strong> · Lesson {next.label}: {next.title}{where && `, ${where}`}</p>
      <Progress value={percent(resume)} label={`${resume.title} progress`} showLabel />
      <div><Button as={Link} variant="primary" to={nextHref} state={nextState} {...nearToPrefetch(() => prefetchLesson(next.lessonId))}>{midDeck ? "Resume flashcards" : `${resume.progress?.completedLessons > 0 ? "Resume" : "Start"}: Lesson ${next.label}`}</Button></div>
    </section>}
    {ready && ((goal && goal.kind !== "none") || weekly) && <div className="grid gap-4 sm:grid-cols-2">
      {goal && goal.kind !== "none" && goalRow(Math.round((Math.min(goal.done, goal.target) / goal.target) * 100), "Today's goal", `${goal.kind === "minutes" ? `Today: ${goal.done} of ${goal.target} minutes` : `Today: ${goal.done} of 1 lesson`}${goal.met ? ". Goal met." : ""}`)}
      {weekly && goalRow(Math.round((Math.min(weekly.done, weekly.target) / weekly.target) * 100), "This week", `This week: ${weekly.done} of ${weekly.target} study days${weekly.met ? ". Weekly goal met. Enjoy your rest days." : ""}`)}
    </div>}
    {user && ready && <div className="grid gap-3"><ExamCountdown /><TodayPlan /><DueChip /><MistakesPanel from="/home" /><TopicsLink /></div>}
    {ready && sets.length > 0 && <section aria-labelledby="sets-title" className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3"><h2 id="sets-title" className="m-0 text-xl font-semibold">Your sets</h2><Link to="/lab">All sets</Link></div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">{sets.map((set) => <SetCard key={set.id} set={set} onRetry={() => {}} onEmpty={() => {}} />)}</div>
    </section>}
    {isStudent && showWelcome && <Welcome onDone={dismissWelcome} />}
    {ready && !courses.length && <EmptyState illustration={<Illustration name="empty" />} title="No courses yet" description="Check back soon." />}
    {ready && courses.length > 0 && <section aria-labelledby="courses-title" className="grid gap-3">
      <h2 id="courses-title" className="m-0 text-xl font-semibold">{mine.length ? "Your courses" : "Courses"}</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
        {listed.map((course) => <Link className={tileClass} to={`/courses/${course._id}`} key={course._id} {...nearToPrefetch(() => prefetchCourse(course._id))}>
          <span className="text-sm font-semibold text-brand-ink">{course.code}{course.isFree && <span className="rounded-pill bg-muted px-2 py-1 text-sm text-muted-foreground"> Free</span>}</span>
          <strong className="text-lg leading-snug">{course.title}</strong>
          <CourseByline course={course} />
          {course.description && <span className="line-clamp-2 text-sm text-muted-foreground">{course.description}</span>}
          {course.progress?.completedLessons > 0 && <Progress value={percent(course)} label={`${course.code} progress`} />}
        </Link>)}
      </div>
      {courses.length > listed.length && <p className="m-0"><Link to="/courses">Browse all {courses.length} courses</Link></p>}
      {courses.length <= 1 && <p className="m-0 text-muted-foreground">More subjects coming soon.</p>}
    </section>}
  </div>;
}

// Placeholder shapes in the page's own column, so the layout does not jump when content arrives.
export function Loading() {
  return <div className="mx-auto max-w-4xl">
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
    return <div className="mb-4 rounded-md border border-warning bg-warning/10 p-4 [&_p]:mt-0 [&_strong]:text-destructive"><strong>Your access has ended</strong><p>{message}</p><Button as={Link} variant="secondary" to="/courses">Back to courses</Button></div>;
  }
  return <div className="mb-4 rounded-md border border-warning bg-warning/10 p-4 [&_p]:mt-0 [&_strong]:text-destructive"><strong>We couldn’t load this.</strong><p>{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}</div>;
}
