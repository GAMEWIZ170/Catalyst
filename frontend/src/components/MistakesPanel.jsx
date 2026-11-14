import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { api } from "../api/client";
import { Button, Card } from "./ui";

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

  return <Card className="mistakes-panel" aria-labelledby="mistakes-title">
    <h2 id="mistakes-title">Mistakes</h2>
    <p className="muted">{plural(total, "question")} to practise. Answer one right on two different days and it leaves this list.</p>
    <ul className="ol-list">
      {courses.map((course) => <li key={course.courseId}>
        {!courseId && <p className="ol-row-meta">{course.code}</p>}
        {course.units.map((unit) => <Link key={unit.unitId} className="ol-row" to={link(course, unit.unitId)} state={{ from }}>
          <span className="ol-row-text"><span className="ol-row-title">{unit.title}</span><span className="ol-row-meta">{plural(unit.count, "question")}</span></span>
          <ChevronRight className="ol-chevron" size={20} aria-hidden="true" />
        </Link>)}
        {course.courseLevel > 0 && <Link className="ol-row" to={link(course)} state={{ from }}>
          <span className="ol-row-text"><span className="ol-row-title">Course tests</span><span className="ol-row-meta">{plural(course.courseLevel, "question")}</span></span>
          <ChevronRight className="ol-chevron" size={20} aria-hidden="true" />
        </Link>}
      </li>)}
    </ul>
    <div className="button-row button-row--stack"><Button as={Link} variant="secondary" to={all} state={{ from }}>Practise my mistakes</Button></div>
  </Card>;
}
