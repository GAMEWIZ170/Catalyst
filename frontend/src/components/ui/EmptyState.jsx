// Empty list or screen: one picture, one sentence, one button. `illustration` is replaced by real artwork in Phase 5.
export default function EmptyState({ icon: Icon, illustration, title, description, action }) {
  return (
    <div className="ui-empty">
      {illustration || (Icon ? <span className="ui-empty-mark" aria-hidden="true"><Icon size={24} /></span> : null)}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}
