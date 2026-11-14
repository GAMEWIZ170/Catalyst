import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { Button, Dialog, Progress } from "./ui";
import { t } from "../i18n";

// Fills {name} gaps in a UI text.
const fill = (key, values) => Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), t(key));

// The student's XP and level. Loaded when signed in and after each page change, so a level reached while
// answering shows up the next time they move (never in the middle of a test). A failed load keeps the old numbers.
export function useXp(enabled, pathname) {
  const [xp, setXp] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    api.getXp().then(({ data }) => { if (current) setXp(data); }).catch(() => {});
    return () => { current = false; };
  }, [enabled, pathname]);
  const dismiss = useCallback(() => {
    setXp((s) => (s ? { ...s, pendingLevelUp: null } : s));
    api.markXpSeen().catch(() => {});
  }, []);
  return { xp, dismiss };
}

// A short, quiet moment: one small panel, one button.
export function LevelUpDialog({ xp, onClose }) {
  return <Dialog open={Boolean(xp?.pendingLevelUp)} onClose={onClose} title={fill("xp.levelUp", { level: xp?.pendingLevelUp })}
    actions={<Button onClick={onClose}>{t("xp.continue")}</Button>}>
    <p>{t("xp.levelUpBody")}</p>
  </Dialog>;
}

// Level and progress toward the next one, for the Me page.
export function LevelCard({ xp }) {
  if (!xp) return null;
  const percent = Math.round((xp.into / xp.next) * 100);
  return <section className="level-card" aria-label={t("xp.title")}>
    <div className="level-card-head">
      <strong>{fill("xp.level", { level: xp.level })}</strong>
      <span className="muted">{fill("xp.total", { xp: xp.xp })}</span>
    </div>
    <Progress value={percent} label={fill("xp.toNext", { xp: xp.next - xp.into, level: xp.level + 1 })} />
  </section>;
}
