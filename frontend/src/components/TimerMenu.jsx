import { Link } from "react-router-dom";
import { Timer } from "lucide-react";
import { formatClock, useTimer } from "../context/TimerContext";
import { Button } from "./ui";
import { t } from "../i18n";

// The focus timer button in the top bar. While a session runs, the button shows the time left.
// The countdown is hidden from screen readers, which hear only the message when a session ends.
export function TimerButton({ buttonRef, open, onClick }) {
  const { timer, remainingMs } = useTimer();
  const running = timer && !timer.done;
  return <button ref={buttonRef} className={`icon-button timer-button${running ? " timer-button--running" : ""}`} type="button" aria-label={t("timer.label")} title={t("timer.label")} aria-expanded={open} aria-controls="timer-panel" onClick={onClick}>
    <Timer size={20} aria-hidden="true" />
    {running && <span className="timer-clock" aria-hidden="true">{formatClock(remainingMs)}</span>}
  </button>;
}

export function TimerPanel({ onNavigate }) {
  const { timer, remainingMs, lengths, start, cancel } = useTimer();
  const running = timer && !timer.done;
  return <div className="quick-panel timer-panel" id="timer-panel" role="dialog" aria-label={t("timer.label")}>
    <h2 className="quick-title">{t("timer.label")}</h2>
    {running && <>
      <p className="timer-big" aria-hidden="true">{formatClock(remainingMs)}</p>
      <p className="muted">{timer.phase === "work" ? t("timer.working") : t("timer.resting")}</p>
      <Button variant="secondary" onClick={cancel}>{t("timer.stop")}</Button>
    </>}
    {!running && <>
      {timer?.done && <p><strong>{timer.phase === "work" ? t("timer.workDone") : t("timer.breakDone")}</strong></p>}
      <Button onClick={() => start("work")}>{t("timer.startWork").replace("{n}", lengths.work)}</Button>
      <Button variant="secondary" onClick={() => start("break")}>{t("timer.startBreak").replace("{n}", lengths.break)}</Button>
      {timer?.done && <Button variant="secondary" onClick={cancel}>{t("timer.dismiss")}</Button>}
    </>}
    <Link className="quick-all" to="/hall" onClick={onNavigate}>{t("hall.title")}</Link>
    <Link className="quick-all" to="/settings?tab=study" onClick={onNavigate}>{t("timer.lengths")}</Link>
  </div>;
}

// Read by screen readers when a session ends. Empty the rest of the time.
export function TimerAnnouncer() {
  const { announcement } = useTimer();
  return <p className="sr-only" role="status">{announcement}</p>;
}
