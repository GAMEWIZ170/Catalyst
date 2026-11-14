import { Eye } from "lucide-react";
import { Badge } from "./ui";
import RichText from "./RichText";

// Shown above a lesson or test opened with "Preview as student". It says what the student can and cannot see.
export function PreviewBanner({ published, visible }) {
  return <div className="preview-banner" role="status">
    <Eye size={16} aria-hidden="true" />
    <span>
      <strong>Preview as student.</strong> Nothing here is saved: no progress, scores or mistakes.{" "}
      {visible ? "Students can see this now." : published ? "Students cannot see this yet, because its unit or course is hidden." : "This is a draft. Students cannot see it yet."}
    </span>
  </div>;
}

// A student studies cards one at a time on their own screen. The preview lists them all, so every card can be checked quickly.
export function PreviewCards({ cards }) {
  return <ol className="preview-cards">
    {cards.map((card) => <li key={card._id}>
      <div><span className="muted">Front</span><RichText>{card.front?.text || ""}</RichText></div>
      <div><span className="muted">Back</span><RichText>{card.back?.text || ""}</RichText></div>
      {card.draft && <Badge>Draft</Badge>}
    </li>)}
  </ol>;
}
