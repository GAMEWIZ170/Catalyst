import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@astryxdesign/core/Button";
import { DateInput } from "@astryxdesign/core/DateInput";
import { Heading } from "@astryxdesign/core/Heading";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { Text } from "@astryxdesign/core/Text";
import { useAuth } from "../context/AuthContext";
import { useTimer } from "../context/TimerContext";
import { GOALS, goalKeyOf } from "../utils/goals";
import { isLowData, setLowData } from "../utils/lowData";
import { useInstall } from "../utils/offline";
import { applyPalette, applyTextSize, currentPalette, currentTextSize, palettes, textSizes } from "../utils/appearance";
import { detectTimeZone, timeZoneList } from "../utils/timeZone";
import AccountSection from "../components/AccountSection";
import AstryxTheme from "../components/astryx/AstryxTheme";
import SettingRow, { SaveState, useAutosave } from "../components/astryx/SettingRow";
import Avatar, { AVATAR_KEYS, AVATAR_LABELS } from "../components/Avatar";
import { t } from "../i18n";
import "../styles/settings-astryx.css";

const WEEK_GOALS = [{ value: "0", label: "No weekly goal" }, ...[3, 4, 5, 6].map((days) => ({ value: String(days), label: `${days} days a week` }))];
const EXTRA_TIME = [{ value: "0", label: "None" }, { value: "25", label: "+25%" }, { value: "50", label: "+50%" }, { value: "100", label: "Double" }];
const WORK_MINUTES = [15, 20, 25, 30, 45, 50, 60, 90];
const BREAK_MINUTES = [5, 10, 15, 20];
const minuteOptions = (list, current) => [...new Set([...list, current])].sort((a, b) => a - b).map((n) => ({ value: String(n), label: `${n} minutes` }));

// Each row has its label on the left and its control on the right. Every change saves by itself; there are no Save buttons.
function AccountTab({ save }) {
  const { user, updateAvatar, updatePreferences } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [zone, setZone] = useState(user?.timeZone || detectTimeZone());

  const selectAvatar = async (value) => {
    const before = avatar;
    setAvatar(value);
    if (!(await save(() => updateAvatar(value)))) setAvatar(before);
  };
  const saveZone = async (value) => {
    const before = zone;
    setZone(value);
    if (!(await save(() => updatePreferences({ timeZone: value })))) setZone(before);
  };

  return <VStack gap={4}>
    <VStack gap={2}>
      <Text weight="semibold">Profile picture</Text>
      <div className="settings-avatar-grid" role="radiogroup" aria-label="Profile picture">
        {AVATAR_KEYS.map((key) => <label className="avatar-option" key={key}>
          <input type="radio" name="avatar" value={key} checked={avatar === key} onChange={() => selectAvatar(key)} />
          <Avatar avatar={key} size={56} />
          <span>{AVATAR_LABELS[key]}</span>
        </label>)}
        <label className="avatar-option">
          <input type="radio" name="avatar" value="initials" checked={avatar === null} onChange={() => selectAvatar(null)} />
          <Avatar name={user?.name} size={56} />
          <span>Use my initials</span>
        </label>
      </div>
    </VStack>
    <VStack gap={0}>
      <SettingRow label="Time zone" help="Your streak and daily goal change over at midnight here.">
        <Selector label="Time zone" isLabelHidden hasSearch value={zone} onChange={saveZone} width={260}
          options={timeZoneList(zone).map((name) => ({ value: name, label: name.replace(/_/g, " ") }))} />
      </SettingRow>
      <AccountSection />
    </VStack>
  </VStack>;
}

function AppearanceTab() {
  const [palette, setPalette] = useState(currentPalette);
  const [textSize, setTextSize] = useState(currentTextSize);
  const [lowData, setLowDataState] = useState(isLowData);
  const installer = useInstall();
  return <VStack gap={4}>
    <VStack gap={2}>
      <Text weight="semibold">Colour theme</Text>
      <div className="settings-radio-grid" role="radiogroup" aria-label="Colour theme">
        {palettes.map((item) => <label className="palette-card" data-palette-preview={item.key} key={item.key}>
          <input type="radio" name="palette" value={item.key} checked={palette === item.key} onChange={() => { setPalette(item.key); applyPalette(item.key); }} />
          <span className="palette-swatch" aria-hidden="true" />
          <span>{item.name}</span>
        </label>)}
      </div>
      <Text type="supporting" color="secondary">Use the gear in the top bar to switch between light and dark.</Text>
    </VStack>
    <VStack gap={0}>
      <SettingRow label="Text size">
        <SegmentedControl label="Text size" value={textSize} onChange={(value) => { setTextSize(value); applyTextSize(value); }}>
          {textSizes.map((item) => <SegmentedControlItem key={item.key} value={item.key} label={item.name} />)}
        </SegmentedControl>
      </SettingRow>
      <SettingRow label="Use less data" help="Smaller pictures and nothing loaded ahead. Saved on this device.">
        <Switch label="Use less data" isLabelHidden value={lowData} onChange={(on) => { setLowDataState(on); setLowData(on); }} />
      </SettingRow>
      <SettingRow label="Install Catalyst" help={installer.installed ? "Catalyst is installed on this device." : installer.canInstall ? "Put it on your home screen." : "In your browser menu, choose Install app."}>
        {!installer.installed && installer.canInstall && <Button label="Install" variant="secondary" onClick={installer.install} />}
      </SettingRow>
    </VStack>
  </VStack>;
}

