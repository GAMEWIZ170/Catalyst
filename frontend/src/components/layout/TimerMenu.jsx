import { useState } from "react";
import { Minus, Play, Plus, Square, Timer } from "lucide-react";
import { formatClock, useTimer } from "../../context/TimerContext";
import { t } from "../../i18n";
import { iconButton, quickPanel } from "./topbarStyles";
import { cn } from "@/lib/utils";
const BIG = "m-0 font-mono text-5xl leading-[1.1] font-normal tracking-[-0.02em] tabular-nums";
const START = "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-input bg-transparent font-semibold";
const CHIP = "min-h-9 min-w-11 cursor-pointer rounded-pill border border-input bg-transparent px-3 text-sm transition-colors motion-reduce:transition-none";
const CHIP_ON = "border-primary bg-primary/15 font-semibold";


const PRESETS = [15, 25, 50, 90];

// The focus timer button in the top bar. Idle, it is a quiet icon. While a session runs it becomes a pill with the time left.
// The countdown is hidden from screen readers, which hear only the message when a session ends.
export function TimerButton({ buttonRef, open, onClick }) {
  const { timer, remainingMs } = useTimer();
  const running = timer && !timer.done;
  return <button ref={buttonRef} className={cn(iconButton, "w-auto min-w-11 gap-1 px-2", running && "bg-muted text-brand-ink")} type="button" aria-label={running ? `${t("timer.label")}, ${formatClock(remainingMs)} left` : t("timer.label")} title={t("timer.label")} aria-expanded={open} aria-controls="timer-panel" onClick={onClick}>
    <Timer size={18} aria-hidden="true" />
    {running && <span className="text-sm font-semibold tabular-nums max-[640px]:text-xs" aria-hidden="true">{formatClock(remainingMs)}</span>}
  </button>;
}

// The popover: a big countdown, length chips (15, 25, 50, 90 and Custom), one Start button.
export function TimerPanel({ onNavigate }) {
  const { timer, remainingMs, lengths, start, cancel } = useTimer();
  const running = timer && !timer.done;
  const [choice, setChoice] = useState(PRESETS.includes(lengths.work) ? lengths.work : "custom");
  const [custom, setCustom] = useState(PRESETS.includes(lengths.work) ? 30 : lengths.work);
  const minutes = choice === "custom" ? custom : choice;
  const step = (change) => setCustom((value) => Math.min(180, Math.max(1, value + change)));

  return <div className={`${quickPanel} justify-items-stretch text-center`} id="timer-panel" role="dialog" aria-label={t("timer.label")}>
    <div className="flex items-center justify-between">
      <h2 className="m-0 text-sm font-semibold">{t("timer.label")}</h2>
    </div>

    {running && <>
      <p className={BIG} aria-hidden="true">{formatClock(remainingMs)}</p>
      <p className="m-0 text-muted-foreground">{timer.phase === "work" ? t("timer.working") : t("timer.resting")}</p>
      <button className={START} type="button" onClick={cancel}><Square size={16} aria-hidden="true" />{t("timer.stop")}</button>
    </>}

    {!running && <>
      {timer?.done && <p className="m-0" role="status"><strong>{timer.phase === "work" ? t("timer.workDone") : t("timer.breakDone")}</strong></p>}
      <p className={BIG} aria-hidden="true">{formatClock(minutes * 60 * 1000)}</p>
      <div className="flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Focus length in minutes">
        {PRESETS.map((value) => <button key={value} type="button" role="radio" aria-checked={choice === value} className={cn(CHIP, choice === value ? CHIP_ON : "hover:bg-muted")} onClick={() => setChoice(value)}>{value}</button>)}
        <button type="button" role="radio" aria-checked={choice === "custom"} className={cn(CHIP, choice === "custom" ? CHIP_ON : "hover:bg-muted")} onClick={() => setChoice("custom")}>Custom</button>
      </div>
      {choice === "custom" && <div className="flex items-center justify-center gap-3" role="group" aria-label="Custom minutes">
        <button type="button" className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-input bg-transparent hover:bg-muted" aria-label="One minute less" onClick={() => step(-1)}><Minus size={16} aria-hidden="true" /></button>
        <output className="min-w-20 font-semibold tabular-nums" aria-live="polite">{custom} min</output>
        <button type="button" className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-input bg-transparent hover:bg-muted" aria-label="One minute more" onClick={() => step(1)}><Plus size={16} aria-hidden="true" /></button>
      </div>}
      <button className={cn(START, "border-primary bg-primary text-primary-foreground hover:bg-primary/85")} type="button" onClick={() => start("work", minutes)}><Play size={16} aria-hidden="true" />Start {minutes} min</button>
      <button className="min-h-9 cursor-pointer border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground" type="button" onClick={() => start("break")}>{t("timer.startBreak").replace("{n}", lengths.break)}</button>
      {timer?.done && <button className="min-h-9 cursor-pointer border-0 bg-transparent text-sm text-muted-foreground hover:text-foreground" type="button" onClick={cancel}>{t("timer.dismiss")}</button>}
    </>}
  </div>;
}

// Read by screen readers when a session ends. Empty the rest of the time.
export function TimerAnnouncer() {
  const { announcement } = useTimer();
  return <p className="sr-only" role="status">{announcement}</p>;
}
