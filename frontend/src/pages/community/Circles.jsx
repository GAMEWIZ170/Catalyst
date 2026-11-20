import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import Avatar from "../../components/profile/Avatar";
import { Button, Progress, SelectField, TextField, useToast } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import { t } from "../../i18n";

const fill = (key, values) => Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), t(key));

// Study circles: 2 to 6 friends with one shared weekly goal. One combined bar, no ranking, and nobody is named for
// studying less. The bar adds up each member's study days this week, counting at most the goal for each person.
export default function Circles() {
  const { toast } = useToast();
  const [state, setState] = useState({ loading: true, error: "", circles: [], friends: [] });
  const [name, setName] = useState("");
  const [goalDays, setGoalDays] = useState(4);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    Promise.all([api.getCircles(), api.getFriends()])
      .then(([circles, friends]) => setState({ loading: false, error: "", circles: circles.data, friends: friends.data.friends }))
      .catch((error) => setState((s) => ({ ...s, loading: false, error: error.message })));
  }, []);
  useEffect(load, [load]);

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

  async function createCircle(event) {
    event.preventDefault();
    if (await run(() => api.createCircle({ name: name.trim(), goalDays: Number(goalDays) }), t("circles.created"))) setName("");
  }

  if (state.loading && !state.circles.length && !state.friends.length) return <div className="mx-auto max-w-4xl student-page"><Loading /></div>;
  if (state.error && !state.circles.length) return <div className="mx-auto max-w-4xl student-page"><ErrorState message={state.error} onRetry={load} /></div>;

  const invites = state.circles.filter((circle) => circle.status === "invited");
  const mine = state.circles.filter((circle) => circle.status === "joined");

  return <div className="mx-auto max-w-4xl student-page circles-page">
    <h1>{t("circles.title")}</h1>
    <p className="text-muted-foreground">{t("circles.intro")}</p>
    <p className="mt-4 mb-0 min-h-6 font-semibold text-brand-ink" role="alert">{problem}</p>

    {invites.length > 0 && <section className="mb-6 grid gap-3 [&_h2]:text-xl" aria-labelledby="invites-heading">
      <h2 id="invites-heading">{t("circles.invites")}</h2>
      <ul className="m-0 mb-3 grid list-none gap-2 p-0">
        {invites.map((circle) => <li key={circle.id} className="flex flex-wrap items-center gap-3">
          <span className="min-w-32 flex-1">{circle.name}</span>
          <Button disabled={busy} onClick={() => run(() => api.acceptCircle(circle.id), t("circles.joined"))}>{t("friends.accept")}</Button>
          <Button variant="secondary" disabled={busy} onClick={() => run(() => api.leaveCircle(circle.id))} aria-label={`${t("friends.decline")} ${circle.name}`}>{t("friends.decline")}</Button>
        </li>)}
      </ul>
    </section>}

    {mine.map((circle) => {
      const invitable = state.friends.filter((friend) => !circle.members.some((member) => member.name === friend.name));
      return <section className="mb-6 grid gap-3 [&_h2]:text-xl" key={circle.id} aria-labelledby={`circle-${circle.id}`}>
        <h2 id={`circle-${circle.id}`}>{circle.name}</h2>
        {circle.progress
          ? <>
            <Progress value={Math.round((Math.min(circle.progress.done, circle.progress.target) / circle.progress.target) * 100)} label={t("circles.thisWeek")} />
            <p className="text-muted-foreground">{fill("circles.progress", { done: circle.progress.done, target: circle.progress.target })}{circle.progress.met ? ` ${t("circles.met")}` : ""}</p>
          </>
          : <p className="text-muted-foreground">{t("circles.waiting")}</p>}
        <p className="text-muted-foreground">{fill("circles.goal", { days: circle.goalDays })}</p>
        <ul className="m-0 mb-3 grid list-none gap-2 p-0">
          {circle.members.map((member, index) => <li key={index} className="flex flex-wrap items-center gap-3">
            <Avatar avatar={member.avatar} name={member.name} size={32} />
            <span className="min-w-32 flex-1">{member.name}{member.you ? ` (${t("circles.you")})` : ""}{member.status === "invited" ? <span className="text-muted-foreground"> · {t("circles.invited")}</span> : null}</span>
          </li>)}
        </ul>
        {circle.owner && circle.members.length < 6 && <InviteForm circle={circle} friends={invitable} busy={busy} onInvite={(friendship) => run(() => api.inviteToCircle(circle.id, friendship), t("circles.inviteSent"))} />}
        <Button variant="secondary" disabled={busy} onClick={() => run(() => api.leaveCircle(circle.id), t("circles.left"))} aria-label={`${t("circles.leave")} ${circle.name}`}>{t("circles.leave")}</Button>
      </section>;
    })}

    <section className="mb-6 grid gap-3 [&_h2]:text-xl" aria-labelledby="new-circle-heading">
      <h2 id="new-circle-heading">{t("circles.new")}</h2>
      <form className="settings-exam" onSubmit={createCircle}>
        <TextField label={t("circles.name")} value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required />
        <SelectField label={t("circles.goalLabel")} value={goalDays} onChange={(event) => setGoalDays(event.target.value)}>
          {[1, 2, 3, 4, 5, 6].map((days) => <option key={days} value={days}>{fill("circles.goal", { days })}</option>)}
        </SelectField>
        <Button type="submit" disabled={busy || name.trim().length < 2}>{t("circles.create")}</Button>
      </form>
    </section>
  </div>;
}

// Pick one of your friends to invite. Friends are listed by display name only.
function InviteForm({ circle, friends, busy, onInvite }) {
  const [friendship, setFriendship] = useState("");
  if (!friends.length) return <p className="text-muted-foreground">{t("circles.noFriends")}</p>;
  return <form className="settings-exam" onSubmit={(event) => { event.preventDefault(); if (friendship) onInvite(friendship); setFriendship(""); }}>
    <SelectField label={`${t("circles.invite")}: ${circle.name}`} value={friendship} onChange={(event) => setFriendship(event.target.value)}>
      <option value="">{t("circles.pick")}</option>
      {friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.name}</option>)}
    </SelectField>
    <Button variant="secondary" type="submit" disabled={busy || !friendship}>{t("circles.invite")}</Button>
  </form>;
}
