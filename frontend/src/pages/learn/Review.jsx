import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Layers } from "lucide-react";
import FlashCard from "../../components/learn/FlashCard";
import RatingTiles, { RATINGS } from "../../components/learn/RatingTiles";
import { Button, EmptyState, ProgressDots } from "../../components/ui";
import { api } from "../../api/client";
import { ErrorState, Loading } from "./Courses";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// Today's review: the flashcards that are due, then the mistakes that are due.
// Rating a card tells the server when to show it again (a card you know comes back later).
export default function Review() {
  const [cards, setCards] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [position, setPosition] = useState(0);
  const [shown, setShown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef(null);

  async function load() {
    setError("");
    try {
      const [session, due] = await Promise.all([api.getReviewSession(), api.getReviewDue()]);
      setCards(session.data.cards);
      setMistakes(due.data.mistakes);
      setPosition(0);
      setShown(false);
    } catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (cards?.[position]) heading.current?.focus(); }, [position, cards]);

  const card = cards?.[position];
  async function rate(value) {
    if (!card || saving) return;
    setSaving(true);
    setError("");
    try {
      await api.rateFlashcard(card._id, value);
      setPosition((current) => current + 1);
      setShown(false);
    } catch (err) { setError(err.message); }
    setSaving(false);
  }
  // Keys: Space flips, 1 to 3 rate once the answer is showing. Never while typing or on a focused control.
  const live = useRef({});
  live.current = { rate, shown };
  useEffect(() => {
    function onKey(event) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.("input, textarea, select, [role=menu], [role=dialog]")) return;
      if (event.key === " ") { if (event.target.closest?.("button, a")) return; event.preventDefault(); setShown((value) => !value); return; }
      const index = Number(event.key) - 1;
      if (live.current.shown && index >= 0 && index < RATINGS.length) live.current.rate(RATINGS[index].value);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error && !cards) return <div className="mx-auto max-w-4xl"><ErrorState message={error} onRetry={load} /></div>;
  if (!cards) return <Loading />;
  const back = <div><Button as={Link} to="/home" variant="tertiary" size="sm" icon={ArrowLeft}>Back to home</Button></div>;

  if (!card) return <div className="mx-auto grid max-w-2xl gap-5">
    {back}
    {position === 0 && mistakes === 0
      ? <EmptyState as="h1" icon={Layers} title="Nothing due today" description="Cards and mistakes come back here when it is time to review them." action={<Button as={Link} variant="secondary" to="/home">Back to home</Button>} />
      : <section className="grid justify-items-center gap-3 text-center">
        <h1 className="m-0 text-3xl leading-tight font-bold">{position > 0 ? "Cards done" : "No cards due"}</h1>
        {position > 0 && <p className="m-0 text-lg">You reviewed {plural(position, "card")}.</p>}
        {mistakes > 0 && <p className="m-0 text-muted-foreground">{plural(mistakes, "mistake")} due.</p>}
        <div className="flex flex-wrap justify-center gap-2">
          {mistakes > 0 && <Button as={Link} to="/practice/mistakes?due=1" state={{ from: "/review" }}>Practise due mistakes</Button>}
          <Button as={Link} variant="secondary" to="/home">Back to home</Button>
        </div>
      </section>}
  </div>;

  return <div className="mx-auto grid max-w-2xl gap-5">
    {back}
    <div className="flex items-center gap-3 rounded-pill border border-border bg-card px-4 py-1">
      <span className="rounded-pill bg-muted px-3 py-1 text-sm font-semibold">Review</span>
      <ProgressDots className="min-w-0 flex-1 justify-center overflow-hidden" total={cards.length} current={position} max={7} />
      <p className="m-0 shrink-0 text-sm text-muted-foreground tabular-nums" aria-live="polite">{position + 1} / {cards.length}</p>
    </div>
    <article className="grid gap-4">
      <h1 className="sr-only" tabIndex="-1" ref={heading}>Review card {position + 1} of {cards.length}</h1>
      <FlashCard key={`${card._id}-${position}`} card={card} shown={shown} onToggle={() => setShown((value) => !value)} />
      <RatingTiles enabled={shown} saving={saving} onRate={rate} />
      <p className="m-0 text-center text-sm text-muted-foreground" aria-live="polite">{saving ? "Saving your answer..." : shown ? "Keys 1, 2 and 3. A card you know comes back later." : "Tap the card or press Space to reveal"}</p>
      {error && <p className="m-0 text-destructive" role="alert">{error}</p>}
    </article>
  </div>;
}
