import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { formatClock, useTimer } from "../context/TimerContext";
import { Button, TextField } from "../components/ui";
import { t } from "../i18n";

const BEAT_MS = 30 * 1000;

// A quiet room to study together. A student sets a goal, runs the focus timer, and sees how many are focusing now.
// No names, no chat, no ranking. The count comes from a heartbeat sent every 30 seconds while the student is in.
export default function Hall() {
  const { timer, remainingMs, start, cancel } = useTimer();
  const [focusing, setFocusing] = useState(null);
  const [joined, setJoined] = useState(false);
  const [goal, setGoal] = useState("");
  const [problem, setProblem] = useState("");
  const goalRef = useRef("");
  goalRef.current = goal;

  useEffect(() => {
    let live = true;
    api.getHall().then(({ data }) => { if (!live) return; setFocusing(data.focusing); setJoined(data.joined); if (data.goal) setGoal(data.goal); }).catch((err) => setProblem(err.message));
    return () => { live = false; };
  }, []);

  // While in the hall, keep the place and refresh the count. Leaving the page leaves the hall.
  useEffect(() => {
    if (!joined) return undefined;
    const beat = () => api.hallHeartbeat(goalRef.current).then(({ data }) => setFocusing(data.focusing)).catch(() => {});
    const id = window.setInterval(beat, BEAT_MS);
    return () => { window.clearInterval(id); api.hallLeave().catch(() => {}); };
  }, [joined]);

  async function join(event) {
    event.preventDefault();
    setProblem("");
    try {
      const { data } = await api.hallHeartbeat(goal.trim());
      setFocusing(data.focusing);
      setJoined(true);
      if (!timer || timer.done || timer.phase !== "work") start("work");
    } catch (err) {
      setProblem(err.message);
    }
  }

  async function leave() {
    await api.hallLeave().catch(() => {}); // first, so the count below no longer includes this student
    setJoined(false);
    cancel();
    setFocusing((await api.getHall().catch(() => ({ data: { focusing: null } }))).data.focusing);
  }

  const running = timer && !timer.done;
  return <div className="content student-page hall-page">
    <h1>{t("hall.title")}</h1>
    <p className="muted">{t("hall.intro")}</p>
    <p className="hall-count" role="status">{focusing === null ? "" : `${focusing} ${focusing === 1 ? "person is" : "people are"} focusing now`}</p>
    {!joined && <form className="form-stack hall-form" onSubmit={join}>
      <TextField label="Your goal for this session" hint="For example: finish lesson 2.3. Only you can see it." maxLength="80" value={goal} onChange={(event) => setGoal(event.target.value)} />
      <div><Button type="submit">Join and start focus</Button></div>
    </form>}
    {joined && <div className="hall-in">
      <p><strong>Your goal:</strong> {goal || "Study quietly"}</p>
      {running && <p className="timer-big" aria-hidden="true">{formatClock(remainingMs)}</p>}
      {!running && <p className="muted">Your focus session is over. Take a break, or start another from the timer in the top bar.</p>}
      <Button variant="secondary" type="button" onClick={leave}>Leave the hall</Button>
    </div>}
    {problem && <p className="settings-status" role="alert">{problem}</p>}
  </div>;
}
