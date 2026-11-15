import { Link, useSearchParams } from "react-router-dom";
import { Bookmark, CalendarDays, ChevronRight, BarChart3, Settings, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import AchievementsPanel from "../components/AchievementsPanel";
import { Card, Tabs } from "../components/ui";
import { LevelCard, useXp } from "../components/XpBits";
import { t } from "../i18n";

const LINKS = [
  { to: "/progress", label: "me.progress", icon: BarChart3 },
  { to: "/exams", label: "me.exams", icon: CalendarDays },
  { to: "/friends", label: "me.friends", icon: UserPlus },
  { to: "/saved", label: "me.saved", icon: Bookmark },
  { to: "/settings", label: "me.settings", icon: Settings }
];

// The home for everything about the student: progress, saved items, profile and account settings.
export default function Me() {
  const { user } = useAuth();
  const { xp } = useXp(Boolean(user), "me");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "achievements" ? "achievements" : "overview";
  const overview = <>
    <LevelCard xp={xp} />
    <nav className="me-links" aria-label={t("me.title")}>
      {LINKS.map(({ to, label, icon: Icon }) => <Card as={Link} className="me-link" to={to} key={to}>
        <Icon size={22} aria-hidden="true" />
        <span>{t(label)}</span>
        <ChevronRight size={18} aria-hidden="true" />
      </Card>)}
    </nav>
  </>;
  return <div className="content student-page me-page">
    <header className="me-header">
      <Avatar avatar={user?.avatar} name={user?.name} size={64} />
      <div>
        <h1>{t("me.title")}</h1>
        <p className="muted">{user?.name}</p>
      </div>
    </header>
    <Tabs label={t("me.title")} value={tab} onChange={(next) => setParams(next === "overview" ? {} : { tab: next }, { replace: true })} tabs={[
      { id: "overview", label: t("me.tabOverview"), panel: overview },
      { id: "achievements", label: t("me.tabAchievements"), panel: <AchievementsPanel /> }
    ]} />
  </div>;
}
