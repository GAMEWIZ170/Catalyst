import { useSearchParams } from "react-router-dom";
import { Bookmark, CalendarDays, ChevronRight, BarChart3, Settings, UserPlus } from "lucide-react";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { ProgressBar } from "@astryxdesign/core/ProgressBar";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import AchievementsPanel from "../components/AchievementsPanel";
import AstryxTheme from "../components/astryx/AstryxTheme";
import { useXp } from "../components/XpBits";
import { t } from "../i18n";
import "../styles/settings-astryx.css";

const LINKS = [
  { to: "/progress", label: "me.progress", icon: BarChart3 },
  { to: "/exams", label: "me.exams", icon: CalendarDays },
  { to: "/friends", label: "me.friends", icon: UserPlus },
  { to: "/saved", label: "me.saved", icon: Bookmark },
  { to: "/settings", label: "me.settings", icon: Settings }
];

// The home for everything about the student. A compact header (picture, name, level bar inline), then one grouped list.
export default function Me() {
  const { user } = useAuth();
  const { xp } = useXp(Boolean(user), "me");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "achievements" ? "achievements" : "overview";
  const percent = xp ? Math.round((xp.into / xp.next) * 100) : 0;
  return <AstryxTheme>
    <div className="content student-page me-astryx">
      <VStack gap={5}>
        <HStack gap={3} align="center">
          <Avatar avatar={user?.avatar} name={user?.name} size={52} />
          <VStack gap={1} style={{ flex: 1, minWidth: 0 }}>
            <Heading level={1}>{user?.name}</Heading>
            {xp && <HStack gap={3} align="center">
              <Text weight="semibold">{t("xp.level").replace("{level}", xp.level)}</Text>
              <div style={{ flex: 1, maxWidth: 220 }}><ProgressBar label={t("xp.toNext").replace("{xp}", xp.next - xp.into).replace("{level}", xp.level + 1)} isLabelHidden value={percent} /></div>
              <Text type="supporting" color="secondary">{t("xp.total").replace("{xp}", xp.xp)}</Text>
            </HStack>}
          </VStack>
        </HStack>
        <TabList role="tablist" value={tab} onChange={(next) => setParams(next === "overview" ? {} : { tab: next }, { replace: true })} hasDivider>
          <Tab value="overview" label={t("me.tabOverview")} panelId="me-panel" />
          <Tab value="achievements" label={t("me.tabAchievements")} panelId="me-panel" />
        </TabList>
        <div id="me-panel" role="tabpanel">
          {tab === "overview"
            ? <List hasDividers aria-label={t("me.title")}>
              {LINKS.map(({ to, label, icon: Icon }) => <ListItem key={to} label={t(label)} href={to} startContent={<Icon size={20} aria-hidden="true" />} endContent={<ChevronRight size={18} aria-hidden="true" />} />)}
            </List>
            : <AchievementsPanel />}
        </div>
      </VStack>
    </div>
  </AstryxTheme>;
}
