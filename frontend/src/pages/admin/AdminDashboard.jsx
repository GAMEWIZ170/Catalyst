import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import AdminLayout from "../../components/admin/AdminLayout";
import StatusMessage from "../../components/admin/StatusMessage";
import { Card, EmptyState } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";

const W = 600;
const H = 180;
const PAD = { left: 36, right: 48, top: 12, bottom: 24 };

const SERIES = [
  { key: "mau", label: "MAU", className: "stroke-muted-foreground stroke-2 [stroke-dasharray:5_3] [stroke-linejoin:round]" },
  { key: "wau", label: "WAU", className: "stroke-info stroke-2 [stroke-linejoin:round]" },
  { key: "dau", label: "DAU", className: "stroke-primary stroke-3 [stroke-linejoin:round]" }
];

// Three lines over 30 days. Each line is named at its right end, so colour is never the only clue.
function Trend({ rows }) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.dau, row.wau, row.mau]));
  const x = (index) => PAD.left + (index / Math.max(1, rows.length - 1)) * (W - PAD.left - PAD.right);
  const y = (value) => PAD.top + (1 - value / max) * (H - PAD.top - PAD.bottom);
  const last = rows[rows.length - 1];
  return <>
    <svg className="block h-auto w-full max-w-full" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Active students over the last ${rows.length} days. Latest: ${last.dau} today, ${last.wau} this week, ${last.mau} this month.`}>
      <line className="stroke-input" x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} />
      <line className="stroke-border [stroke-dasharray:3_3]" x1={PAD.left} x2={W - PAD.right} y1={y(max)} y2={y(max)} />
      <text className="fill-muted-foreground text-xs" x={PAD.left - 6} y={y(max) + 4} textAnchor="end">{max}</text>
      <text className="fill-muted-foreground text-xs" x={PAD.left - 6} y={y(0) + 4} textAnchor="end">0</text>
      <text className="fill-muted-foreground text-xs" x={PAD.left} y={H - 4}>{rows[0].day.slice(5)}</text>
      <text className="fill-muted-foreground text-xs" x={W - PAD.right} y={H - 4} textAnchor="end">{last.day.slice(5)}</text>
      {SERIES.map((series) => <g key={series.key}>
        <polyline className={series.className} fill="none" points={rows.map((row, index) => `${x(index)},${y(row[series.key])}`).join(" ")} />
        <text className="fill-muted-foreground text-xs font-semibold" x={W - PAD.right + 6} y={y(last[series.key]) + 4}>{series.label}</text>
      </g>)}
    </svg>
    <details className="[&_summary]:mt-2 [&_summary]:flex [&_summary]:min-h-11 [&_summary]:cursor-pointer [&_summary]:items-center">
      <summary>Show the numbers</summary>
      <div className="table-scroll"><table className={TABLE}>
        <thead><tr><th scope="col">Day</th><th scope="col">DAU</th><th scope="col">WAU</th><th scope="col">MAU</th><th scope="col">Sign-ups</th></tr></thead>
        <tbody>{[...rows].reverse().map((row) => <tr key={row.day}><th scope="row">{row.day}</th><td>{row.dau}</td><td>{row.wau}</td><td>{row.mau}</td><td>{row.signups}</td></tr>)}</tbody>
      </table></div>
    </details>
  </>;
}

// Shared by every small table on this page.
const TABLE = "w-full border-collapse [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-left [&_td]:tabular-nums [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:tabular-nums";

const Tile = ({ label, value, note }) => <Card className="grid gap-1">
  <span className="text-sm text-muted-foreground">{label}</span>
  <strong className="text-[1.75rem] leading-[1.1] tabular-nums">{value}</strong>
  {note && <span className="text-xs text-muted-foreground">{note}</span>}
</Card>;

const percent = (value) => (value === null || value === undefined ? "n/a" : `${value}%`);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setError("");
    api.getDashboard().then((response) => setData(response.data)).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  if (error && !data) return <AdminLayout><ErrorState message={error} onRetry={load} /></AdminLayout>;
  if (!data) return <AdminLayout><Loading /></AdminLayout>;
  const { summary, trend } = data;
  const computed = data.computedAt ? new Date(data.computedAt).toLocaleString() : null;

  return <AdminLayout>
    <div className="admin-heading"><div><h1>Dashboard</h1>
      <p className="muted">{computed ? `Worked out ${computed}. Days are UTC days.` : "Not worked out yet."}</p></div></div>
    <StatusMessage message={error} error />
    {!summary && <EmptyState title="No numbers yet" description="Run npm run stats in the backend folder. It reads the event log and fills this page. Set it to run every night." />}
    {summary && <>
      <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-3">
        <Tile label="Active today (DAU)" value={data.latest?.dau ?? 0} />
        <Tile label="Active this week (WAU)" value={data.latest?.wau ?? 0} />
        <Tile label="Active this month (MAU)" value={data.latest?.mau ?? 0} />
        <Tile label="Stickiness" value={percent(data.stickiness)} note="DAU divided by MAU, latest finished day" />
        <Tile label="New sign-ups, last 7 days" value={data.signupsThisWeek} />
        <Tile label="Activation" value={percent(summary.activation.percent)} note={`${summary.activation.activated} of ${summary.activation.eligible} new students finished a lesson and a test within 48 hours`} />
        <Card as={Link} className="grid gap-1 text-inherit no-underline" to="/admin/reports"><span className="text-sm text-muted-foreground">Open problem reports</span><strong className="text-[1.75rem] leading-[1.1] tabular-nums">{data.openReports}</strong></Card>
      </div>

      <section className="admin-editor-section" aria-labelledby="trend-heading">
        <h2 id="trend-heading">Active students, last 30 days</h2>
        {trend.length > 1 ? <Trend rows={trend} /> : <p className="muted">The trend appears once there are two days of numbers.</p>}
      </section>

      <section className="admin-editor-section" aria-labelledby="retention-heading">
        <h2 id="retention-heading">Retention by sign-up week</h2>
        <p className="muted">The share of a week's new students who came back exactly 1, 7 and 30 days after signing up. "n/a" means that day has not happened yet.</p>
        {summary.retention.length === 0 ? <p className="muted">No sign-ups in the event log yet.</p> : <div className="table-scroll"><table className={TABLE}>
          <thead><tr><th scope="col">Week of</th><th scope="col">New students</th><th scope="col">Day 1</th><th scope="col">Day 7</th><th scope="col">Day 30</th></tr></thead>
          <tbody>{summary.retention.map((row) => <tr key={row.week}><th scope="row">{row.week}</th><td>{row.users}</td><td>{percent(row.d1)}</td><td>{percent(row.d7)}</td><td>{percent(row.d30)}</td></tr>)}</tbody>
        </table></div>}
      </section>

      <section className="admin-editor-section" aria-labelledby="lessons-heading">
        <h2 id="lessons-heading">Lessons, last 30 days</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-6">
          <div>
            <h3>Most completed</h3>
            {summary.topLessons.length === 0 ? <p className="muted">No completed lessons yet.</p> : <ol className="mt-2 mb-0 grid gap-2 pl-6 [&_li_span:last-child]:block [&_li_span:last-child]:text-sm">{summary.topLessons.map((lesson) => <li key={lesson.lessonId}><span>{lesson.course && <strong>{lesson.course}</strong>} {lesson.title}</span><span className="muted">{lesson.completed} students</span></li>)}</ol>}
          </div>
          <div>
            <h3>Where students drop off</h3>
            <p className="muted">Opened by 3 or more students, and not finished by most of them.</p>
            {summary.dropOff.length === 0 ? <p className="muted">Nothing stands out yet.</p> : <ol className="mt-2 mb-0 grid gap-2 pl-6 [&_li_span:last-child]:block [&_li_span:last-child]:text-sm">{summary.dropOff.map((lesson) => <li key={lesson.lessonId}><span>{lesson.course && <strong>{lesson.course}</strong>} {lesson.title}</span><span className="muted">{lesson.leftPercent}% did not finish ({lesson.completed} of {lesson.opened})</span></li>)}</ol>}
          </div>
        </div>
      </section>

      <section className="admin-editor-section" aria-labelledby="ai-heading">
        <h2 id="ai-heading">AI use, last 14 days</h2>
        <p className="muted">{`Each student: ${data.ai.limits.messages} companion messages and ${data.ai.limits.generations} drafts a day. Whole platform: ${data.ai.limits.global} requests a day, then "AI is resting until tomorrow". Days are UTC days.`}</p>
        {data.ai.days.length === 0 ? <p className="muted">No AI use yet.</p> : <div className="table-scroll"><table className={TABLE}>
          <thead><tr><th scope="col">Day</th><th scope="col">Students</th><th scope="col">Messages</th><th scope="col">Drafts</th><th scope="col">Tokens in / out</th><th scope="col">Resting</th></tr></thead>
          <tbody>{[...data.ai.days].reverse().map((row) => <tr key={row.day}><th scope="row">{row.day}</th><td>{row.students}</td><td>{row.messages}</td><td>{row.generations}</td><td>{row.inputTokens} / {row.outputTokens}</td><td>{row.resting || row.messages + row.generations >= data.ai.limits.global ? "Yes" : "No"}</td></tr>)}</tbody>
        </table></div>}
      </section>

      <section className="admin-editor-section" aria-labelledby="activity-heading">
        <h2 id="activity-heading">Activity</h2>
        <div className="table-scroll"><table className={TABLE}>
          <thead><tr><th scope="col">What</th><th scope="col">Last 7 days</th><th scope="col">Last 30 days</th></tr></thead>
          <tbody>
            {[["Lessons completed", "lessonsCompleted"], ["Tests submitted", "testsSubmitted"], ["Study sets created", "set_created"], ["Study sets studied", "set_studied"], ["Challenges sent", "challenge_sent"], ["Challenges played", "challenge_played"]].map(([label, key]) => <tr key={key}><th scope="row">{label}</th><td>{summary.totals.last7[key] ?? 0}</td><td>{summary.totals.last30[key] ?? 0}</td></tr>)}
            <tr><th scope="row">Achievements earned</th><td colSpan="2" className="muted">Not tracked yet</td></tr>
          </tbody>
        </table></div>
        <p className="muted">Study sets and challenges show 0 until those features are built.</p>
      </section>
    </>}
  </AdminLayout>;
}
