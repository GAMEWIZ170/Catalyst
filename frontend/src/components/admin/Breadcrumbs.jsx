import { Link } from "react-router-dom";

export default function Breadcrumbs({ items }) {
  return <nav className="mb-4" aria-label="Breadcrumb">
    <ol className="m-0 flex list-none flex-wrap gap-1 p-0">
      {items.map((item, index) => <li className="flex items-center text-muted-foreground not-last:after:ml-1 not-last:after:content-['/']" key={`${item.label}-${index}`}>
        {index === items.length - 1 || !item.to ? <span aria-current={index === items.length - 1 ? "page" : undefined}>{item.label}</span> : <Link className="inline-flex min-h-11 items-center text-brand-ink" to={item.to}>{item.label}</Link>}
      </li>)}
    </ol>
  </nav>;
}
