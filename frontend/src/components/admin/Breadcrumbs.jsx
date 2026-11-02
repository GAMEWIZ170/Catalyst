import { Link } from "react-router-dom";

export default function Breadcrumbs({ items }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      {items.map((item, index) => <li key={`${item.label}-${index}`}>
        {index === items.length - 1 || !item.to ? <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span> : <Link to={item.to}>{item.label}</Link>}
      </li>)}
    </ol>
  </nav>;
}
