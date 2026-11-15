import { useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Play, Plus, Settings, Square, Timer } from "lucide-react";
import { formatClock, useTimer } from "../context/TimerContext";
import { t } from "../i18n";

const PRESETS = [15, 25, 50, 90];

// The focus timer button in the top bar. Idle, it is a quiet icon. While a session runs it becomes a pill with the time left.
// The countdown is hidden from screen readers, which hear only the message when a session ends.
export function TimerButton({ buttonRef, open, onClick }) {
  const { timer, remainingMs } = useTimer();
  const running = timer && !timer.done;
  return <button ref={buttonRef} className={`icon-button timer-button${running ? " timer-button--running" : ""}`} type="button" aria-label={running ? `${t("timer.label")}, ${formatClock(remainingMs)} left` : t("timer.label")} title={t("timer.label")} aria-expanded={open} aria-controls="timer-panel" onClick={onClick}>
    <Timer size={18} aria-hidden="true" />
    {running && <span className="timer-clock" aria-hidden="true">{formatClock(remainingMs)}</span>}
  </button>;
}

// The popover: a big countdown, length chips (15, 25, 50, 90 and Custom), one Start button, and a gear for the default lengths.
export function TimerPanel({ onNavigate }) {
  const { timer, remainingMs, lengths, start, cancel } = useTimer();
  const running = timer && !timer.done;
  const [choice, setChoice] = useState(PRESETS.includes(lengths.work) ? lengths.work : "custom");
  const [custom, setCustom] = useState(PRESETS.includes(lengths.work) ? 30 : lengths.work);
  const minutes = choice === "custom" ? custom : choice;
  const step = (change) => setCustom((value) => Math.min(180, Math.max(1, value + change)));

  return <div className="quick-panel timer-panel" id="timer-panel" role="dialog" aria-label={t("timer.label")}>
    <div className="timer-head">
      <h2 className="quick-title">{t("timer.label")}</h2>
      <Link className="icon-button timer-gear" to="/settings?tab=study" onClick={onNavigate} aria-label={t("timer.lengths")} title={t("timer.lengths")}><Settings size={18} aria-hidden="true" /></Link>
    </div>

    {running && <>
      <p className="timer-big" aria-hidden="true">{formatClock(remainingMs)}</p>
      <p className="timer-phase">{timer.phase === "work" ? t("timer.working") : t("timer.resting")}</p>
      <button className="timer-start" type="button" onClick={cancel}><Square size={16} aria-hidden="true" />{t("timer.stop")}</button>
    </>}

    {!running && <>
      {timer?.done && <p className="timer-done" role="status"><strong>{timer.phase === "work" ? t("timer.workDone") : t("timer.breakDone")}</strong></p>}
      <p className="timer-big" aria-hidden="true">{formatClock(minutes * 60 * 1000)}</p>
      <div className="timer-chips" role="radiogroup" aria-label="Focus length in minutes">
        {PRESETS.map((value) => <button key={value} type="button" role="radio" aria-checked={choice === value} className={`timer-chip${choice === value ? " is-on" : ""}`} onClick={() => setChoice(value)}>{value}</button>)}
        <button type="button" role="radio" aria-checked={choice === "custom"} className={`timer-chip${choice === "custom" ? " is-on" : ""}`} onClick={() => setChoice("custom")}>Custom</button>
      </div>
      {choice === "custom" && <div className="timer-stepper" role="group" aria-label="Custom minutes">
        <button type="button" className="timer-step" aria-label="One minute less" onClick={() => step(-1)}><Minus size={16} aria-hidden="true" /></button>
        <output className="timer-minutes" aria-live="polite">{custom} min</output>
        <button type="button" className="timer-step" aria-label="One minute more" onClick={() => step(1)}><Plus size={16} aria-hidden="true" /></button>
      </div>}
      <button className="timer-start timer-start--primary" type="button" onClick={() => start("work", minutes)}><Play size={16} aria-hidden="true" />Start {minutes} min</button>
      <button className="timer-break" type="button" onClick={() => start("break")}>{t("timer.startBreak").replace("{n}", lengths.break)}</button>
      {timer?.done && <button className="timer-break" type="button" onClick={cancel}>{t("timer.dismiss")}</button>}
    </>}
  </div>;
}

// Read by screen readers when a session ends. Empty the rest of the time.
export function TimerAnnouncer() {
  const { announcement } = useTimer();
  return <p className="sr-only" role="status">{announcement}</p>;
}
