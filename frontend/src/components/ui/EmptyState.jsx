// Empty list or screen: one picture, one sentence, one button. `illustration` is replaced by real artwork in Phase 5.
// `as` is the heading level. A page whose only content is an empty state passes "h1" so the page still has a main heading.
export default function EmptyState({ icon: Icon, illustration, title, description, action, as: Heading = "h3" }) {
  return (
    <div className="ui-empty">
      {illustration || (Icon ? <span className="ui-empty-mark" aria-hidden="true"><Icon size={24} /></span> : null)}
      <Heading>{title}</Heading>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
