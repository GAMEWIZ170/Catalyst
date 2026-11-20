import { Eye } from "lucide-react";
import { Badge } from "../ui";
import RichText from "../shared/RichText";

// Shown above a lesson or test opened with "Preview as student". It says what the student can and cannot see.
export function PreviewBanner({ published, visible }) {
  return <div className="mb-4 flex items-start gap-2 rounded-md border bg-primary/15 p-3 text-sm [&_svg]:mt-0.5 [&_svg]:flex-none" role="status">
    <Eye size={16} aria-hidden="true" />
    <span>
      <strong>Preview as student.</strong> Nothing here is saved: no progress, scores or mistakes.{" "}
      {visible ? "Students can see this now." : published ? "Students cannot see this yet, because its unit or course is hidden." : "This is a draft. Students cannot see it yet."}
    </span>
  </div>;
}

// A student studies cards one at a time on their own screen. The preview lists them all, so every card can be checked quickly.
export function PreviewCards({ cards }) {
  return <ol className="m-0 mb-3 grid list-none gap-3 p-0 [&_li]:grid [&_li]:gap-2 [&_li]:rounded-xl [&_li]:border [&_li]:bg-card [&_li]:px-4 [&_li]:py-3">
    {cards.map((card) => <li key={card._id}>
      <div><span className="text-muted-foreground">Front</span><RichText>{card.front?.text || ""}</RichText></div>
      <div><span className="text-muted-foreground">Back</span><RichText>{card.back?.text || ""}</RichText></div>
      {card.draft && <Badge>Draft</Badge>}
    </li>)}
  </ol>;
}
