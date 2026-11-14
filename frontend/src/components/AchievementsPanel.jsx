import { useEffect, useState } from "react";
import { Award, Lock } from "lucide-react";
import { api } from "../api/client";
import { Skeleton, SkeletonGroup } from "./ui";
import { t } from "../i18n";

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
  return <div className="achievements">
    <p className="muted">{t("achievements.count").replace("{earned}", state.earned).replace("{total}", state.total)}</p>
    <ul className="achievement-list">
      {sorted.map((item) => <li key={item.key} className={`achievement${item.unlockedAt ? " achievement--earned" : ""}`}>
        {item.unlockedAt ? <Award size={22} aria-hidden="true" /> : <Lock size={22} aria-hidden="true" />}
        <div>
          <strong>{item.title}</strong>
          <p>{item.text}</p>
          {item.unlockedAt && <span className="muted">{t("achievements.earned").replace("{date}", new Date(item.unlockedAt).toLocaleDateString())}</span>}
        </div>
      </li>)}
    </ul>
  </div>;
}
