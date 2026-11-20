import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Picker, SaveState, Segmented, SettingRow, Switch, Tabs, useAutosave } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useTimer } from "../../context/TimerContext";
import { GOALS, goalKeyOf } from "../../utils/goals";
import { isLowData, setLowData } from "../../utils/lowData";
import { useInstall } from "../../utils/offline";
import { applyTextSize, currentTextSize, textSizes } from "../../utils/appearance";
import { detectTimeZone, timeZoneList } from "../../utils/timeZone";
import AccountSection from "../../components/profile/AccountSection";
import Avatar, { AVATAR_KEYS, AVATAR_LABELS } from "../../components/profile/Avatar";
import { t } from "../../i18n";

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

  return <div className="grid gap-4">
    <div className="grid gap-2">
      <span className="font-semibold">Profile picture</span>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3" role="radiogroup" aria-label="Profile picture">
        {AVATAR_KEYS.map((key) => <label className="relative flex min-h-16 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-input p-3 text-center has-[input:checked]:border-primary has-[input:checked]:ring-2 has-[input:checked]:ring-ring [&_input]:m-0 [&_input]:size-4 [&_input]:accent-primary [&>span:last-child]:text-sm" key={key}>
          <input type="radio" name="avatar" value={key} checked={avatar === key} onChange={() => selectAvatar(key)} />
          <Avatar avatar={key} size={56} />
          <span>{AVATAR_LABELS[key]}</span>
        </label>)}
        <label className="relative flex min-h-16 cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-input p-3 text-center has-[input:checked]:border-primary has-[input:checked]:ring-2 has-[input:checked]:ring-ring [&_input]:m-0 [&_input]:size-4 [&_input]:accent-primary [&>span:last-child]:text-sm">
          <input type="radio" name="avatar" value="initials" checked={avatar === null} onChange={() => selectAvatar(null)} />
          <Avatar name={user?.name} size={56} />
          <span>Use my initials</span>
        </label>
      </div>
    </div>
    <div>
      <SettingRow label="Time zone" help="Your streak and daily goal change over at midnight here.">
        <Picker label="Time zone" value={zone} onChange={saveZone} options={timeZoneList(zone).map((name) => ({ value: name, label: name.replace(/_/g, " ") }))} />
      </SettingRow>
      <AccountSection />
    </div>
  </div>;
}

function AppearanceTab() {
  const [textSize, setTextSize] = useState(currentTextSize);
  const [lowData, setLowDataState] = useState(isLowData);
  const installer = useInstall();
  return <div>
    <SettingRow label="Text size">
      <Segmented label="Text size" value={textSize} onChange={(value) => { setTextSize(value); applyTextSize(value); }} options={textSizes.map((item) => ({ value: item.key, label: item.name }))} />
    </SettingRow>
    <SettingRow label="Use less data" help="Smaller pictures and nothing loaded ahead. Saved on this device.">
      <Switch label="Use less data" value={lowData} onChange={(on) => { setLowDataState(on); setLowData(on); }} />
    </SettingRow>
    <SettingRow label="Install Catalyst" help={installer.installed ? "Catalyst is installed on this device." : installer.canInstall ? "Put it on your home screen." : "In your browser menu, choose Install app."}>
      {!installer.installed && installer.canInstall && <Button variant="secondary" onClick={installer.install}>Install</Button>}
    </SettingRow>
  </div>;
}

function NotificationsTab({ save }) {
  const { user, updatePreferences } = useAuth();
  const [on, setOn] = useState({ review: user.notify?.review !== false, lesson: user.notify?.lesson !== false });
  const toggle = async (key, value) => {
    setOn((current) => ({ ...current, [key]: value }));
    if (!(await save(() => updatePreferences({ notify: { [key]: value } })))) setOn((current) => ({ ...current, [key]: !value }));
  };
  return <div>
    <SettingRow label="Review reminders" help="A message when flashcards or mistakes are due."><Switch label="Review reminders" value={on.review} onChange={(v) => toggle("review", v)} /></SettingRow>
    <SettingRow label="New lesson messages" help="A message when a new lesson is published."><Switch label="New lesson messages" value={on.lesson} onChange={(v) => toggle("lesson", v)} /></SettingRow>
    <p className="mt-3 mb-0 text-sm text-muted-foreground">Replies to problems you report always arrive.</p>
  </div>;
}

