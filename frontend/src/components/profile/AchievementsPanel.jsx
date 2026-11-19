import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { Progress, Skeleton, SkeletonGroup } from "../ui";
import AchievementBadge from "./AchievementBadge";
import { t } from "../../i18n";

// The Achievements tab on Me: earned ones first, then the ones still to find. Hidden ones show as locked until earned.
export default function AchievementsPanel() {
  const [state, setState] = useState({ loading: true, error: false, data: [], earned: 0, total: 0 });

  useEffect(() => {
    let current = true;
    api.getAchievements()
      .then((payload) => { if (current) setState({ loading: false, error: false, data: payload.data, earned: payload.earned, total: payload.total }); })
      .catch(() => { if (current) setState((s) => ({ ...s, loading: false, error: true })); });
    return () => { current = false; };
  }, []);

  if (state.loading) return <SkeletonGroup label="Loading achievements"><Skeleton /><Skeleton /><Skeleton /></SkeletonGroup>;
  if (state.error) return <p role="alert">{t("achievements.error")}</p>;
  const sorted = [...state.data].sort((a, b) => Number(Boolean(b.unlockedAt)) - Number(Boolean(a.unlockedAt)));
  return <div className="mx-auto grid max-w-3xl gap-4">
    <div className="grid gap-2">
      <p className="m-0 font-semibold">{t("achievements.count").replace("{earned}", state.earned).replace("{total}", state.total)}</p>
      <Progress value={state.total ? (state.earned / state.total) * 100 : 0} label="Achievements earned" />
    </div>
    <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
      {sorted.map((item) => <li key={item.key} className={`flex items-center gap-3 rounded-lg border border-border p-3 ${item.unlockedAt ? "bg-card" : "opacity-80"}`}>
        <AchievementBadge item={item} />
        <div className="min-w-0">
          <strong className="block">{item.title}</strong>
          <p className="m-0 text-sm text-muted-foreground">{item.text}</p>
          {item.unlockedAt && <span className="text-sm text-muted-foreground">{t("achievements.earned").replace("{date}", new Date(item.unlockedAt).toLocaleDateString())}</span>}
        </div>
      </li>)}
    </ul>
  </div>;
}
