import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Sparkles, Trophy, Zap } from "lucide-react";
import { api } from "../../api/client";
import { Button, EmptyState } from "../../components/ui";
import ActivityHeatmap from "../../components/progress/ActivityHeatmap";
import SetProgress from "../../components/progress/SetProgress";
import CardsDonut from "../../components/progress/CardsDonut";
import { ErrorState, Loading } from "./Courses";

// A warm line under the title that follows how the student is doing. It never scolds.
function greeting({ streak, completedToday, activeDaysInYear }) {
  if (completedToday && streak > 1) return `${streak} days in a row. Keep it going.`;
  if (completedToday) return "You studied today. Nice work.";
  if (streak > 0) return `Study today to make it ${streak + 1} days.`;
  if (activeDaysInYear > 0) return "Welcome back. Pick up where you left off.";
  return "Your study story starts here.";
}

// Progress: streaks, level, a year of activity and how each study set is going. One call (GET /progress/summary).
export default function Progress() {
  const [data, setData] = useState(null);
  const [year, setYear] = useState(null);
  const [loadingYear, setLoadingYear] = useState(false);
  const [error, setError] = useState("");

  function load(nextYear = year) {
    setError("");
    if (data) setLoadingYear(true);
    api.getProgressSummary(nextYear)
      .then(({ data: summary }) => { setData(summary); setYear(summary.year); })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingYear(false));
  }

  useEffect(() => { load(null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !data) return <div className="mx-auto max-w-3xl"><ErrorState message={error} onRetry={() => load()} /></div>;
  if (!data) return <Loading />;

  const { streak, longestStreak, activeDaysInYear, level, sets } = data;
  const stats = [
    { icon: Zap, label: "Current streak", value: `${streak} ${streak === 1 ? "day" : "days"}`, detail: data.completedToday ? "Studied today" : "One rest day never breaks it" },
    { icon: Trophy, label: "Longest streak", value: `${longestStreak} ${longestStreak === 1 ? "day" : "days"}` },
    { icon: CalendarDays, label: `Active days in ${data.year}`, value: activeDaysInYear },
    { icon: Sparkles, label: "Level", value: level.level, bar: Math.round((level.into / level.next) * 100), detail: `${level.into} / ${level.next} XP to level ${level.level + 1}` }
  ];

  // minmax(0, 1fr): the column never grows to fit the year grid, so on a phone the grid swipes inside its card instead.
  return <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-6">
    <div className="grid gap-1">
      <h1 className="m-0 text-3xl leading-tight font-bold">Your progress</h1>
      <p className="m-0 text-muted-foreground">{greeting(data)}</p>
    </div>

    <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
      {stats.map(({ icon: Icon, label, value, detail, bar }) => <li key={label} className="grid content-start gap-1 rounded-xl bg-muted/60 p-4">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Icon size={16} className="text-brand-ink" aria-hidden="true" />{label}</span>
        <strong className="text-2xl leading-tight tabular-nums">{value}</strong>
        {bar !== undefined && <span className="h-1.5 overflow-hidden rounded-pill bg-background" aria-hidden="true"><span className="block h-full rounded-pill bg-primary" style={{ width: `${bar}%` }} /></span>}
        {detail && <small className="text-xs text-muted-foreground">{detail}</small>}
      </li>)}
    </ul>

    <ActivityHeatmap year={data.year} firstYear={data.firstYear} today={data.today} days={data.days} loading={loadingYear} onYear={(next) => load(next)} />
    {error && <p className="m-0 text-sm text-destructive" role="alert">{error}</p>}

    <section className="grid gap-3" aria-labelledby="sets-title">
      <h2 id="sets-title" className="m-0 text-lg font-semibold">Your sets</h2>
      {sets.length ? <><CardsDonut sets={sets} /><SetProgress sets={sets} /></>
        : <EmptyState title="No study sets yet" description="Make a set from your notes and its progress shows up here." action={<Button as={Link} to="/lab">Make your first set</Button>} />}
    </section>
  </div>;
}
