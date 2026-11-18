import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, Copy, MoreHorizontal, Share2, UserMinus, UserPlus, X } from "lucide-react";
import { api } from "../../api/client";
import Avatar from "../../components/profile/Avatar";
import { Button, DropdownMenu, EditableTitle, Popover, SettingRow, Switch, Tooltip, useToast } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import { t } from "../../i18n";

const iconButton = "grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
const h2 = "m-0 text-xl font-semibold";
const listRow = "flex items-center gap-3 border-b border-border py-3 last:border-b-0";

// Friends: your code as a chip with copy and share, "Add friend" in a small popover, and the friends list first.
// Other students only ever see a display name and an avatar. Nobody can look students up by name.
export default function Friends() {
  const { toast } = useToast();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => (params.get("code") || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 12).toUpperCase()); // from an invite link
  const [adding, setAdding] = useState(Boolean(params.get("code")));
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.getFriends()
      .then(({ data }) => setState({ loading: false, error: "", data }))
      .catch((error) => setState({ loading: false, error: error.message, data: null }));
  }, []);
  useEffect(load, [load]);

  // Runs one change, then reloads the lists. A failure is shown at the top of the page.
  async function run(action, success) {
    setBusy(true);
    setProblem("");
    try {
      const response = await action();
      if (success) toast({ tone: "success", message: response?.message || success });
      load();
      return true;
    } catch (error) {
      setProblem(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addFriend() {
    if (await run(() => api.sendFriendRequest(code.trim()), t("friends.sent"))) { setCode(""); setAdding(false); }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(state.data.me.code);
      toast({ tone: "success", message: t("friends.copied") });
    } catch {
      toast({ tone: "warning", message: t("friends.copyFailed") });
    }
  }

  async function shareInvite() {
    const url = `${window.location.origin}/s/i/${state.data.me.code}`;
    try {
      if (navigator.share) await navigator.share({ title: t("friends.inviteTitle"), text: t("friends.inviteText"), url });
      else { await navigator.clipboard.writeText(url); toast({ tone: "success", message: "Invite link copied" }); }
    } catch (error) {
      if (error?.name !== "AbortError") toast({ tone: "warning", message: t("friends.copyFailed") });
    }
  }

  if (state.loading && !state.data) return <div className="content student-page"><Loading /></div>;
  if (state.error && !state.data) return <div className="content student-page"><ErrorState message={state.error} onRetry={load} /></div>;
  const { me, friends, incoming, outgoing } = state.data;
  const person = (item) => <Avatar avatar={item.avatar} name={item.name} size={36} />;

  return <div className="content mx-auto grid max-w-3xl gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="m-0 text-3xl leading-tight font-bold">{t("friends.title")}</h1>
        <p className="m-0 text-muted-foreground">{t("friends.intro")}</p>
      </div>
      <Popover open={adding} onOpenChange={setAdding} trigger={<Button icon={UserPlus}>Add friend</Button>}>
        <div className="grid gap-3">
          <label className="grid gap-1.5 font-semibold">{t("friends.theirCode")}
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" maxLength={12} autoFocus
              onKeyDown={(event) => { if (event.key === "Enter" && code.trim().length >= 6 && !busy) addFriend(); }}
              className="min-h-11 w-full rounded-md border border-input bg-card px-3 font-sans text-base tracking-wide text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
          </label>
          <Button disabled={busy || code.trim().length < 6} onClick={addFriend}>{t("friends.send")}</Button>
        </div>
      </Popover>
    </div>

    {problem && <p className="m-0 flex items-center gap-2 text-destructive" role="alert"><AlertCircle size={16} aria-hidden="true" />{problem}
      <button type="button" aria-label="Dismiss error" onClick={() => setProblem("")} className="ml-auto grid size-8 cursor-pointer place-items-center rounded-pill border-0 bg-transparent hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><X size={16} aria-hidden="true" /></button></p>}

    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">{t("friends.yourCode")}</span>
      <span className="rounded-pill bg-muted px-3 py-1 font-semibold tracking-wide" aria-label={t("friends.yourCode")}>{me.code}</span>
      <Tooltip label={t("friends.copy")}><button type="button" aria-label={t("friends.copy")} className={iconButton} onClick={copyCode}><Copy size={18} aria-hidden="true" /></button></Tooltip>
      <Tooltip label="Share invite link"><button type="button" aria-label="Share invite link" className={iconButton} onClick={shareInvite}><Share2 size={18} aria-hidden="true" /></button></Tooltip>
    </div>

    {incoming.length > 0 && <section className="grid gap-2" aria-labelledby="requests-title">
      <h2 id="requests-title" className={h2}>{t("friends.requests")}</h2>
      <ul className="m-0 grid list-none p-0">
        {incoming.map((item) => <li key={item.id} className={listRow}>
          {person(item)}<span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
          <Button size="sm" disabled={busy} onClick={() => run(() => api.acceptFriend(item.id), t("friends.accepted"))}>{t("friends.accept")}</Button>
          <Button size="sm" variant="tertiary" disabled={busy} title={`${t("friends.decline")} ${item.name}`} onClick={() => run(() => api.removeFriend(item.id))}>{t("friends.decline")}</Button>
        </li>)}
      </ul>
    </section>}

    <section className="grid gap-2" aria-labelledby="friends-title">
      <h2 id="friends-title" className={h2}>{t("friends.list")}</h2>
      {friends.length === 0
        ? <p className="m-0 text-muted-foreground">{t("friends.empty")}</p>
        : <ul className="m-0 grid list-none p-0">
          {friends.map((item) => <li key={item.id} className={listRow}>
            {person(item)}<span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
            <DropdownMenu trigger={<Button variant="tertiary" size="sm" aria-label={`Options for ${item.name}`}><MoreHorizontal size={18} aria-hidden="true" /></Button>}
              items={[{ label: t("friends.remove"), icon: UserMinus, danger: true, onSelect: () => run(() => api.removeFriend(item.id), t("friends.removed")) }]} />
          </li>)}
        </ul>}
      <div className="flex gap-2"><Button as={Link} to="/challenges" variant="tertiary" size="sm">{t("challenges.title")}</Button><Button as={Link} to="/circles" variant="tertiary" size="sm">{t("circles.title")}</Button></div>
    </section>

    {outgoing.length > 0 && <section className="grid gap-2" aria-labelledby="waiting-title">
      <h2 id="waiting-title" className={h2}>{t("friends.waiting")}</h2>
      <ul className="m-0 grid list-none p-0">
        {outgoing.map((item) => <li key={item.id} className={listRow}>
          {person(item)}<span className="min-w-0 flex-1 truncate font-semibold">{item.name}</span>
          <Button size="sm" variant="tertiary" disabled={busy} title={`${t("friends.cancel")} ${item.name}`} onClick={() => run(() => api.removeFriend(item.id))}>{t("friends.cancel")}</Button>
        </li>)}
      </ul>
    </section>}

    <section className="grid" aria-labelledby="privacy-title">
      <h2 id="privacy-title" className={h2}>{t("friends.privacy")}</h2>
      <SettingRow label={t("friends.displayName")} help={t("friends.displayHint").replace("{name}", me.defaultName)}>
        <EditableTitle label="Display name" value={me.displayName} placeholder={me.defaultName} allowEmpty onSave={(name) => run(() => api.updateFriendSettings({ displayName: name }), t("friends.saved"))} />
      </SettingRow>
      <SettingRow label={t("friends.hide")} help={t("friends.hideHint")}>
        <Switch label={t("friends.hide")} value={me.hideActivity} disabled={busy} onChange={(on) => run(() => api.updateFriendSettings({ hideActivity: on }), t("friends.saved"))} />
      </SettingRow>
    </section>
  </div>;
}
