import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { api } from "../api/client";
import { Card } from "./ui";

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
  return <Card className="exam-countdown">
    <CalendarDays size={22} aria-hidden="true" />
    <p><strong>{exam.course.code} exam {when}</strong></p>
    <Link to="/exams">My exams</Link>
  </Card>;
}
