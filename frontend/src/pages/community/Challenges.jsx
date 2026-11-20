import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { Button, EmptyState } from "../../components/ui";
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

  if (state.loading) return <div className="mx-auto max-w-4xl student-page"><Loading /></div>;
  if (state.error) return <div className="mx-auto max-w-4xl student-page"><ErrorState message={state.error} onRetry={load} /></div>;

  return <div className="mx-auto max-w-4xl student-page">
    <h1>{t("challenges.title")}</h1>
    <p className="text-muted-foreground">{t("challenges.intro")}</p>
    {state.items.length === 0
      ? <EmptyState title={t("challenges.emptyTitle")} description={t("challenges.emptyText")} action={<Button as={Link} to="/friends">{t("me.friends")}</Button>} />
      : <ul className="m-0 mb-3 grid list-none gap-2 p-0">
        {state.items.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3">
          <Link className="min-w-32 flex-1" to={`/challenge/${item.id}`}>{item.title}{item.with ? <span className="text-muted-foreground"> · {item.with}</span> : null}</Link>
          <span className="text-muted-foreground">{t(STATUS[item.status])}{item.comparison ? ` · ${t(`challenges.${item.comparison.outcome}`)}` : ""}</span>
        </li>)}
      </ul>}
  </div>;
}
