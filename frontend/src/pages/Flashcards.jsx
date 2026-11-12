import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams, useParams } from "react-router-dom";
import { ArrowLeft, Check, CircleHelp, Layers, RotateCcw } from "lucide-react";
import DeckSummary from "../components/DeckSummary";
import RichText from "../components/RichText";
import { Button, EmptyState } from "../components/ui";
import { api } from "../api/client";
import { imageUrl } from "../utils/cloudinary";
import { ErrorState, Loading } from "./Courses";

const RATINGS = [["unknown", "Don't know", RotateCcw], ["unsure", "Unsure", CircleHelp], ["confident", "Confident", Check]];

export default function Flashcards() {
  const { id } = useParams();
  const location = useLocation();
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
      const response = (await api.getLessonFlashcards(id, filter)).data;
      if (mine !== loadCount.current) return;
      setCards(response.cards || []);
      setSummary(response.summary);
      setQueue(response.cards || []);
      setPosition(0);
      setShown(false);
      if (!response.cards?.length && filter) setNothingToReview(true);
    } catch (err) {
      if (mine !== loadCount.current) return;
      setError(err.status === 404 ? "This lesson is not available" : err.message);
    }
  }
  useEffect(() => { load(); }, [id, filter]);
  useEffect(() => { if (queue[position]) headingRef.current?.focus(); }, [position, queue]);

  // Space reveals the card. Keys 1, 2 and 3 rate it once the answer shows.
  useEffect(() => {
    if (finished || !queue[position]) return undefined;
    function onKey(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.("input, textarea, select, button, a")) return;
      if (event.key === " ") { event.preventDefault(); setShown((value) => !value); }
      else if (shown && ["1", "2", "3"].includes(event.key)) rate(RATINGS[Number(event.key) - 1][0]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

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
  if (!cards.length && !nothingToReview) return <Loading />;
  const back = <Link className="back-link" to={`/lessons/${id}`} state={lessonState}><ArrowLeft size={16} aria-hidden="true" />Back to lesson</Link>;
  if (nothingToReview) return <div className="content fc-page">{back}<EmptyState icon={Layers} title="No cards to review" description="You have rated every card as confident." action={<Button as={Link} to={`/lessons/${id}`} state={lessonState}>Back to lesson</Button>} /></div>;
  if (finished) {
    const toRevisit = summary.total - summary.confident;
    return <div className="content fc-page">
      <section className="fc-finished">
        <h1>Deck finished</h1>
        <p className="fc-finished-line">Confident on {summary.confident} of {summary.total}{toRevisit > 0 ? `, ${toRevisit} to revisit` : ""}</p>
        <DeckSummary summary={summary} />
        <div className="button-row button-row--stack">
          {toRevisit > 0 && <Button as={Link} to={`/lessons/${id}/flashcards?filter=review`} state={location.state}>Review cards I'm not sure about</Button>}
          <Button as={Link} variant={toRevisit > 0 ? "secondary" : "primary"} to={`/lessons/${id}`} state={lessonState}>Back to lesson</Button>
        </div>
      </section>
    </div>;
  }
  const card = queue[position];
  return <div className="content fc-page">
    {back}
    <div className="fc-top">
      <div className="exam-progress" role="progressbar" aria-label="Deck progress" aria-valuemin="0" aria-valuemax={queue.length} aria-valuenow={position + 1} style={{ "--progress": `${((position + 1) / queue.length) * 100}%` }} />
      <p className="exam-count" aria-live="polite">{position + 1} / {queue.length}</p>
    </div>
    <article className="fc-card">
      <h1 className="sr-only" tabIndex="-1" ref={headingRef}>Flashcard {position + 1} of {queue.length}</h1>
      <button key={`${card._id}-${position}`} className={`flashcard-flip ${shown ? "is-flipped" : ""}`} type="button" aria-pressed={shown} onClick={() => setShown((value) => !value)}>
        <span className="flashcard-face flashcard-face--front" aria-hidden={shown}><span className="flashcard-face-label">Question</span><RichText>{card.front.text}</RichText>{card.front.image?.url && <img src={imageUrl(card.front.image.url, 600)} alt={card.front.image.alt} loading="lazy" />}</span>
        <span className="flashcard-face flashcard-face--back" aria-hidden={!shown}><span className="flashcard-face-label">Answer</span><RichText>{card.back.text}</RichText>{card.back.image?.url && <img src={imageUrl(card.back.image.url, 600)} alt={card.back.image.alt} loading="lazy" />}</span>
      </button>
      <span className="sr-only" role="status">{shown ? "Answer shown" : ""}</span>
      {!shown
        ? <p className="fc-hint">Tap the card or press Space to reveal</p>
        : <>
          <div className="fc-ratings" role="group" aria-label="How well did you know it?">
            {RATINGS.map(([value, label, Icon], key) => <Button variant="secondary" key={value} disabled={saving} icon={Icon} onClick={() => rate(value)}><span className="exam-key" aria-hidden="true">{key + 1}</span> {label}</Button>)}
          </div>
          <p className="fc-hint" aria-live="polite">{saving ? "Saving your answer..." : "Keys 1, 2 and 3. Cards you mark Unsure or Don't know go into your review list."}</p>
        </>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </article>
  </div>;
}
