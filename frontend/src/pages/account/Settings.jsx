import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Picker, SaveState, Segmented, SettingRow, Switch, Tabs, useAutosave } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { isLowData, setLowData } from "../../utils/lowData";
import { useInstall } from "../../utils/offline";
import { applyTextSize, currentTextSize, textSizes } from "../../utils/appearance";
import { detectTimeZone, timeZoneList } from "../../utils/timeZone";
import AccountSection from "../../components/profile/AccountSection";
import Avatar, { AVATAR_KEYS, AVATAR_LABELS } from "../../components/profile/Avatar";
import { t } from "../../i18n";

// Each row has its label on the left and its control on the right. Every change saves by itself; there are no Save buttons.
// A square card per picture: the radio sits in the top-left corner so the picture and its name stay centred.
const PICTURE_CARD = "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-input p-2 text-center transition-colors hover:bg-muted has-[input:checked]:border-primary has-[input:checked]:ring-2 has-[input:checked]:ring-ring [&_input]:absolute [&_input]:top-2 [&_input]:left-2 [&_input]:m-0 [&_input]:size-4 [&_input]:accent-primary [&>span:last-child]:text-xs [&>span:last-child]:leading-tight";

function ProfilePicture({ save }) {
  const { user, updateAvatar } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar || null);

  const selectAvatar = async (value) => {
    const before = avatar;
    setAvatar(value);
    if (!(await save(() => updateAvatar(value)))) setAvatar(before);
  };

  return <div className="grid gap-2">
    <span className="font-semibold">Profile picture</span>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3" role="radiogroup" aria-label="Profile picture">
      {AVATAR_KEYS.map((key) => <label className={PICTURE_CARD} key={key}>
        <input type="radio" name="avatar" value={key} checked={avatar === key} onChange={() => selectAvatar(key)} />
        <Avatar avatar={key} size={48} />
        <span>{AVATAR_LABELS[key]}</span>
      </label>)}
      <label className={PICTURE_CARD}>
        <input type="radio" name="avatar" value="initials" checked={avatar === null} onChange={() => selectAvatar(null)} />
        <Avatar name={user?.name} size={48} />
        <span>Use my initials</span>
      </label>
    </div>
  </div>;
}

function AccountTab({ save }) {
  const { user, updatePreferences } = useAuth();
  const [zone, setZone] = useState(user?.timeZone || detectTimeZone());

  const saveZone = async (value) => {
    const before = zone;
    setZone(value);
    if (!(await save(() => updatePreferences({ timeZone: value })))) setZone(before);
  };

  return <div>
    <SettingRow label="Time zone" help="Your streak and daily goal change over at midnight here.">
      <Picker label="Time zone" value={zone} onChange={saveZone} options={timeZoneList(zone).map((name) => ({ value: name, label: name.replace(/_/g, " ") }))} />
    </SettingRow>
    <AccountSection />
  </div>;
}

function AppearanceTab({ save }) {
  const [textSize, setTextSize] = useState(currentTextSize);
  const [lowData, setLowDataState] = useState(isLowData);
  const installer = useInstall();
  return <div className="grid gap-4">
    <ProfilePicture save={save} />
    <div>
      <SettingRow label="Text size">
        <Segmented label="Text size" value={textSize} onChange={(value) => { setTextSize(value); applyTextSize(value); }} options={textSizes.map((item) => ({ value: item.key, label: item.name }))} />
      </SettingRow>
      <SettingRow label="Use less data" help="Smaller pictures and nothing loaded ahead. Saved on this device.">
        <Switch label="Use less data" value={lowData} onChange={(on) => { setLowDataState(on); setLowData(on); }} />
      </SettingRow>
      <SettingRow label="Install Catalyst" help={installer.installed ? "Catalyst is installed on this device." : installer.canInstall ? "Put it on your home screen." : "In your browser menu, choose Install app."}>
        {!installer.installed && installer.canInstall && <Button variant="secondary" onClick={installer.install}>Install</Button>}
      </SettingRow>
    </div>
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

const TAB_IDS = ["account", "appearance", "notifications"];

// One home for every setting. The open tab is kept in the address (?tab=appearance). Everything saves by itself.
export default function Settings() {
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab");
  const tab = TAB_IDS.includes(asked) ? asked : "account";
  const { status, run } = useAutosave();
  const labels = { account: t("settings.account"), appearance: t("settings.appearance"), notifications: "Alerts" };
  const panels = {
    account: <AccountTab save={run} />,
    appearance: <AppearanceTab save={run} />,
    notifications: <NotificationsTab save={run} />
  };
  return <div className="mx-auto grid max-w-3xl gap-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="m-0 text-3xl leading-tight font-bold">{t("settings.title")}</h1>
      <SaveState status={status} />
    </div>
    <Tabs label="Settings" value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} tabs={TAB_IDS.map((id) => ({ id, label: labels[id], panel: panels[id] }))} />
  </div>;
}
