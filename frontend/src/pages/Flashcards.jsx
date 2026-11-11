import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams, useParams } from "react-router-dom";
import DeckSummary from "../components/DeckSummary";
import RichText from "../components/RichText";
import { api } from "../api/client";
import { imageUrl } from "../utils/cloudinary";
import { ErrorState, Loading } from "./Courses";

function RatingIcon({ type }) {
  if (type === "confident") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m8 12 2.5 2.5L16 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
  if (type === "unsure") return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M9.5 9.5a2.5 2.5 0 1 1 4.1 1.9c-.9.7-1.6 1-1.6 2.1M12 16.8v.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10a7 7 0 1 1 2 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" /><path d="M5 5v5h5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

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
  const [nothingToReview, setNothingToReview] = useState(false);
  const headingRef = useRef(null);
  const repeated = useRef(new Set());

  async function load() {
    setError("");
    setFinished(false);
    setNothingToReview(false);
    repeated.current = new Set();
    try {
      const response = (await api.getLessonFlashcards(id, filter)).data;
      setCards(response.cards || []);
      setSummary(response.summary);
      setQueue(response.cards || []);
      setPosition(0);
      setShown(false);
      if (!response.cards?.length && filter) setNothingToReview(true);
    } catch (err) {
      setError(err.status === 404 ? "This lesson is not available" : err.message);
    }
  }
  useEffect(() => { load(); }, [id, filter]);
  useEffect(() => { if (queue[position]) headingRef.current?.focus(); }, [position, queue]);

  async function rate(confidence) {
    const card = queue[position];
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
    }
  }

  if (error && !cards.length) return <div className="content"><ErrorState message={error} onRetry={load} /></div>;
  if (!cards.length && !nothingToReview) return <Loading />;
  if (nothingToReview) return <div className="content flashcard-page"><Link className="back-link" to={`/lessons/${id}`} state={lessonState}>Back to lesson</Link><section className="flashcard-empty"><h1>No cards to review.</h1></section></div>;
  if (finished) return <div className="content flashcard-page"><section className="flashcard-finished"><h1>Deck finished</h1><DeckSummary summary={summary} /><div className="lesson-links">{summary.unsure + summary.unknown + summary.unrated > 0 ? <Link className="button button-primary" to={`/lessons/${id}/flashcards?filter=review`} state={location.state}>Review cards I'm not sure about</Link> : <p>Nothing left to review</p>}<Link className="button button-secondary" to={`/lessons/${id}`} state={lessonState}>Back to lesson</Link></div></section></div>;
  const card = queue[position];
  return <div className="content flashcard-page">
    <Link className="back-link" to={`/lessons/${id}`} state={lessonState}>Back to lesson</Link>
    <div className="flashcard-progress"><div className="test-progress-line" role="progressbar" aria-valuemin="0" aria-valuemax={queue.length} aria-valuenow={position + 1} style={{ "--progress": `${((position + 1) / queue.length) * 100}%` }} /><p aria-live="polite">Card {position + 1} of {queue.length}</p></div>
    <article className="flashcard-card">
      <h1 tabIndex="-1" ref={headingRef}>Flashcard {position + 1}</h1>
      <div className="flashcard-side"><RichText>{card.front.text}</RichText>{card.front.image?.url && <img src={imageUrl(card.front.image.url, 600)} alt={card.front.image.alt} loading="lazy" />}</div>
      {!shown ? <button className="button button-primary" type="button" onClick={() => setShown(true)}>Show answer</button> : <><div className="flashcard-side"><RichText>{card.back.text}</RichText>{card.back.image?.url && <img src={imageUrl(card.back.image.url, 600)} alt={card.back.image.alt} loading="lazy" />}</div><div className="flashcard-ratings">{[["confident", "Confident"], ["unsure", "Unsure"], ["unknown", "Don't know"]].map(([value, label]) => <button className={`flashcard-rating flashcard-rating--${value}`} type="button" key={value} onClick={() => rate(value)}><RatingIcon type={value} />{label}</button>)}</div><p className="flashcard-hint">Cards you mark Unsure or Don't know go into your review list.</p></>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </article>
  </div>;
}
