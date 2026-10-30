import { useEffect, useState } from "react";
import { api } from "../api/client";
import ProgressBar from "../components/ProgressBar";
import { ErrorState, Loading } from "./Courses";

export default function Progress() {
  const [progress, setProgress] = useState([]);
  const [streak, setStreak] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getProgress(), api.getStreak()])
      .then(([progressResponse, streakResponse]) => {
        setProgress(progressResponse.data);
        setStreak(streakResponse.data);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="content"><ErrorState message={error} /></div>;
  if (!streak) return <Loading />;
  const completed = progress.filter((item) => item.completed).length;
  const average = completed ? Math.round(progress.filter((item) => item.completed).reduce((sum, item) => sum + item.score, 0) / completed) : 0;

  return <div className="content">
    <section className="welcome-panel progress-welcome">
      <div><div className="eyebrow">YOUR PROGRESS</div><h1>Keep your momentum.</h1><p>Every completed lesson is a step forward.</p></div>
      <div className="streak-display"><strong>{streak.streak}</strong><span>day streak</span></div>
    </section>
    <div className="stats-grid">
      <Stat label="Lessons completed" value={completed} />
      <Stat label="Average score" value={`${average}%`} />
      <Stat label="Completed today" value={streak.completedToday ? "Yes" : "Not yet"} />
    </div>
    <div className="section-heading"><div><div className="eyebrow">HISTORY</div><h2>Lesson progress</h2></div></div>
    {progress.length === 0 ? <div className="empty-state"><h3>Your progress will appear here</h3><p>Complete a lesson to start building your record.</p></div> :
      <div className="progress-list">{progress.map((item) => <div className="progress-row" key={item.lesson}>
        <div><strong>Lesson</strong><span className="muted">{item.completedAt ? new Date(item.completedAt).toLocaleDateString() : "Not completed"}</span></div>
        <ProgressBar value={item.score || 0} label={item.completed ? "Best score" : "Not started"} />
      </div>)}</div>}
  </div>;
}

function Stat({ label, value }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>;
}
