// One card style. Header, body and footer are optional slots. A card gets a border, never a shadow.
export function Card({ as: Tag = "section", className = "", children, ...rest }) {
  return <Tag className={`grid content-start gap-3 rounded-xl border bg-card p-4 sm:p-5 ${className}`} {...rest}>{children}</Tag>;
}
export function CardHeader({ className = "", children }) {
  return <header className={`[&>:first-child]:mt-0 [&>:last-child]:mb-0 ${className}`}>{children}</header>;
}
export function CardBody({ className = "", children }) {
  return <div className={`[&>:first-child]:mt-0 [&>:last-child]:mb-0 ${className}`}>{children}</div>;
}
export function CardFooter({ className = "", children }) {
  return <footer className={`flex flex-wrap items-center gap-3 ${className}`}>{children}</footer>;
}
export default Card;
