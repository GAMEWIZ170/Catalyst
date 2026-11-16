import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { EmptyState } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";
import { t } from "../../i18n";

const STATUS = { your_turn: "challenges.statusYourTurn", waiting: "challenges.statusWaiting", done: "challenges.statusDone", expired: "challenges.statusExpired" };

// The challenges the student made or played. Challenges are made from the results screen of a test.
export default function Challenges() {
  const [state, setState] = useState({ loading: true, error: "", items: [] });

  function load() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.getChallenges()
      .then(({ data }) => setState({ loading: false, error: "", items: data }))
      .catch((error) => setState({ loading: false, error: error.message, items: [] }));
  }
  useEffect(load, []);

  if (state.loading) return <div className="content student-page"><Loading /></div>;
  if (state.error) return <div className="content student-page"><ErrorState message={state.error} onRetry={load} /></div>;

  return <div className="content student-page">
    <h1>{t("challenges.title")}</h1>
    <p className="muted">{t("challenges.intro")}</p>
    {state.items.length === 0
      ? <EmptyState title={t("challenges.emptyTitle")} description={t("challenges.emptyText")} action={<Link className="button button-primary" to="/friends">{t("me.friends")}</Link>} />
      : <ul className="friend-list">
        {state.items.map((item) => <li key={item.id} className="friend-row">
          <Link className="friend-name" to={`/challenge/${item.id}`}>{item.title}{item.with ? <span className="muted"> · {item.with}</span> : null}</Link>
          <span className="muted">{t(STATUS[item.status])}{item.comparison ? ` · ${t(`challenges.${item.comparison.outcome}`)}` : ""}</span>
        </li>)}
      </ul>}
  </div>;
}
