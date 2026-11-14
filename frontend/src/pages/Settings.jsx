import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GOALS, goalKeyOf } from "../utils/goals";

const WEEK_GOALS = [{ days: 0, label: "No weekly goal" }, { days: 3, label: "3 days a week" }, { days: 4, label: "4 days a week" }, { days: 5, label: "5 days a week" }, { days: 6, label: "6 days a week" }];
import { Button, Checkbox, SelectField, Tabs, TextField } from "../components/ui";
import { isLowData, setLowData } from "../utils/lowData";
import { useInstall } from "../utils/offline";
import { applyPalette, applyTextSize, currentPalette, currentTextSize, palettes, textSizes } from "../utils/appearance";
import { detectTimeZone, timeZoneList } from "../utils/timeZone";
import AccountSection from "../components/AccountSection";
import Avatar, { AVATAR_KEYS, AVATAR_LABELS } from "../components/Avatar";
import { useTimer } from "../context/TimerContext";
import { Link } from "react-router-dom";
import { t } from "../i18n";

function AccountTab() {
  const { user, updateAvatar, updatePreferences } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [status, setStatus] = useState("");
  const [zone, setZone] = useState(user?.timeZone || detectTimeZone());
  const [zoneStatus, setZoneStatus] = useState("");

  async function selectAvatar(value) {
    setAvatar(value);
    setStatus("");
    try {
      await updateAvatar(value);
      setStatus("Saved");
    } catch (error) {
      setAvatar(user?.avatar || null);
      setStatus(error.message);
    }
  }

  async function saveZone(value) {
    setZone(value);
    setZoneStatus("");
    try {
      await updatePreferences({ timeZone: value });
      setZoneStatus("Saved");
    } catch (error) {
      setZone(user?.timeZone || detectTimeZone());
      setZoneStatus(error.message);
    }
  }

  return <>
    <section className="settings-section" aria-labelledby="avatar-heading">
      <h2 id="avatar-heading">Profile picture</h2>
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
      <p className="settings-status" aria-live="polite">{status}</p>
    </section>
    <section className="settings-section" aria-labelledby="zone-heading">
      <h2 id="zone-heading">Time zone</h2>
      <SelectField label="Your time zone" value={zone} onChange={(event) => saveZone(event.target.value)}>
        {timeZoneList(zone).map((name) => <option key={name} value={name}>{name.replace(/_/g, " ")}</option>)}
      </SelectField>
      <p className="muted settings-help">Your streak and daily goal change over at midnight in this time zone. Catalyst picked it from your browser.</p>
      <p className="settings-status" aria-live="polite">{zoneStatus}</p>
    </section>
    <AccountSection />
  </>;
}

function AppearanceTab() {
  const [palette, setPalette] = useState(currentPalette);
  const [textSize, setTextSize] = useState(currentTextSize);
  const [lowData, setLowDataState] = useState(isLowData);
  const installer = useInstall();

  return <>
    <section className="settings-section" aria-labelledby="theme-heading">
      <h2 id="theme-heading">Colour theme</h2>
      <div className="settings-radio-grid" role="radiogroup" aria-label="Colour theme">
        {palettes.map((item) => <label className="palette-card" data-palette-preview={item.key} key={item.key}>
          <input type="radio" name="palette" value={item.key} checked={palette === item.key} onChange={() => { setPalette(item.key); applyPalette(item.key); }} />
          <span className="palette-swatch" aria-hidden="true" />
          <span>{item.name}</span>
        </label>)}
      </div>
      <p className="muted settings-help">Use the gear button in the top bar to switch between light and dark.</p>
    </section>
    <section className="settings-section" aria-labelledby="text-heading">
      <h2 id="text-heading">Text size</h2>
      <div className="settings-radio-grid" role="radiogroup" aria-label="Text size">
        {textSizes.map((item) => <label className="palette-card text-size-card" key={item.key}>
          <input type="radio" name="text-size" value={item.key} checked={textSize === item.key} onChange={() => { setTextSize(item.key); applyTextSize(item.key); }} />
          <span className={`text-size-sample text-size-sample--${item.key}`} aria-hidden="true">Aa</span>
          <span>{item.name}</span>
        </label>)}
      </div>
      <p className="muted settings-help">Animations follow your device's reduced-motion setting.</p>
    </section>
    <section className="settings-section" aria-labelledby="lowdata-heading">
      <h2 id="lowdata-heading">Low-data mode</h2>
      <Checkbox label="Use less data" hint="Smaller pictures, no video preview picture, and nothing loaded ahead of time. It turns on by itself when your browser's data saver is on. Saved on this device only." checked={lowData}
        onChange={(event) => { setLowDataState(event.target.checked); setLowData(event.target.checked); }} />
    </section>
    <section className="settings-section" aria-labelledby="install-heading">
      <h2 id="install-heading">Install Catalyst</h2>
      {installer.installed
        ? <p className="muted settings-help">Catalyst is installed on this device.</p>
        : <>
          <p className="muted settings-help">Put Catalyst on your home screen. It opens like an app, and lessons you have opened stay available without internet.</p>
          {installer.canInstall
            ? <Button variant="secondary" onClick={installer.install}>Install the app</Button>
            : <p className="muted settings-help">In your browser menu, choose Install app or Add to Home screen.</p>}
        </>}
    </section>
  </>;
}

