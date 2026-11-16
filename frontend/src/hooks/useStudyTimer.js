import { useEffect } from "react";
import { api } from "../api/client";

// Counts the seconds a student is really here (tab visible, a touch or key in the last minute)
// and reports them every 30 seconds. Only runs when a "minutes" goal is on.
export default function useStudyTimer(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    let lastInput = Date.now();
    let pending = 0;
    const touch = () => { lastInput = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((name) => window.addEventListener(name, touch, { passive: true }));
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastInput < 60000) pending += 5;
      if (pending >= 30) {
        const seconds = Math.min(pending, 120);
        pending = 0;
        api.recordStudyTime(seconds).catch(() => {});
      }
    }, 5000);
    return () => {
      window.clearInterval(tick);
      events.forEach((name) => window.removeEventListener(name, touch));
      // Do not lose the last few seconds when leaving.
      if (pending >= 5) api.recordStudyTime(Math.min(pending, 120)).catch(() => {});
    };
  }, [enabled]);
}
