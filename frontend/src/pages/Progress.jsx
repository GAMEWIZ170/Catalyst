import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { api } from "../api/client";
import { Button, Card, Progress as Bar } from "../components/ui";
import { ErrorState, Loading } from "./Courses";

export default function Progress() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // One call returns the finished lessons, the streak and every course outline.
    api.getProgressOverview()
      .then(({ data }) => setData({ progress: data.progress || [], streak: data.streak, trees: data.courses || [] }))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="content"><ErrorState message={error} /></div>;
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
  return <div className="content progress-page">
    <h1>Your progress</h1>
    <div className="stats-grid">
      <Stat label="Current streak" value={`${streak.streak} ${streak.streak === 1 ? "day" : "days"}`} detail={streak.completedToday ? "Studied today" : "Not yet today"} icon={<Zap size={20} aria-hidden="true" />} />
      <Stat label="Lessons completed" value={completed.length} />
      <Stat label="Average score" value={average === null ? "No scores yet" : `${average}%`} />
    </div>
    {trees.map((tree) => <Card key={tree._id} aria-labelledby={`progress-${tree._id}`}>
      <h2 id={`progress-${tree._id}`}>{tree.code} · {tree.title}</h2>
      <div className="progress-units">
        {tree.units.map((unit, index) => {
          const done = unit.lessons.filter((lesson) => lesson.completed).length;
          const percent = unit.lessons.length ? Math.round((done / unit.lessons.length) * 100) : 0;
          return <div key={unit._id} className="progress-unit">
            <div className="progress-unit-head"><span>Unit {index + 1} · {unit.title}</span><span className="muted progress-num">{done} of {unit.lessons.length}</span></div>
            <Bar value={percent} label={`Unit ${index + 1} progress`} />
          </div>;
        })}
      </div>
    </Card>)}
    <Card aria-labelledby="scores-title">
      <h2 id="scores-title">Test scores</h2>
      {scores.length ? <ul className="score-list">{scores.map((item) => <li key={item.id}><span>{item.title}</span><strong className="progress-num">{item.score}%</strong></li>)}</ul>
        : <p className="muted">No scores yet. Pass a lesson test and it shows up here.</p>}
    </Card>
    <div className="button-row"><Button as={Link} variant="secondary" to="/courses">Go to your courses</Button></div>
  </div>;
}

function Stat({ label, value, detail, icon }) {
  return <section className="stat-card progress-stat"><span>{icon}{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</section>;
}