function StudyTab({ save }) {
  const { user, updatePreferences } = useAuth();
  const { lengths, setLengths } = useTimer();
  const [extra, setExtra] = useState(String(user?.extraTime || 0));
  const [goal, setGoal] = useState(() => goalKeyOf(user?.dailyGoal));
  const [week, setWeek] = useState(String(user?.weeklyGoal?.days || 0));
  const [examDate, setExamDate] = useState(() => (user?.examDate ? String(user.examDate).slice(0, 10) : ""));

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

  return <div>
    <SettingRow label="Focus length" help="Used when you start the timer without choosing. Saved on this device.">
      <Picker label="Focus length" value={String(lengths.work)} onChange={(v) => setLengths({ work: Number(v), break: lengths.break })} options={minuteOptions(WORK_MINUTES, lengths.work)} />
    </SettingRow>
    <SettingRow label="Break length">
      <Picker label="Break length" value={String(lengths.break)} onChange={(v) => setLengths({ work: lengths.work, break: Number(v) })} options={minuteOptions(BREAK_MINUTES, lengths.break)} />
    </SettingRow>
    <SettingRow label="Extra time on timed quizzes" help="Added to the time limit. Untimed practice is always available.">
      <Segmented label="Extra time" value={extra} onChange={saveExtra} options={EXTRA_TIME} />
    </SettingRow>
    <SettingRow label="Daily goal" help="Your streak counts any study day. One rest day never breaks it.">
      <Picker label="Daily goal" value={goal} onChange={saveGoal} options={GOALS.map((item) => ({ value: item.key, label: item.label }))} />
    </SettingRow>
    <SettingRow label="Weekly goal" help="The other days are rest days.">
      <Picker label="Weekly goal" value={week} onChange={saveWeek} options={WEEK_GOALS} />
    </SettingRow>
    <SettingRow label="Exam date" help="Home shows Today's plan counting down to it.">
      <span className="inline-flex items-center gap-2">
        <input type="date" aria-label="Exam date" value={examDate} onChange={(event) => saveExam(event.target.value)}
          className="min-h-11 rounded-pill border border-input bg-card px-4 font-sans text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
        {examDate && <Button variant="tertiary" size="sm" onClick={() => saveExam("")}>Clear</Button>}
      </span>
    </SettingRow>
    <SettingRow label="My exams" help="Add several exams to see a countdown on Home."><Button as={Link} to="/exams" variant="secondary">Manage</Button></SettingRow>
  </div>;
}

const TAB_IDS = ["account", "appearance", "notifications", "study"];

// One home for every setting. The open tab is kept in the address (?tab=appearance). Everything saves by itself.
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const tab = TAB_IDS.includes(asked) ? asked : "account";
  const { status, run } = useAutosave();
  const labels = { account: t("settings.account"), appearance: t("settings.appearance"), notifications: "Alerts", study: t("settings.study") };
  const panels = {
    account: <AccountTab save={run} />,
    appearance: <AppearanceTab />,
    notifications: <NotificationsTab save={run} />,
    study: <StudyTab save={run} />
  };
  return <div className="mx-auto grid max-w-3xl gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="m-0 text-3xl leading-tight font-bold">{t("settings.title")}</h1>
      <SaveState status={status} />
    </div>
    <Tabs label="Settings" value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} tabs={TAB_IDS.map((id) => ({ id, label: labels[id], panel: panels[id] }))} />
  </div>;
}
