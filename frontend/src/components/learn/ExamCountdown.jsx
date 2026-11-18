import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { api } from "../../api/client";

// A quiet card on Home: the nearest exam the student added and the days left. Hidden when there is none.
export default function ExamCountdown() {
  const [exam, setExam] = useState(null);
  useEffect(() => {
    let live = true;
    api.getMyExams().then(({ data }) => { if (live) setExam(data.upcoming[0] || null); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!exam) return null;
  const when = exam.daysLeft === 0 ? "today" : exam.daysLeft === 1 ? "tomorrow" : `in ${exam.daysLeft} days`;
  return <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
    <CalendarDays size={22} className="shrink-0 text-brand-ink" aria-hidden="true" />
    <p className="m-0 flex-1"><strong>{exam.course.code} exam {when}</strong></p>
    <Link to="/exams" className="font-semibold text-brand-ink underline">My exams</Link>
  </div>;
}
