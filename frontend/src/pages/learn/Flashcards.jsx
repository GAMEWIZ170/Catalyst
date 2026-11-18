import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ArrowLeft, Layers, MoreHorizontal, RotateCcw, Shuffle } from "lucide-react";
import DeckSummary from "../../components/learn/DeckSummary";
import FlashCard from "../../components/learn/FlashCard";
import RatingTiles, { RATINGS } from "../../components/learn/RatingTiles";
import { Button, DropdownMenu, EmptyState, KeycapButton, ProgressDots, Tooltip } from "../../components/ui";
import { api } from "../../api/client";
import { ErrorState, Loading } from "./Courses";

// One deck player for a lesson's flashcards (/lessons/:id/flashcards) and for a student's own study set (/lab/:setId/study).
export default function Flashcards({ setMode = false }) {
  const routeParams = useParams();
  const id = setMode ? routeParams.setId : routeParams.id;
  const home = setMode ? `/lab/${id}?tab=cards` : `/lessons/${id}`;
  const homeLabel = setMode ? "Back to my set" : "Back to lesson";
  const reviewPath = setMode ? `/lab/${id}/study?filter=review` : `/lessons/${id}/flashcards?filter=review`;
  const location = useLocation();
  const navigate = useNavigate();
  const lessonState = location.state?.courseFrom ? { from: location.state.courseFrom } : undefined;
  const [params] = useSearchParams();
  const filter = params.get("filter") === "review" ? "review" : "";
  const [cards, setCards] = useState([]);
  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState([]);
  const [position, setPosition] = useState(0);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nothingToReview, setNothingToReview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const headingRef = useRef(null);
  const repeated = useRef(new Set());
  const loadCount = useRef(0);

  async function load() {
    // Only the latest request may fill the deck, so a slower older one cannot reset a card the student is on.
    const mine = ++loadCount.current;
    setError("");
    setFinished(false);
    setNothingToReview(false);
    repeated.current = new Set();
    try {
      const response = (await (setMode ? api.getSetStudy(id, filter) : api.getLessonFlashcards(id, filter))).data;
      if (mine !== loadCount.current) return;
      setCards(response.cards || []);
      setSummary(response.summary);
      setQueue(response.cards || []);
      // Coming from Home's Continue card, pick the deck up at the card the student reached.
      const resume = Number(location.state?.resume) || 0;
      setPosition(!filter && resume > 0 ? Math.min(resume, Math.max((response.cards || []).length - 1, 0)) : 0);
      setShown(false);
      setLoaded(true);
      if (!response.cards?.length && filter) setNothingToReview(true);
    } catch (err) {
      if (mine !== loadCount.current) return;
      setError(err.status === 404 ? "This lesson is not available" : err.message);
    }
  }
  useEffect(() => { load(); }, [id, filter]);
  useEffect(() => { if (queue[position]) headingRef.current?.focus(); }, [position, queue]);

  // Save the card number so Home can say "flashcards 12/30". A failure here never interrupts studying.
  useEffect(() => {
    if (!queue[position] || filter || setMode) return;
    api.savePosition({ lessonId: id, kind: "flashcards", position, total: queue.length }).catch(() => {});
  }, [id, position, queue.length, filter]);

  // Space flips the card, left and right arrows move, keys 1 to 3 rate once the answer shows.
  useEffect(() => {
    if (finished || !queue[position]) return undefined;
    function onKey(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.("input, textarea, select, [role=menu], [role=dialog]")) return;
      if (event.key === " ") {
        if (event.target.closest?.("button, a")) return; // a focused button already toggles itself
        event.preventDefault();
        setShown((value) => !value);
      } else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
      else if (shown && ["1", "2", "3"].includes(event.key)) rate(RATINGS[Number(event.key) - 1].value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Move without rating. Rated cards can be looked at again.
  function go(step) {
    const next = position + step;
    if (next < 0 || next > queue.length - 1) return;
    setPosition(next);
    setShown(false);
  }

  // Shuffle only the cards still ahead, so the one on screen stays put.
  function shuffle() {
    setQueue((items) => {
      const ahead = items.slice(position + 1);
      for (let i = ahead.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [ahead[i], ahead[j]] = [ahead[j], ahead[i]];
      }
      return [...items.slice(0, position + 1), ...ahead];
    });
  }

  async function rate(confidence) {
    if (saving) return;
    const card = queue[position];
    setSaving(true);
    try {
      const response = (await api.rateFlashcard(card._id, confidence)).data;
      setSummary(response.summary);
      const shouldRepeat = confidence === "unknown" && !repeated.current.has(card._id);
      if (shouldRepeat) {
        repeated.current.add(card._id);
        setQueue((items) => [...items, card]);
      }
      if (shouldRepeat) {
        setPosition((value) => value + 1);
      } else if (position === queue.length - 1) {
        setFinished(true);
      } else {
        setPosition((value) => value + 1);
      }
      setShown(false);
      window.dispatchEvent(new Event("catalyst:refresh-streak"));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !cards.length) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!cards.length && !nothingToReview && !loaded) return <Loading />;
  if (!cards.length && !nothingToReview) return <div className="content fc-page"><EmptyState as="h1" icon={Layers} title="No flashcards yet" description={setMode ? "Add cards to this set first." : "This lesson has no flashcards."} action={<Button as={Link} to={home} state={lessonState}>{homeLabel}</Button>} /></div>;
  const back = <Link className="back-link" to={home} state={lessonState}><ArrowLeft size={16} aria-hidden="true" />{homeLabel}</Link>;
  if (nothingToReview) return <div className="content fc-page">{back}<EmptyState as="h1" icon={Layers} title="No cards to review" description="You have rated every card as confident." action={<Button as={Link} to={home} state={lessonState}>{homeLabel}</Button>} /></div>;
  if (finished) {
    const toRevisit = summary.total - summary.confident;
    return <div className="content fc-page">
      <section className="fc-finished">
        <h1>Deck finished</h1>
        <p className="fc-finished-line">Confident on {summary.confident} of {summary.total}{toRevisit > 0 ? `, ${toRevisit} to revisit` : ""}</p>
        <DeckSummary summary={summary} />
        <div className="button-row button-row--stack">
          {toRevisit > 0 && <Button as={Link} to={reviewPath} state={location.state}>Review cards I'm not sure about</Button>}
          <Button as={Link} variant={toRevisit > 0 ? "secondary" : "primary"} to={home} state={lessonState}>{homeLabel}</Button>
        </div>
      </section>
    </div>;
  }
  const card = queue[position];
  const menu = [
    { label: "Shuffle the rest", icon: Shuffle, onSelect: shuffle },
    { label: "Start again", icon: RotateCcw, onSelect: load },
    { separator: true },
    { label: homeLabel, icon: ArrowLeft, onSelect: () => navigate(home, { state: lessonState }) }
  ];
  return <div className="content mx-auto grid max-w-2xl gap-5">
    {back}
    <div className="flex items-center gap-3 rounded-pill border border-border bg-card py-1 pr-1 pl-4">
      <span className="rounded-pill bg-muted px-3 py-1 text-sm font-semibold">{filter ? "Review" : "All cards"}</span>
      <ProgressDots className="min-w-0 flex-1 justify-center overflow-hidden"  total={queue.length} current={position} max={7} onSelect={(index) => { setPosition(index); setShown(false); }} />
      <p className="m-0 hidden shrink-0 text-sm text-muted-foreground tabular-nums sm:block" aria-live="polite">{position + 1} / {queue.length}</p>
      <Tooltip label="Shuffle the rest"><Button variant="tertiary" size="sm" className="hidden sm:inline-flex" aria-label="Shuffle the rest" onClick={shuffle}><Shuffle size={16} aria-hidden="true" /></Button></Tooltip>
      <DropdownMenu items={menu} trigger={<Button variant="tertiary" size="sm" aria-label="More options"><MoreHorizontal size={16} aria-hidden="true" /></Button>} />
    </div>
    <article className="grid gap-4">
      <h1 className="sr-only" tabIndex="-1" ref={headingRef}>Flashcard {position + 1} of {queue.length}</h1>
      <FlashCard key={`${card._id}-${position}`} card={card} shown={shown} onToggle={() => setShown((value) => !value)} />
      <span className="sr-only" role="status">{shown ? "Answer shown" : ""}</span>
      <div className="flex items-center justify-center gap-2">
        <KeycapButton keyLabel="←" disabled={position === 0} onClick={() => go(-1)}>Prev</KeycapButton>
        <KeycapButton keyLabel="Space" aria-pressed={shown} onClick={() => setShown((value) => !value)}>{shown ? "Question" : "Flip"}</KeycapButton>
        <KeycapButton keyLabel="→" disabled={position === queue.length - 1} onClick={() => go(1)}>Next</KeycapButton>
      </div>
      <RatingTiles enabled={shown} saving={saving} onRate={rate} />
      <p className="m-0 text-center text-sm text-muted-foreground" aria-live="polite">{saving ? "Saving your answer..." : shown ? "Keys 1, 2 and 3. Cards you mark Unsure or Don't know come back in your review list." : "Flip the card, then rate how well you knew it."}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
    </article>
  </div>;
}
