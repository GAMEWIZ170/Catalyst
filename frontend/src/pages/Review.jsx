import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, CircleHelp, Layers, RotateCcw } from "lucide-react";
import RichText from "../components/RichText";
import ResponsiveImage from "../components/ResponsiveImage";
import { Button, EmptyState } from "../components/ui";
import { api } from "../api/client";
import { ErrorState, Loading } from "./Courses";

const RATINGS = [["unknown", "Don't know", RotateCcw], ["unsure", "Unsure", CircleHelp], ["confident", "Confident", Check]];
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
      if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.("input, textarea, select, button, a")) return;
      if (event.key === " ") { event.preventDefault(); setShown((value) => !value); return; }
      const index = Number(event.key) - 1;
      if (live.current.shown && index >= 0 && index < RATINGS.length) live.current.rate(RATINGS[index][0]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error && !cards) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!cards) return <Loading />;
  const back = <Link className="back-link" to="/courses"><ArrowLeft size={16} aria-hidden="true" />Back to home</Link>;

  if (!card) return <div className="content fc-page">
    {back}
    {position === 0 && mistakes === 0
      ? <EmptyState icon={Layers} title="Nothing due today" description="Cards and mistakes come back here when it is time to review them." action={<Button as={Link} variant="secondary" to="/courses">Back to home</Button>} />
      : <section className="fc-finished">
        <h1>{position > 0 ? "Cards done" : "No cards due"}</h1>
        {position > 0 && <p className="fc-finished-line">You reviewed {plural(position, "card")}.</p>}
        {mistakes > 0 && <p className="muted">{plural(mistakes, "mistake")} due.</p>}
        <div className="button-row button-row--stack">
          {mistakes > 0 && <Button as={Link} to="/practice/mistakes?due=1" state={{ from: "/review" }}>Practise due mistakes</Button>}
          <Button as={Link} variant="secondary" to="/courses">Back to home</Button>
        </div>
      </section>}
  </div>;

  return <div className="content fc-page">
    {back}
    <div className="fc-top">
      <div className="exam-progress" role="progressbar" aria-label="Review progress" aria-valuemin="0" aria-valuemax={cards.length} aria-valuenow={position + 1} style={{ "--progress": `${((position + 1) / cards.length) * 100}%` }} />
      <p className="exam-count" aria-live="polite">{position + 1} / {cards.length}</p>
    </div>
    <article className="fc-card">
      <h1 className="sr-only" tabIndex="-1" ref={heading}>Review card {position + 1} of {cards.length}</h1>
      <button key={`${card._id}-${position}`} className={`flashcard-flip ${shown ? "is-flipped" : ""}`} type="button" aria-pressed={shown} onClick={() => setShown((value) => !value)}>
        <span className="flashcard-face flashcard-face--front" aria-hidden={shown}><span className="flashcard-face-label">Question</span><RichText>{card.front.text}</RichText>{card.front.image?.url && <ResponsiveImage image={card.front.image} sizes="(max-width: 600px) 80vw, 400px" />}</span>
        <span className="flashcard-face flashcard-face--back" aria-hidden={!shown}><span className="flashcard-face-label">Answer</span><RichText>{card.back.text}</RichText>{card.back.image?.url && <ResponsiveImage image={card.back.image} sizes="(max-width: 600px) 80vw, 400px" />}</span>
      </button>
      {!shown
        ? <p className="fc-hint">Tap the card or press Space to reveal</p>
        : <>
          <div className="fc-ratings" role="group" aria-label="How well did you know it?">
            {RATINGS.map(([value, label, Icon], key) => <Button variant="secondary" key={value} disabled={saving} icon={Icon} onClick={() => rate(value)}><span className="exam-key" aria-hidden="true">{key + 1}</span>{label}</Button>)}
          </div>
          <p className="fc-hint" aria-live="polite">{saving ? "Saving your answer..." : "Keys 1, 2 and 3. A card you know comes back later."}</p>
        </>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </article>
  </div>;
}
