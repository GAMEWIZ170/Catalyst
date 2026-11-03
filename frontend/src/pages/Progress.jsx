import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { ErrorState, Loading } from "./Courses";

function FlameIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a7 7 0 0 0 7-7c0-4.1-3.1-6.7-5.3-9.5-.6 2.2-1.6 3.4-2.8 4.3.1-2.8-.9-4.5-2-5.8C8.5 7.7 5 10 5 14a7 7 0 0 0 7 7Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /></svg>;
}

export default function Progress() {
  const [progress, setProgress] = useState(null);
  const [streak, setStreak] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getProgress(), api.getStreak()])
      .then(([progressResponse, streakResponse]) => {
        setProgress(progressResponse.data || []);
        setStreak(streakResponse.data);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="content"><ErrorState message={error} /></div>;
  if (!progress || !streak) return <Loading />;
  const completed = progress.filter((item) => item.completed);
  const average = completed.length ? Math.round(completed.reduce((sum, item) => sum + (item.score || 0), 0) / completed.length) : null;
  return <div className="content progress-page">
    <h1>Keep your momentum.</h1>
    <div className="stats-grid">
      <Stat label="Current streak" value={`${streak.streak} days`} detail={streak.completedToday ? "Studied today" : "Not yet today"} icon={<FlameIcon />} />
      <Stat label="Lessons completed" value={completed.length} />
      <Stat label="Average score" value={average === null ? "No scores yet" : `${average}%`} />
    </div>
    <Link className="button button-secondary" to="/courses">Go to your courses</Link>
  </div>;
}

function Stat({ label, value, detail, icon }) {
  return <section className="stat-card progress-stat"><span>{icon}{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</section>;
}
