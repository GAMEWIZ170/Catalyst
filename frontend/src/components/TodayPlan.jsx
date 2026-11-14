import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card } from "./ui";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Today's revision plan, shown when the student has set an exam date. Hidden otherwise or if it cannot load.
export default function TodayPlan() {
  const [plan, setPlan] = useState(null);
  useEffect(() => {
    let live = true;
    api.getPlan().then((payload) => { if (live) setPlan(payload.data); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!plan) return null;
  const reviews = plan.due.cards + plan.due.mistakes;
  const nothing = plan.lessons.length === 0 && reviews === 0;
  return <Card className="today-plan" aria-labelledby="plan-title">
    <h2 id="plan-title">Today's plan</h2>
    <p className="muted">Exam {plan.daysLeft === 1 ? "today" : `in ${plural(plan.daysLeft, "day")}`} ({plan.examDate}). {plural(plan.remainingLessons, "lesson")} left, about {plan.perDay} a day.</p>
    {nothing && <p>You are done for today. Well done.</p>}
    {plan.lessons.length > 0 && <>
      <h3>Lessons</h3>
      <ul className="ol-list">
        {plan.lessons.map((lesson) => <li key={lesson.lessonId}>
          <Link className="ol-row" to={`/lessons/${lesson.lessonId}`} state={{ from: `/courses/${lesson.courseId}` }}>
            <span className="ol-row-text"><span className="ol-row-title"><span className="ol-num">{lesson.label}</span> {lesson.title}</span><span className="ol-row-meta">{lesson.course}</span></span>
          </Link>
        </li>)}
      </ul>
      {plan.moreLessons > 0 && <p className="muted">and {plural(plan.moreLessons, "more lesson")}</p>}
    </>}
    {reviews > 0 && <>
      <h3>Review</h3>
      <Link className="ol-row" to="/review"><span className="ol-row-text"><span className="ol-row-title">{plural(plan.due.cards, "card")}, {plural(plan.due.mistakes, "mistake")} due</span></span></Link>
    </>}
  </Card>;
}
