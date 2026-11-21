import Donut from "./Donut";

// Every flashcard across the student's sets, by how well they know it. Same order and colours as the set bars and the
// end of a flashcard round. "Don't know" is pulled out of the ring so the cards that need work stand out.
export default function CardsDonut({ sets }) {
  const sum = (key) => sets.reduce((total, set) => total + (set[key] || 0), 0);
  const unknown = sum("unknown");
  const slices = [
    { key: "confident", label: "Confident", count: sum("confident"), fill: "fill-rate-good", dot: "bg-rate-good" },
    { key: "unsure", label: "Unsure", count: sum("unsure"), fill: "fill-rate-hard", dot: "bg-rate-hard" },
    { key: "unknown", label: "Don't know", count: unknown, fill: "fill-rate-again", dot: "bg-rate-again", pull: true },
    { key: "unrated", label: "Not rated yet", count: sum("unrated"), fill: "fill-border", dot: "bg-border" }
  ];
  return <Donut slices={slices} unit={["card", "cards"]} title="All your cards"
    note={unknown ? `${unknown} ${unknown === 1 ? "card needs" : "cards need"} the most work.` : "No cards marked Don't know. Nice."} />;
}
