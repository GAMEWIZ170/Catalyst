import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { api } from "../../api/client";
import { Button } from "../ui";

const ROW = "flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 text-foreground no-underline transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Questions the student got wrong and has not yet answered right on two different days.
// On Home it covers every course; with courseId it covers one course. It stays hidden when the queue is empty
// or cannot load, because it is an extra, not something the page depends on.
export default function MistakesPanel({ courseId, from }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    api.getMistakes().then((payload) => { if (live) setData(payload.data || []); }).catch(() => { if (live) setData([]); });
    return () => { live = false; };
  }, [courseId]);

  const courses = (data || []).filter((course) => !courseId || course.courseId === courseId);
  const total = courses.reduce((sum, course) => sum + course.count, 0);
  if (!total) return null;
  const link = (course, unitId) => {
    const query = new URLSearchParams({ course: course.courseId });
    if (unitId) query.set("unit", unitId);
    return `/practice/mistakes?${query}`;
  };
  const all = courseId ? link(courses[0]) : "/practice/mistakes";

  return <section className="grid gap-2 rounded-lg border border-border bg-card p-4" aria-labelledby="mistakes-title">
    <h2 id="mistakes-title" className="m-0 text-xl font-semibold">Mistakes</h2>
    <p className="m-0 text-sm text-muted-foreground">{plural(total, "question")} to practise. Answer one right on two different days and it leaves this list.</p>
    <ul className="m-0 grid list-none gap-0.5 p-0">
      {courses.map((course) => <li key={course.courseId}>
        {!courseId && <p className="m-0 px-3 text-sm font-semibold text-brand-ink">{course.code}</p>}
        {course.units.map((unit) => <Link key={unit.unitId} className={ROW} to={link(course, unit.unitId)} state={{ from }}>
          <span className="grid min-w-0 flex-1 gap-0.5"><span className="font-semibold">{unit.title}</span><span className="text-sm text-muted-foreground">{plural(unit.count, "question")}</span></span>
          <ChevronRight className="shrink-0 text-muted-foreground" size={20} aria-hidden="true" />
        </Link>)}
        {course.courseLevel > 0 && <Link className={ROW} to={link(course)} state={{ from }}>
          <span className="grid min-w-0 flex-1 gap-0.5"><span className="font-semibold">Course tests</span><span className="text-sm text-muted-foreground">{plural(course.courseLevel, "question")}</span></span>
          <ChevronRight className="shrink-0 text-muted-foreground" size={20} aria-hidden="true" />
        </Link>}
      </li>)}
    </ul>
    <div className="pt-1"><Button as={Link} variant="secondary" to={all} state={{ from }}>Practise my mistakes</Button></div>
  </section>;
}
