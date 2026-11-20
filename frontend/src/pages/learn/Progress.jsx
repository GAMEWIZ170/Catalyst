import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { api } from "../../api/client";
import { Button, EmptyState, Progress as Bar } from "../../components/ui";
import { ErrorState, Loading } from "./Courses";

export default function Progress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    // One call returns the finished lessons, the streak and every course outline.
    api.getProgressOverview()
      .then(({ data }) => setData({ progress: data.progress || [], streak: data.streak, trees: data.courses || [] }))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  if (error) return <div className="mx-auto max-w-4xl"><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return <Loading />;
  const { progress, streak, trees } = data;
  const completed = progress.filter((item) => item.completed);
  const average = completed.length ? Math.round(completed.reduce((sum, item) => sum + (item.score || 0), 0) / completed.length) : null;
  // Test scores: lessons passed with a score, plus unit and course tests that have a best score.
  const scores = trees.flatMap((tree) => [
    ...tree.units.flatMap((unit) => [
      ...unit.lessons.filter((lesson) => lesson.completed && lesson.testCount > 0 && lesson.score != null).map((lesson) => ({ id: lesson._id, title: lesson.title, score: lesson.score })),
      ...(unit.tests || []).filter((test) => test.bestScore != null).map((test) => ({ id: test._id, title: test.title, score: test.bestScore }))
    ]),
    ...(tree.tests || []).filter((test) => test.bestScore != null).map((test) => ({ id: test._id, title: test.title, score: test.bestScore }))
  ]);
  const panel = "grid gap-3 rounded-lg border border-border bg-card p-5";
  const h2 = "m-0 text-xl font-semibold";
  const row = "m-0 grid list-none gap-2 p-0";
  const rowItem = "flex items-baseline justify-between gap-3";
  const notStarted = trees.filter((tree) => !isStarted(tree));
  return <div className="mx-auto grid max-w-3xl gap-5">
    <h1 className="m-0 text-3xl leading-tight font-bold">Your progress</h1>
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Current streak" value={`${streak.streak} ${streak.streak === 1 ? "day" : "days"}`} detail={streak.completedToday ? "Studied today" : "Not yet today"} icon={<Zap size={18} aria-hidden="true" />} />
      <Stat label="Lessons completed" value={completed.length} />
      <Stat label="Average score" value={average === null ? "No scores yet" : `${average}%`} />
    </div>
    {trees.length === 0 && <EmptyState title="No courses to show yet" description="Your progress will appear here once a course is open." action={<Button as={Link} variant="secondary" to="/home">Back to home</Button>} />}
    {trees.filter(isStarted).map((tree) => <section key={tree._id} className={panel} aria-labelledby={`progress-${tree._id}`}>
      <h2 id={`progress-${tree._id}`} className={h2}>{tree.code} · {tree.title}</h2>
      <div className="grid gap-3">
        {tree.units.map((unit, index) => {
          const done = unit.lessons.filter((lesson) => lesson.completed).length;
          const percent = unit.lessons.length ? Math.round((done / unit.lessons.length) * 100) : 0;
          return <div key={unit._id} className="grid gap-1.5">
            <div className={rowItem}><span>Unit {index + 1} · {unit.title}</span><span className="shrink-0 text-sm text-muted-foreground tabular-nums">{done} of {unit.lessons.length}</span></div>
            <Bar value={percent} label={`Unit ${index + 1} progress`} />
          </div>;
        })}
      </div>
    </section>)}
    {notStarted.length > 0 && <section className={panel} aria-labelledby="not-started-title">
      <h2 id="not-started-title" className={h2}>Not started</h2>
      <ul className={row}>{notStarted.slice(0, 4).map((tree) => <li key={tree._id} className={rowItem}><span>{tree.title}</span><span className="shrink-0 text-sm text-muted-foreground tabular-nums">0 of {tree.units.reduce((sum, unit) => sum + unit.lessons.length, 0)}</span></li>)}</ul>
      {notStarted.length > 4 && <p className="m-0"><Link to="/courses">Browse all {trees.length} courses</Link></p>}
    </section>}
    <section className={panel} aria-labelledby="scores-title">
      <h2 id="scores-title" className={h2}>Test scores</h2>
      {scores.length ? <ul className={row}>{scores.map((item) => <li key={item.id} className={rowItem}><span>{item.title}</span><strong className="tabular-nums">{item.score}%</strong></li>)}</ul>
        : <p className="m-0 text-muted-foreground">No scores yet. Pass a lesson test and it shows up here.</p>}
    </section>
    <div><Button as={Link} variant="secondary" to="/courses">Go to your courses</Button></div>
  </div>;
}

const isStarted = (tree) => tree.units.some((unit) => unit.lessons.some((lesson) => lesson.completed));

function Stat({ label, value, detail, icon }) {
  return <section className="grid content-start gap-1 rounded-lg border border-border bg-card p-4">
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">{icon}{label}</span>
    <strong className="text-2xl leading-tight">{value}</strong>
    {detail && <small className="text-sm text-muted-foreground">{detail}</small>}
  </section>;
}
