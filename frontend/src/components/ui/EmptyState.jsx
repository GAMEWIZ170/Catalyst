// Empty list or screen: one picture, one sentence, one button. `illustration` is replaced by real artwork in Phase 5.
// `as` is the heading level. A page whose only content is an empty state passes "h1" so the page still has a main heading.
export default function EmptyState({ icon: Icon, illustration, title, description, action, as: Heading = "h3" }) {
  return (
    <div className="mx-auto grid max-w-md justify-items-center gap-3 px-4 py-10 text-center [&_.illustration]:mx-auto [&_.illustration]:mb-3 [&_.illustration]:w-32">
      {illustration || (Icon ? <span className="inline-flex size-12 items-center justify-center rounded-pill bg-primary/15 text-brand-ink" aria-hidden="true"><Icon size={24} /></span> : null)}
      <Heading className={`m-0 ${Heading === "h1" ? "text-lg leading-tight" : ""}`}>{title}</Heading>
      {description ? <p className="m-0 text-muted-foreground">{description}</p> : null}
      {action}
    </div>
  );
}
