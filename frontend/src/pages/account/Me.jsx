import { Link, useSearchParams } from "react-router-dom";
import { Bookmark, CalendarDays, ChevronRight, BarChart3, Settings, UserPlus } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../../components/profile/Avatar";
import AchievementsPanel from "../../components/profile/AchievementsPanel";
import { Tabs } from "../../components/ui";
import { t } from "../../i18n";

const LINKS = [
  { to: "/progress", label: "me.progress", icon: BarChart3 },
  { to: "/exams", label: "me.exams", icon: CalendarDays },
  { to: "/friends", label: "me.friends", icon: UserPlus },
  { to: "/saved", label: "me.saved", icon: Bookmark },
  { to: "/settings", label: "me.settings", icon: Settings }
];

// The home for everything about the student: a compact header (picture, name), then one grouped list of places.
export default function Me() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "achievements" ? "achievements" : "overview";
  const overview = <ul aria-label={t("me.title")} className="m-0 grid list-none divide-y divide-border overflow-hidden rounded-lg border border-border bg-card p-0">
    {LINKS.map(({ to, label, icon: Icon }) => <li key={to}>
      <Link to={to} className="flex min-h-14 items-center gap-3 px-4 text-foreground no-underline transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <Icon size={20} className="text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 font-semibold">{t(label)}</span>
        <ChevronRight size={18} className="text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>)}
  </ul>;
  return <div className="mx-auto grid max-w-3xl gap-5">
    <div className="flex items-center gap-3">
      <Avatar avatar={user?.avatar} name={user?.name} size={52} />
      <h1 className="m-0 min-w-0 flex-1 truncate text-3xl leading-tight font-bold">{user?.name}</h1>
    </div>
    <Tabs label="Me" value={tab} onChange={(next) => setParams(next === "overview" ? {} : { tab: next }, { replace: true })} tabs={[
      { id: "overview", label: t("me.tabOverview"), panel: overview },
      { id: "achievements", label: t("me.tabAchievements"), panel: <AchievementsPanel /> }
    ]} />
  </div>;
}
