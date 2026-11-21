import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ACCESS_ENDED } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import DueChip from "../../components/learn/DueChip";
import SetCard from "../../components/lab/SetCard";
import { Button, EmptyState, Illustration, Skeleton, SkeletonGroup } from "../../components/ui";

const welcomeKey = "catalyst-welcome-seen";
const welcomeSeen = () => { try { return window.localStorage.getItem(welcomeKey) === "1"; } catch { return false; } };

// Shown once to a student, so the first visit explains how studying works.

function Welcome({ onDone }) {
  return <section className="grid gap-3 rounded-xl bg-muted p-6" aria-labelledby="welcome-title">
    <h2 id="welcome-title" className="m-0 text-xl font-semibold">How Catalyst works</h2>
    <ol className="m-0 grid gap-1.5 pl-5">
      <li>Make a study set from your notes in the Study Lab.</li>
      <li>Study its flashcards and quizzes. Cards come back for review when they are due.</li>
      <li>Study on any day to keep your streak going.</li>
    </ol>
    <div><Button variant="secondary" onClick={onDone}>Got it</Button></div>
  </section>;
}

export default function Courses() {
  const { user } = useAuth();
  // Home shows no courses (hidden for the beta) and no study goals (removed with the Study settings tab). Only sets.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(() => !welcomeSeen());
  const [sets, setSets] = useState(null);

  // The student's own sets, newest first (up to four). Sets still being built by the AI, or that failed, are left out.
  function load() {
    setLoading(true);
    setError("");
    api.getSets("").then(({ data }) => setSets((data || []).filter((set) => set.build.status !== "processing" && set.build.status !== "issue").slice(0, 4)))
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
  const ready = !loading && !error;

  return <div className="mx-auto grid max-w-4xl gap-6">
    <h1 className="m-0 text-3xl leading-tight font-bold">Home</h1>
    {isStudent && user.hasAccess === false && <p className="m-0 rounded-lg bg-muted p-4" role="status">Your access has ended. You can still look around, but lessons, tests and flashcards are locked until your subscription is renewed.</p>}
    {loading && <Loading />}
    {error && <ErrorState message={error} onRetry={load} />}
    {user && ready && <DueChip />}
    {ready && sets?.length > 0 && <section aria-labelledby="sets-title" className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3"><h2 id="sets-title" className="m-0 text-xl font-semibold">Your sets</h2><Link to="/lab">All sets</Link></div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4">{sets.map((set) => <SetCard key={set.id} set={set} onRetry={() => {}} onEmpty={() => {}} />)}</div>
    </section>}
    {ready && sets?.length === 0 && <EmptyState illustration={<Illustration name="empty" />} title="No study sets yet" description="Make a set from your notes and it shows up here." action={<Button as={Link} to="/lab">Go to the Study Lab</Button>} />}
    {isStudent && showWelcome && <Welcome onDone={dismissWelcome} />}
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
    return <div className="mb-4 rounded-md border border-warning bg-warning/10 p-4 [&_p]:mt-0 [&_strong]:text-destructive"><strong>Your access has ended</strong><p>{message}</p><Button as={Link} variant="secondary" to="/home">Back to home</Button></div>;
  }
  return <div className="mb-4 rounded-md border border-warning bg-warning/10 p-4 [&_p]:mt-0 [&_strong]:text-destructive"><strong>We couldn’t load this.</strong><p>{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Retry</Button>}</div>;
}
