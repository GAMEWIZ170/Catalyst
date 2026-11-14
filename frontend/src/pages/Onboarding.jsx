import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Radio, RadioGroup, TextField } from "../components/ui";
import { ErrorState, Loading } from "./Courses";
import { GOALS } from "../utils/goals";

// Three short steps for a new student: course, exam date, daily goal. Every step after the first can be skipped.
export default function Onboarding() {
  const { user, updatePreferences } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [goal, setGoal] = useState("none");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const leaving = useRef(false); // saving flips user.onboarded, which must not trigger the redirect below

  function load() {
    setError("");
    api.getHome().then(({ data }) => {
      setCourses(data || []);
      if (data?.length === 1) setCourseId(data[0]._id);
    }).catch((err) => setError(err.message));
  }
  useEffect(load, []);

  if (!leaving.current && user && (user.role !== "student" || user.onboarded !== false)) return <Navigate to="/courses" replace />;

  async function finish(skipAll) {
    setBusy(true);
    setError("");
    leaving.current = true;
    try {
      const chosen = GOALS.find((item) => item.key === goal);
      await updatePreferences(skipAll
        ? { onboarded: true }
        : { onboarded: true, examDate: examDate || null, goalKind: chosen.kind, ...(chosen.minutes ? { goalMinutes: chosen.minutes } : {}) });
      if (!skipAll && courseId) {
        // Straight to the first lesson of the chosen course.
        const outline = (await api.getCourse(courseId)).data;
        const first = outline.units?.flatMap((unit) => unit.lessons || [])[0];
        navigate(first ? `/lessons/${first._id}` : `/courses/${courseId}`, { replace: true, state: { from: `/courses/${courseId}` } });
      } else {
        navigate("/courses", { replace: true });
      }
    } catch (err) {
      leaving.current = false;
      setError(err.message);
      setBusy(false);
    }
  }

  if (error && !courses) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!courses) return <Loading />;

  return <div className="content onboarding">
    <p className="muted" aria-live="polite">Step {step} of 3</p>
    {step === 1 && <section aria-labelledby="ob-title">
      <h1 id="ob-title">Choose your course</h1>
      {courses.length === 0
        ? <p>No courses are open yet. You can come back soon.</p>
        : <RadioGroup legend="Course">
          {courses.map((course) => <Radio key={course._id} name="course" label={`${course.code}: ${course.title}`} checked={courseId === course._id} onChange={() => setCourseId(course._id)} />)}
        </RadioGroup>}
      <div className="button-row button-row--stack">
        <Button disabled={courses.length > 0 && !courseId} onClick={() => setStep(2)}>Next</Button>
        <Button variant="tertiary" loading={busy} onClick={() => finish(true)}>Skip setup</Button>
      </div>
    </section>}
    {step === 2 && <section aria-labelledby="ob-title">
      <h1 id="ob-title">When is your exam?</h1>
      <p className="muted">Optional. It helps us keep your plan in view.</p>
      <TextField label="Exam date" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
      <div className="button-row button-row--stack">
        <Button onClick={() => setStep(3)}>{examDate ? "Next" : "Skip this step"}</Button>
        <Button variant="tertiary" onClick={() => setStep(1)}>Back</Button>
      </div>
    </section>}
    {step === 3 && <section aria-labelledby="ob-title">
      <h1 id="ob-title">Set a daily goal</h1>
      <p className="muted">Optional. Your streak counts any study day, with or without a goal.</p>
      <RadioGroup legend="Daily goal">
        {GOALS.map((item) => <Radio key={item.key} name="goal" label={item.label} checked={goal === item.key} onChange={() => setGoal(item.key)} />)}
      </RadioGroup>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="button-row button-row--stack">
        <Button loading={busy} onClick={() => finish(false)}>{courseId ? "Start my first lesson" : "Finish"}</Button>
        <Button variant="tertiary" disabled={busy} onClick={() => setStep(2)}>Back</Button>
      </div>
    </section>}
  </div>;
}
