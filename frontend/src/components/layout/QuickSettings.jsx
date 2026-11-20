import { useState } from "react";
import { quickPanel } from "./topbarStyles";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Checkbox, SelectField } from "../ui";
import { applyTextSize, applyTheme, currentTextSize, currentTheme, textSizes } from "../../utils/appearance";
import { isLowData, setLowData } from "../../utils/lowData";
import { t } from "../../i18n";

// The gear panel in the top bar: the settings a student changes often, with a link to the full page.
export default function QuickSettings({ panelRef, onNavigate }) {
  const { user, updatePreferences } = useAuth();
  const [dark, setDark] = useState(() => currentTheme() === "dark");
  const [textSize, setTextSize] = useState(currentTextSize);
  const [lowData, setLowDataState] = useState(isLowData);
  const [problem, setProblem] = useState("");

  async function toggleNotify(key, value) {
    setProblem("");
    try {
      await updatePreferences({ notify: { [key]: value } });
    } catch (error) {
      setProblem(error.message);
    }
  }

  return <div className={quickPanel} id="quick-settings-panel" ref={panelRef} role="dialog" aria-label={t("quick.title")}>
    <h2 className="m-0 text-base">{t("quick.title")}</h2>
    <Checkbox label={t("quick.theme")} checked={dark} onChange={(event) => { setDark(event.target.checked); applyTheme(event.target.checked ? "dark" : "light"); }} />
    <SelectField label={t("quick.text")} value={textSize} onChange={(event) => { setTextSize(event.target.value); applyTextSize(event.target.value); }}>
      {textSizes.map((item) => <option key={item.key} value={item.key}>{item.name}</option>)}
    </SelectField>
    <Checkbox label={t("quick.lowdata")} checked={lowData} onChange={(event) => { setLowDataState(event.target.checked); setLowData(event.target.checked); }} />
    <>
      <Checkbox label={t("quick.notifyReview")} checked={user.notify?.review !== false} onChange={(event) => toggleNotify("review", event.target.checked)} />
      <Checkbox label={t("quick.notifyLesson")} checked={user.notify?.lesson !== false} onChange={(event) => toggleNotify("lesson", event.target.checked)} />
    </>
    {problem && <p className="mt-4 mb-0 min-h-6 font-semibold text-brand-ink" role="alert">{problem}</p>}
    <Link className="inline-flex min-h-11 items-center font-semibold text-brand-ink" to="/settings" onClick={onNavigate}>{t("quick.all")}</Link>
  </div>;
}
