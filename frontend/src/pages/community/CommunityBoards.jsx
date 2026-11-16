import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../../api/client";
import { Button } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";

// "Most studied sets" and "top creators" for the week or month. Ranked by how many different students studied a set (one per
// student per set per day). There is no board that ranks every student.
export default function CommunityBoards() {
  const [period, setPeriod] = useState("week");
  const [state, setState] = useState({ loading: true, error: "", data: null });

  function load() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.getCommunityBoards(period).then(({ data }) => setState({ loading: false, error: "", data })).catch((error) => setState({ loading: false, error: error.message, data: null }));
  }
  useEffect(load, [period]);

  const { data } = state;
  return <div className="content student-page community-boards">
    <Link className="back-link" to="/community"><ArrowLeft size={16} aria-hidden="true" />Community sets</Link>
    <h1>Top sets and creators</h1>
    <div className="button-row" role="group" aria-label="Period">
      <Button variant={period === "week" ? "primary" : "secondary"} aria-pressed={period === "week"} onClick={() => setPeriod("week")}>This week</Button>
      <Button variant={period === "month" ? "primary" : "secondary"} aria-pressed={period === "month"} onClick={() => setPeriod("month")}>This month</Button>
    </div>
    <p className="muted">Ranked by how many different students studied a set. Weeks start on Monday and months on the 1st (UTC).</p>
    {state.error && !data && <ErrorState message={state.error} onRetry={load} />}
    {state.loading && !data && <Loading />}
    {data && <>
      <section className="settings-section" aria-labelledby="top-sets-heading">
        <h2 id="top-sets-heading">Most studied sets</h2>
        {data.sets.length === 0 ? <p className="muted">No sets were studied {period === "week" ? "this week" : "this month"} yet.</p> : <ol className="stat-list">
          {data.sets.map((set) => <li key={set.id}><span><Link to={`/community/${set.id}`}>{set.title}</Link> <span className="muted">by {set.author}</span></span><span className="muted">{set.studied} {set.studied === 1 ? "student" : "students"}</span></li>)}
        </ol>}
      </section>
      <section className="settings-section" aria-labelledby="top-creators-heading">
        <h2 id="top-creators-heading">Top creators</h2>
        {data.creators.length === 0 ? <p className="muted">No creators to show yet.</p> : <ol className="stat-list">
          {data.creators.map((creator) => <li key={creator.rank} className={creator.you ? "board-you" : ""}><span>{creator.name}{creator.you ? " (you)" : ""} <span className="muted">{creator.sets} {creator.sets === 1 ? "set" : "sets"}</span></span><span className="muted">{creator.studied} studies</span></li>)}
        </ol>}
      </section>
    </>}
  </div>;
}
