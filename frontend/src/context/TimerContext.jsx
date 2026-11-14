import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { t } from "../i18n";

// The focus timer (Pomodoro). It lives above every page, so it keeps running when the student moves around.
// The state stores when the session ends (endsAt), never a ticking counter: the screen shows endsAt minus now,
// so a hidden tab, a sleeping laptop or a reload cannot make it drift.
const TIMER_KEY = "catalyst-timer";
const LENGTHS_KEY = "catalyst-timer-lengths";
const DEFAULT_LENGTHS = { work: 25, break: 5 };

const read = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The timer still runs for this tab when storage is unavailable.
  }
};

const clampMinutes = (value, fallback, max) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number >= 1 && number <= max ? number : fallback;
};

function beep() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const audio = new Context();
    [0, 0.35].forEach((offset) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.15;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(audio.currentTime + offset);
      oscillator.stop(audio.currentTime + offset + 0.25);
    });
    window.setTimeout(() => audio.close().catch(() => {}), 1200);
  } catch {
    // A browser that blocks sound still shows the message.
  }
}

const TimerContext = createContext(null);

export function TimerProvider({ children }) {
  const [timer, setTimer] = useState(() => read(TIMER_KEY, null)); // { phase, endsAt, minutes, done } or null
  const [lengths, setLengthsState] = useState(() => {
    const saved = read(LENGTHS_KEY, DEFAULT_LENGTHS);
    return { work: clampMinutes(saved.work, 25, 180), break: clampMinutes(saved.break, 5, 60) };
  });
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState("");
  const finishing = useRef(false);

  const finish = useCallback(() => {
    // Another tab may have finished it already: the saved copy is the truth.
    const saved = read(TIMER_KEY, null);
    if (!saved || saved.done || Date.now() < saved.endsAt || finishing.current) return;
    finishing.current = true;
    const next = { ...saved, done: true };
    write(TIMER_KEY, next);
    setTimer(next);
    const message = saved.phase === "work" ? t("timer.workDone") : t("timer.breakDone");
    setAnnouncement(message);
    beep();
    try {
      if ("Notification" in window && Notification.permission === "granted") new Notification(message);
    } catch {
      // Some phones only allow notifications from a service worker. The on-screen message still shows.
    }
    if (saved.phase === "work") api.sendEvent({ type: "focus_session_completed", props: { minutes: saved.minutes } });
    finishing.current = false;
  }, []);

  // One tick a second while a session runs, plus a wake-up at the exact end time and a check when the tab comes back.
  useEffect(() => {
    if (!timer || timer.done) return undefined;
    const tick = window.setInterval(() => { setNow(Date.now()); finish(); }, 1000);
    const wake = window.setTimeout(finish, Math.max(0, timer.endsAt - Date.now()) + 50);
    const visible = () => { if (document.visibilityState === "visible") { setNow(Date.now()); finish(); } };
    document.addEventListener("visibilitychange", visible);
    return () => { window.clearInterval(tick); window.clearTimeout(wake); document.removeEventListener("visibilitychange", visible); };
  }, [timer, finish]);

  // A change in another tab (start, cancel, finish) shows here too.
  useEffect(() => {
    const onStorage = (event) => { if (event.key === TIMER_KEY) setTimer(read(TIMER_KEY, null)); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // A session that ended while the page was closed is finished the moment the page opens.
  useEffect(() => { finish(); }, [finish]);

  const start = useCallback((phase) => {
    // The permission prompt appears only when the student starts a timer, never before.
    try {
      if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    } catch {
      // Not every browser supports it.
    }
    const minutes = lengths[phase];
    const next = { phase, minutes, endsAt: Date.now() + minutes * 60 * 1000, done: false };
    write(TIMER_KEY, next);
    setAnnouncement("");
    setNow(Date.now());
    setTimer(next);
  }, [lengths]);

  const cancel = useCallback(() => {
    write(TIMER_KEY, null);
    setAnnouncement("");
    setTimer(null);
  }, []);

  const setLengths = useCallback((next) => {
    const clean = { work: clampMinutes(next.work, lengths.work, 180), break: clampMinutes(next.break, lengths.break, 60) };
    write(LENGTHS_KEY, clean);
    setLengthsState(clean);
  }, [lengths]);

  const remainingMs = timer && !timer.done ? Math.max(0, timer.endsAt - now) : 0;
  const value = useMemo(() => ({ timer, remainingMs, lengths, announcement, start, cancel, setLengths }), [timer, remainingMs, lengths, announcement, start, cancel, setLengths]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export const useTimer = () => useContext(TimerContext);

export const formatClock = (ms) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
