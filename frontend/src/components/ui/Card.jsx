// One card style. Header, body and footer are optional slots. A card gets a border, never a shadow.
export function Card({ as: Tag = "section", className = "", children, ...rest }) {
  return <Tag className={`ui-card ${className}`} {...rest}>{children}</Tag>;
}
export function CardHeader({ className = "", children }) {
  return <header className={`ui-card-header ${className}`}>{children}</header>;
}
export function CardBody({ className = "", children }) {
  return <div className={`ui-card-body ${className}`}>{children}</div>;
}
export function CardFooter({ className = "", children }) {
  return <footer className={`ui-card-footer ${className}`}>{children}</footer>;
}
export default Card;
