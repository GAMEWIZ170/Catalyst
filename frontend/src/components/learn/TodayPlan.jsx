import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

const ROW = "flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-foreground no-underline transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

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
  return <section className="grid gap-2 rounded-lg border border-border bg-card p-4" aria-labelledby="plan-title">
    <h2 id="plan-title" className="m-0 text-xl font-semibold">Today's plan</h2>
    <p className="m-0 text-sm text-muted-foreground">Exam {plan.daysLeft === 1 ? "today" : `in ${plural(plan.daysLeft, "day")}`} ({plan.examDate}). {plural(plan.remainingLessons, "lesson")} left, about {plan.perDay} a day.</p>
    {nothing && <p className="m-0">You are done for today. Well done.</p>}
    {plan.lessons.length > 0 && <>
      <h3 className="m-0 text-sm font-semibold text-muted-foreground">Lessons</h3>
      <ul className="m-0 grid list-none gap-0.5 p-0">
        {plan.lessons.map((lesson) => <li key={lesson.lessonId}>
          <Link className={ROW} to={`/lessons/${lesson.lessonId}`} state={{ from: `/courses/${lesson.courseId}` }}>
            <span className="grid min-w-0 flex-1 gap-0.5"><span className="font-semibold"><span className="text-muted-foreground tabular-nums">{lesson.label}</span> {lesson.title}</span><span className="text-sm text-muted-foreground">{lesson.course}</span></span>
          </Link>
        </li>)}
      </ul>
      {plan.moreLessons > 0 && <p className="m-0 text-sm text-muted-foreground">and {plural(plan.moreLessons, "more lesson")}</p>}
    </>}
    {reviews > 0 && <>
      <h3 className="m-0 text-sm font-semibold text-muted-foreground">Review</h3>
      <Link className={ROW} to="/review"><span className="font-semibold">{plural(plan.due.cards, "card")}, {plural(plan.due.mistakes, "mistake")} due</span></Link>
    </>}
  </section>;
}
