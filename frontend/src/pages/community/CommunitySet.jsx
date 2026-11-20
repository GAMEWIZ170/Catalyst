import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Copy, Trophy } from "lucide-react";
import { api } from "../../api/client";
import ReportButton from "../../components/shared/ReportButton";
import ShareButton from "../../components/shared/ShareButton";
import { Button, Card, Checkbox, EmptyState, SelectField, useToast } from "../../components/ui";
import { ErrorState, Loading } from "../learn/Courses";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// The weekly or monthly board of one quiz: the top 10, then you and the people just above and below you. Display names only.
function Board({ quiz, onBoard }) {
  const [period, setPeriod] = useState("week");
  const [state, setState] = useState({ loading: true, error: "", data: null });
  useEffect(() => {
    let live = true;
    setState({ loading: true, error: "", data: null });
    api.getQuizBoard(quiz.id, period).then(({ data }) => { if (live) setState({ loading: false, error: "", data }); }).catch((error) => { if (live) setState({ loading: false, error: error.message, data: null }); });
    return () => { live = false; };
  }, [quiz.id, period]);
  const { data } = state;
  const rows = data ? [...data.entries, ...(data.near.length ? [null, ...data.near] : [])] : [];
  return <div className="grid gap-3 [&_h3]:m-0 [&_p]:m-0">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3>{quiz.title}</h3>
      <div className="flex flex-wrap gap-3" role="group" aria-label="Board period">
        <Button variant={period === "week" ? "primary" : "secondary"} aria-pressed={period === "week"} onClick={() => setPeriod("week")}>This week</Button>
        <Button variant={period === "month" ? "primary" : "secondary"} aria-pressed={period === "month"} onClick={() => setPeriod("month")}>This month</Button>
      </div>
    </div>
    <p className="text-muted-foreground">Only the first timed attempt of the {period} counts. Weeks start on Monday and months on the 1st (UTC). Join the board when you start a timed attempt.</p>
    {state.error && <p role="alert">{state.error}</p>}
    {state.loading && <Loading />}
    {data && rows.length === 0 && <p className="text-muted-foreground">No scores yet {period === "week" ? "this week" : "this month"}. Be the first: start the timed quiz and choose the leaderboard.</p>}
    {data && rows.length > 0 && <div className="overflow-x-auto rounded-xl border"><table className="w-full border-collapse [&_td]:border-b [&_td]:px-3 [&_td]:py-2 [&_td]:text-left [&_td]:tabular-nums [&_th]:border-b [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:tabular-nums">
      <thead><tr><th scope="col">Rank</th><th scope="col">Student</th><th scope="col">Score</th><th scope="col">Time</th></tr></thead>
      <tbody>{rows.map((row, index) => row === null
        ? <tr key={`gap-${index}`}><td colSpan="4" className="text-muted-foreground">…</td></tr>
        : <tr key={row.rank} className={row.you ? "bg-primary/15" : ""}><th scope="row">{row.rank}</th><td>{row.name}{row.you ? " (you)" : ""}</td><td>{row.score}% ({row.correct} of {row.total})</td><td>{Math.floor(row.seconds / 60)}:{String(row.seconds % 60).padStart(2, "0")}</td></tr>)}</tbody>
    </table></div>}
    {data && data.me && <p role="status">Your position: {data.me.rank} of {data.me.of}.</p>}
  </div>;
}