function NotificationsTab({ save }) {
  const { user, updatePreferences } = useAuth();
  const [on, setOn] = useState({ review: user.notify?.review !== false, lesson: user.notify?.lesson !== false });
  const toggle = async (key, value) => {
    setOn((current) => ({ ...current, [key]: value }));
    if (!(await save(() => updatePreferences({ notify: { [key]: value } })))) setOn((current) => ({ ...current, [key]: !value }));
  };
  return <VStack gap={0}>
    <SettingRow label="Review reminders" help="A message when flashcards or mistakes are due."><Switch label="Review reminders" isLabelHidden value={on.review} onChange={(v) => toggle("review", v)} /></SettingRow>
    <SettingRow label="New lesson messages" help="A message when a new lesson is published."><Switch label="New lesson messages" isLabelHidden value={on.lesson} onChange={(v) => toggle("lesson", v)} /></SettingRow>
    <Text type="supporting" color="secondary">Replies to problems you report always arrive.</Text>
  </VStack>;
}

function StudyTab({ save }) {
  const { user, updatePreferences } = useAuth();
  const { lengths, setLengths } = useTimer();
  const [extra, setExtra] = useState(String(user?.extraTime || 0));
  const [goal, setGoal] = useState(() => goalKeyOf(user?.dailyGoal));
  const [week, setWeek] = useState(String(user?.weeklyGoal?.days || 0));
  const [examDate, setExamDate] = useState(() => (user?.examDate ? String(user.examDate).slice(0, 10) : undefined));

  const keep = (setter, before) => async (ok) => { if (!ok) setter(before); };
  const saveExtra = async (value) => { const before = extra; setExtra(value); keep(setExtra, before)(await save(() => updatePreferences({ extraTime: Number(value) }))); };
  const saveGoal = async (key) => {
    const chosen = GOALS.find((item) => item.key === key);
    const before = goal;
    setGoal(key);
    keep(setGoal, before)(await save(() => updatePreferences({ goalKind: chosen.kind, ...(chosen.minutes ? { goalMinutes: chosen.minutes } : {}) })));
  };
  const saveWeek = async (value) => { const before = week; setWeek(value); keep(setWeek, before)(await save(() => updatePreferences({ weeklyDays: Number(value) }))); };
  const saveExam = async (value) => { const before = examDate; setExamDate(value); keep(setExamDate, before)(await save(() => updatePreferences({ examDate: value || null }))); };

  return <VStack gap={0}>
    <SettingRow label="Focus length" help="Used when you start the timer without choosing. Saved on this device.">
      <Selector label="Focus length" isLabelHidden value={String(lengths.work)} onChange={(v) => setLengths({ work: Number(v), break: lengths.break })} width={160} options={minuteOptions(WORK_MINUTES, lengths.work)} />
    </SettingRow>
    <SettingRow label="Break length">
      <Selector label="Break length" isLabelHidden value={String(lengths.break)} onChange={(v) => setLengths({ work: lengths.work, break: Number(v) })} width={160} options={minuteOptions(BREAK_MINUTES, lengths.break)} />
    </SettingRow>
    <SettingRow label="Extra time on timed quizzes" help="Added to the time limit. Untimed practice is always available.">
      <SegmentedControl label="Extra time" value={extra} onChange={saveExtra}>{EXTRA_TIME.map((item) => <SegmentedControlItem key={item.value} value={item.value} label={item.label} />)}</SegmentedControl>
    </SettingRow>
    <SettingRow label="Daily goal" help="Your streak counts any study day. One rest day never breaks it.">
      <Selector label="Daily goal" isLabelHidden value={goal} onChange={saveGoal} width={220} options={GOALS.map((item) => ({ value: item.key, label: item.label }))} />
    </SettingRow>
    <SettingRow label="Weekly goal" help="The other days are rest days.">
      <Selector label="Weekly goal" isLabelHidden value={week} onChange={saveWeek} width={220} options={WEEK_GOALS} />
    </SettingRow>
    <SettingRow label="Exam date" help="Home shows Today's plan counting down to it.">
      <DateInput label="Exam date" isLabelHidden hasClear value={examDate} onChange={saveExam} width={220} />
    </SettingRow>
    <SettingRow label="My exams" help="Add several exams to see a countdown on Home."><Button label="Manage" variant="secondary" href="/exams" /></SettingRow>
  </VStack>;
}

const TAB_IDS = ["account", "appearance", "notifications", "study"];

// One home for every setting. The open tab is kept in the address (?tab=appearance). Everything saves by itself.
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const tab = TAB_IDS.includes(asked) ? asked : "account";
  const { status, run } = useAutosave();
  const labels = { account: t("settings.account"), appearance: t("settings.appearance"), notifications: "Alerts", study: t("settings.study") };
  return <AstryxTheme>
    <div className="content settings-page settings-astryx">
      <VStack gap={4}>
        <HStack justify="between" align="center" wrap="wrap" gap={2}>
          <Heading level={1}>{t("settings.title")}</Heading>
          <SaveState status={status} />
        </HStack>
        <TabList role="tablist" size="sm" layout="fill" value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} hasDivider>
          {TAB_IDS.map((id) => <Tab key={id} value={id} label={labels[id]} panelId="settings-panel" />)}
        </TabList>
        <div id="settings-panel" role="tabpanel">
          {tab === "account" && <AccountTab save={run} />}
          {tab === "appearance" && <AppearanceTab />}
          {tab === "notifications" && <NotificationsTab save={run} />}
          {tab === "study" && <StudyTab save={run} />}
        </div>
      </VStack>
    </div>
  </AstryxTheme>;
}
