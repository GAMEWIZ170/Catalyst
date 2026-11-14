import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Avatar from "../components/Avatar";
import { Button, Checkbox, TextField, useToast } from "../components/ui";
import { ErrorState, Loading } from "./Courses";
import { t } from "../i18n";

// Friends: a code to give out, a place to type a friend's code, requests, the friend list and privacy choices.
// Other students only ever see a display name and an avatar. Nobody can look students up by name.
export default function Friends() {
  const { toast } = useToast();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.getFriends()
      .then(({ data }) => { setState({ loading: false, error: "", data }); setName(data.me.displayName); })
      .catch((error) => setState({ loading: false, error: error.message, data: null }));
  }, []);
  useEffect(load, [load]);

  // Runs one change, then reloads the lists. A failure is shown next to the form that caused it.
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

  async function addFriend(event) {
    event.preventDefault();
    if (await run(() => api.sendFriendRequest(code.trim()), t("friends.sent"))) setCode("");
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(state.data.me.code);
      toast({ tone: "success", message: t("friends.copied") });
    } catch {
      toast({ tone: "warning", message: t("friends.copyFailed") });
    }
  }

  if (state.loading && !state.data) return <div className="content student-page"><Loading /></div>;
  if (state.error && !state.data) return <div className="content student-page"><ErrorState message={state.error} onRetry={load} /></div>;
  const { me, friends, incoming, outgoing } = state.data;

  return <div className="content student-page friends-page">
    <h1>{t("friends.title")}</h1>
    <p className="muted">{t("friends.intro")}</p>

    <section className="settings-section" aria-labelledby="code-heading">
      <h2 id="code-heading">{t("friends.yourCode")}</h2>
      <p className="friend-code" aria-label={t("friends.yourCode")}>{me.code}</p>
      <Button variant="secondary" onClick={copyCode}>{t("friends.copy")}</Button>
    </section>

    <section className="settings-section" aria-labelledby="add-heading">
      <h2 id="add-heading">{t("friends.add")}</h2>
      <form className="settings-exam" onSubmit={addFriend}>
        <TextField label={t("friends.theirCode")} value={code} onChange={(event) => setCode(event.target.value)} autoCapitalize="characters" autoComplete="off" maxLength={12} required />
        <Button type="submit" disabled={busy || code.trim().length < 6}>{t("friends.send")}</Button>
      </form>
      <p className="settings-status" role="alert">{problem}</p>
    </section>

    {incoming.length > 0 && <section className="settings-section" aria-labelledby="in-heading">
      <h2 id="in-heading">{t("friends.requests")}</h2>
      <ul className="friend-list">
        {incoming.map((item) => <li key={item.id} className="friend-row">
          <Avatar avatar={item.avatar} name={item.name} size={40} />
          <span className="friend-name">{item.name}</span>
          <Button disabled={busy} onClick={() => run(() => api.acceptFriend(item.id), t("friends.accepted"))}>{t("friends.accept")}</Button>
          <Button variant="secondary" disabled={busy} onClick={() => run(() => api.removeFriend(item.id))} aria-label={`${t("friends.decline")} ${item.name}`}>{t("friends.decline")}</Button>
        </li>)}
      </ul>
    </section>}

    {outgoing.length > 0 && <section className="settings-section" aria-labelledby="out-heading">
      <h2 id="out-heading">{t("friends.waiting")}</h2>
      <ul className="friend-list">
        {outgoing.map((item) => <li key={item.id} className="friend-row">
          <Avatar avatar={item.avatar} name={item.name} size={40} />
          <span className="friend-name">{item.name}</span>
          <Button variant="secondary" disabled={busy} onClick={() => run(() => api.removeFriend(item.id))} aria-label={`${t("friends.cancel")} ${item.name}`}>{t("friends.cancel")}</Button>
        </li>)}
      </ul>
    </section>}

    <section className="settings-section" aria-labelledby="list-heading">
      <h2 id="list-heading">{t("friends.list")}</h2>
      {friends.length === 0
        ? <p className="muted">{t("friends.empty")}</p>
        : <ul className="friend-list">
          {friends.map((item) => <li key={item.id} className="friend-row">
            <Avatar avatar={item.avatar} name={item.name} size={40} />
            <span className="friend-name">{item.name}{item.level ? <span className="muted"> · {t("xp.level").replace("{level}", item.level)}</span> : null}</span>
            <Button variant="secondary" disabled={busy} onClick={() => run(() => api.removeFriend(item.id), t("friends.removed"))} aria-label={`${t("friends.remove")} ${item.name}`}>{t("friends.remove")}</Button>
          </li>)}
        </ul>}
      <p className="muted"><Link to="/challenges">{t("challenges.title")}</Link></p>
    </section>

    <section className="settings-section" aria-labelledby="privacy-heading">
      <h2 id="privacy-heading">{t("friends.privacy")}</h2>
      <form className="settings-exam" onSubmit={(event) => { event.preventDefault(); run(() => api.updateFriendSettings({ displayName: name.trim() }), t("friends.saved")); }}>
        <TextField label={t("friends.displayName")} hint={t("friends.displayHint").replace("{name}", me.defaultName)} value={name} onChange={(event) => setName(event.target.value)} maxLength={30} />
        <Button variant="secondary" type="submit" disabled={busy}>{t("friends.save")}</Button>
      </form>
      <Checkbox label={t("friends.hide")} hint={t("friends.hideHint")} checked={me.hideActivity} disabled={busy}
        onChange={(event) => run(() => api.updateFriendSettings({ hideActivity: event.target.checked }), t("friends.saved"))} />
    </section>
  </div>;
}
