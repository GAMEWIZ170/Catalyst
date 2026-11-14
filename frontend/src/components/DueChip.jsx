import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Badge } from "./ui";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

// A quiet link to the review session. Hidden when nothing is due or the count cannot load.
export default function DueChip() {
  const [due, setDue] = useState(null);
  useEffect(() => {
    let live = true;
    api.getReviewDue().then((payload) => { if (live) setDue(payload.data); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!due || due.cards + due.mistakes === 0) return null;
  return <Link className="due-chip" to="/review" aria-label={`Start review. Due today: ${plural(due.cards, "card")}, ${plural(due.mistakes, "mistake")}`}>
    <Badge tone="accent">Due today: {plural(due.cards, "card")}, {plural(due.mistakes, "mistake")}</Badge>
  </Link>;
}