function NotificationsTab() {
  const { user, updatePreferences } = useAuth();
  const [status, setStatus] = useState("");

  async function toggle(key, value) {
    setStatus("");
    try {
      await updatePreferences({ notify: { [key]: value } });
      setStatus("Saved");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return <section className="settings-section" aria-labelledby="notify-heading">
    <h2 id="notify-heading">In-app messages</h2>
    <Checkbox label="Review reminders" hint="A message when flashcards or mistakes are due." checked={user.notify?.review !== false} onChange={(event) => toggle("review", event.target.checked)} />
    <Checkbox label="New lesson messages" hint="A message when a new lesson is published." checked={user.notify?.lesson !== false} onChange={(event) => toggle("lesson", event.target.checked)} />
    <p className="muted settings-help">Replies to problems you report always arrive.</p>
    <p className="settings-status" aria-live="polite">{status}</p>
  </section>;
}

const EXTRA_TIME = [{ value: 0, label: "None" }, { value: 25, label: "25% more time" }, { value: 50, label: "50% more time" }, { value: 100, label: "Double time" }];

function TimerLengths() {
  const { lengths, setLengths } = useTimer();
  const [work, setWork] = useState(String(lengths.work));
  const [rest, setRest] = useState(String(lengths.break));
  const [status, setStatus] = useState("");
  function save(event) {
    event.preventDefault();
    setLengths({ work: Number(work), break: Number(rest) });
    setStatus("Saved on this device");
  }
  return <section className="settings-section" aria-labelledby="timer-heading">
    <h2 id="timer-heading">Focus timer</h2>
    <form className="settings-exam" onSubmit={save}>
      <TextField label="Focus minutes" type="number" min="1" max="180" required value={work} onChange={(event) => setWork(event.target.value)} />
      <TextField label="Break minutes" type="number" min="1" max="60" required value={rest} onChange={(event) => setRest(event.target.value)} />
      <Button variant="secondary" type="submit">Save</Button>
    </form>
    <p className="muted settings-help">Start the timer from the top bar. Only minutes you were really active in Catalyst count as focus time, up to 90 a day.</p>
    <p className="settings-status" aria-live="polite">{status}</p>
  </section>;
}

function StudyTab() {
  const { user, updatePreferences } = useAuth();
  const [extra, setExtra] = useState(user?.extraTime || 0);
  const [extraStatus, setExtraStatus] = useState("");

  async function saveExtra(value) {
    const before = extra;
    setExtra(value);
    setExtraStatus("");
    try {
      await updatePreferences({ extraTime: value });
      setExtraStatus("Saved");
    } catch (error) {
      setExtra(before);
      setExtraStatus(error.message);
    }
  }

  const [goal, setGoal] = useState(() => goalKeyOf(user?.dailyGoal));
  const [goalStatus, setGoalStatus] = useState("");
  const [weekDays, setWeekDays] = useState(user?.weeklyGoal?.days || 0);
  const [weekStatus, setWeekStatus] = useState("");
  const [examDate, setExamDate] = useState(() => (user?.examDate ? String(user.examDate).slice(0, 10) : ""));
  const [examStatus, setExamStatus] = useState("");

  async function saveExamDate(event) {
    event.preventDefault();
    setExamStatus("");
    try {
      await updatePreferences({ examDate: examDate || null });
      setExamStatus(examDate ? "Saved. Today's plan is on Home." : "Exam date cleared");
    } catch (error) {
      setExamStatus(error.message);
    }
  }

  async function selectWeek(days) {
    const before = weekDays;
    setWeekDays(days);
    setWeekStatus("");
    try {
      await updatePreferences({ weeklyDays: days });
      setWeekStatus("Saved");
    } catch (error) {
      setWeekDays(before);
      setWeekStatus(error.message);
    }
  }

  async function selectGoal(key) {
    const chosen = GOALS.find((item) => item.key === key);
    const before = goal;
    setGoal(key);
    setGoalStatus("");
    try {
      await updatePreferences({ goalKind: chosen.kind, ...(chosen.minutes ? { goalMinutes: chosen.minutes } : {}) });
      setGoalStatus("Saved");
    } catch (error) {
      setGoal(before);
      setGoalStatus(error.message);
    }
  }

  return <>
    <TimerLengths />
    <section className="settings-section" aria-labelledby="extra-heading">
      <h2 id="extra-heading">Extra time on timed quizzes</h2>
      <SelectField label="Extra time" value={extra} onChange={(event) => saveExtra(Number(event.target.value))}>
        {EXTRA_TIME.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </SelectField>
      <p className="muted settings-help">Added to the time limit when you start a timed quiz. The server keeps the clock. Untimed practice is always available.</p>
      <p className="settings-status" aria-live="polite">{extraStatus}</p>
    </section>
    <section className="settings-section" aria-labelledby="goal-heading">
      <h2 id="goal-heading">Daily goal</h2>
      <div className="settings-radio-grid" role="radiogroup" aria-label="Daily goal">
        {GOALS.map((item) => <label className="palette-card text-size-card" key={item.key}>
          <input type="radio" name="goal" value={item.key} checked={goal === item.key} onChange={() => selectGoal(item.key)} />
          <span>{item.label}</span>
        </label>)}
      </div>
      <p className="muted settings-help">Your streak counts any study day, with or without a goal.</p>
      <p className="settings-status" aria-live="polite">{goalStatus}</p>
    </section>
    <section className="settings-section" aria-labelledby="week-heading">
      <h2 id="week-heading">Weekly goal</h2>
      <div className="settings-radio-grid" role="radiogroup" aria-label="Weekly goal">
        {WEEK_GOALS.map((item) => <label className="palette-card text-size-card" key={item.days}>
          <input type="radio" name="weekly-goal" value={item.days} checked={weekDays === item.days} onChange={() => selectWeek(item.days)} />
          <span>{item.label}</span>
        </label>)}
      </div>
      <p className="muted settings-help">Pick how many days a week you want to study. The other days are rest days. A missed day never takes progress away.</p>
      <p className="settings-status" aria-live="polite">{weekStatus}</p>
    </section>
    <section className="settings-section" aria-labelledby="myexams-heading">
      <h2 id="myexams-heading">My exams</h2>
      <p className="muted settings-help">Add your exams to see a countdown on Home and a plan that counts down to the nearest one.</p>
      <Link className="button button-secondary" to="/exams">Manage my exams</Link>
    </section>
    <section className="settings-section" aria-labelledby="exam-heading">
      <h2 id="exam-heading">Exam date</h2>
      <form className="settings-exam" onSubmit={saveExamDate}>
        <TextField label="Exam date" type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} />
        <Button variant="secondary" type="submit">Save</Button>
      </form>
      <p className="muted settings-help">Catalyst spreads the lessons you have left over the days until your exam and shows Today's plan on Home. Clear the date to turn it off.</p>
      <p className="settings-status" aria-live="polite">{examStatus}</p>
    </section>
  </>;
}

const TAB_IDS = ["account", "appearance", "notifications", "study"];

// One home for every setting. The open tab is kept in the address (?tab=appearance), so links can open it directly.
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const tab = TAB_IDS.includes(asked) ? asked : "account";
  const tabs = [
    { id: "account", label: t("settings.account"), panel: <AccountTab /> },
    { id: "appearance", label: t("settings.appearance"), panel: <AppearanceTab /> },
    { id: "notifications", label: t("settings.notifications"), panel: <NotificationsTab /> },
    { id: "study", label: t("settings.study"), panel: <StudyTab /> }
  ];
  return <div className="content settings-page">
    <div className="section-heading"><h1>{t("settings.title")}</h1></div>
    <Tabs tabs={tabs} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} label={t("settings.tabs")} />
  </div>;
}