// One shared study set, read only. A student can save it, copy it into their own Lab, practise its quizzes, play them timed for
// the boards, or report it. The owner's source material is never shown.
export default function CommunitySet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [showCards, setShowCards] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [join, setJoin] = useState(true);
  const [boardQuiz, setBoardQuiz] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    api.getCommunitySet(id).then(({ data }) => setState({ loading: false, error: "", data })).catch((error) => setState({ loading: false, error: error.status === 404 ? "This set is not available. It may be private or removed." : error.message, data: null }));
  }
  useEffect(load, [id]);

  const studied = () => { if (state.data && !state.data.mine) api.markSetStudied(id).catch(() => {}); };

  async function toggleSave() {
    setBusy(true);
    try {
      const { data } = state.data.isSaved ? await api.unsaveSet(id) : await api.saveSet(id);
      setState((s) => ({ ...s, data: { ...s.data, isSaved: data.isSaved, saved: s.data.saved + (data.isSaved ? 1 : -1) } }));
    } catch (error) {
      toast({ tone: "warning", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    setBusy(true);
    try {
      const response = await api.copySet(id);
      toast({ tone: "success", message: response.message });
      navigate(`/lab/${response.data.id}`);
    } catch (error) {
      toast({ tone: "warning", message: error.message });
      setBusy(false);
    }
  }

  if (state.loading && !state.data) return <div className="mx-auto max-w-4xl student-page"><Loading /></div>;
  if (state.error && !state.data) return <div className="mx-auto max-w-4xl student-page"><Link className="mb-4 inline-flex min-h-11 items-center gap-1 py-2 font-semibold text-brand-ink no-underline" to="/community"><ArrowLeft size={16} aria-hidden="true" />Community sets</Link><ErrorState message={state.error} onRetry={load} /></div>;
  const set = state.data;
  const here = `/community/${id}`;

  return <div className="mx-auto max-w-4xl student-page community-set">
    <Link className="mb-4 inline-flex min-h-11 items-center gap-1 py-2 font-semibold text-brand-ink no-underline" to="/community"><ArrowLeft size={16} aria-hidden="true" />Community sets</Link>
    <header className="grid gap-2 [&_h1]:m-0 [&_p]:m-0">
      <h1>{set.title}</h1>
      <p className="text-muted-foreground">by {set.author}{set.course ? ` · ${set.course.code}: ${set.course.title}` : ""}{set.topic ? ` · ${set.topic}` : ""}</p>
      {set.description && <p>{set.description}</p>}
      <p className="text-muted-foreground">{set.studied} studied · {set.saved} saved</p>
    </header>
    {!set.onShelf && <p className="notice" role="status">{set.mine ? "This is your set. It is not on the community shelf, so it is shared only by link." : "This set is shared by link. It is not on the community shelf."}</p>}
    <p className="text-muted-foreground">Made by a student, not by Catalyst. Check what you learn here against your lessons.</p>
    <div className="flex flex-wrap gap-3">
      {!set.mine && <Button variant="secondary" icon={Bookmark} aria-pressed={set.isSaved} disabled={busy} onClick={toggleSave}>{set.isSaved ? "Saved" : "Save"}</Button>}
      <Button icon={Copy} disabled={busy} onClick={copy}>Copy to my Study Lab</Button>
      <ShareButton url={`${window.location.origin}/s/s/${set.id}`} title={set.title} text={`${set.title}: a study set on Catalyst.`} />
    </div>

    <section className="mb-6 grid gap-3 [&_h2]:text-xl" aria-labelledby="cards-heading">
      <h2 id="cards-heading">Flashcards ({set.cards.length})</h2>
      {set.cards.length === 0 ? <p className="text-muted-foreground">No flashcards in this set.</p>
        : !showCards ? <Button variant="secondary" onClick={() => { setShowCards(true); studied(); }}>Study the cards</Button>
          : <ul className="m-0 grid list-none gap-3 p-0">
            {set.cards.map((card, index) => <li key={index} className="rounded-md bg-muted p-3 [&_p]:m-0 [&_p]:[overflow-wrap:anywhere] [&_p]:whitespace-pre-wrap">
              <p><strong>{card.front}</strong></p>
              {revealed[index] ? <p>{card.back}</p> : <Button variant="tertiary" onClick={() => setRevealed((r) => ({ ...r, [index]: true }))}>Show answer</Button>}
            </li>)}
          </ul>}
      {showCards && <p className="text-muted-foreground">Copy the set to your Study Lab to review these cards with spaced repetition.</p>}
    </section>

    {set.notesText && <section className="mb-6 grid gap-3 [&_h2]:text-xl" aria-labelledby="notes-heading">
      <h2 id="notes-heading">Notes</h2>
      <p className="m-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{set.notesText}</p>
    </section>}

    <section className="mb-6 grid gap-3 [&_h2]:text-xl" aria-labelledby="quizzes-heading">
      <h2 id="quizzes-heading">Quizzes</h2>
      {set.quizzes.length === 0 ? <p className="text-muted-foreground">No quizzes in this set.</p> : <>
        {set.onShelf && !set.mine && <Checkbox label="Put my score on the leaderboard when I play timed" hint="Display names only. Your first timed attempt of the week and month counts." checked={join} onChange={(event) => setJoin(event.target.checked)} />}
        <ul className="m-0 mb-3 grid list-none gap-2 p-0">
          {set.quizzes.map((quiz) => <li key={quiz.id} className="flex flex-wrap items-center gap-3">
            <span className="min-w-32 flex-1">{quiz.title} <span className="text-muted-foreground">· {plural(quiz.questionCount, "question")}</span></span>
            <Button as={Link} variant="secondary" to={`/tests/${quiz.id}`} state={{ from: here }} onClick={studied}>Practise</Button>
            <Button as={Link} variant="secondary" to={`/tests/${quiz.id}/exam?timed=1${join && set.onShelf && !set.mine ? "&board=1" : ""}`} state={{ from: here }} onClick={studied}>Timed</Button>
            {set.onShelf && <Button variant="tertiary" icon={Trophy} aria-pressed={boardQuiz === quiz.id} onClick={() => setBoardQuiz(boardQuiz === quiz.id ? null : quiz.id)}>Leaderboard</Button>}
          </li>)}
        </ul>
        {boardQuiz && <Board quiz={set.quizzes.find((quiz) => quiz.id === boardQuiz)} />}
      </>}
    </section>

    {!set.mine && <ReportButton kind="set" target={set.id} />}
  </div>;
}
