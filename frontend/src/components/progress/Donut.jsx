import { useState } from "react";
import { cn } from "@/lib/utils";

// A donut chart with a number in the middle and a legend beside it (stacked on phones). Used for "All your cards" on
// Progress and for right/wrong on a quiz summary.
// slices: [{ key, label, count, fill, dot, pull? }] in a fixed order. `fill` and `dot` are literal Tailwind classes
// (fill-rate-good, bg-rate-good ...). A slice with `pull` sits out from the ring so it stands out.
// Hovering or tapping a slice (or its legend row) puts that slice's number in the middle.

const C = 100;
const OUTER = 84;
const INNER = 56;
const PULL = 7;

const point = (radius, angle) => [C + radius * Math.sin(angle), C - radius * Math.cos(angle)];
const arc = (a, b, outer = OUTER) => {
  if (b - a >= Math.PI * 2 - 1e-6) b = a + Math.PI * 2 - 1e-4; // a full ring still needs two distinct end points
  const large = b - a > Math.PI ? 1 : 0;
  const [x1, y1] = point(outer, a), [x2, y2] = point(outer, b), [x3, y3] = point(INNER, b), [x4, y4] = point(INNER, a);
  return `M${x1} ${y1}A${outer} ${outer} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${INNER} ${INNER} 0 ${large} 0 ${x4} ${y4}Z`;
};
export const percent = (n, total) => (total ? Math.round((n / total) * 100) : 0);

export default function Donut({ slices, unit = ["item", "items"], title, note, label, className }) {
  const [hover, setHover] = useState(null);
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);
  if (!total) return null;

  let start = 0;
  const shown = slices.filter((slice) => slice.count > 0).map((slice) => {
    const end = start + (slice.count / total) * Math.PI * 2;
    const mid = (start + end) / 2;
    const pulled = slice.pull && slice.count < total; // pulling out the only slice would just move the ring
    const piece = { ...slice, path: arc(start, end, pulled ? OUTER + 3 : OUTER), dx: pulled ? PULL * Math.sin(mid) : 0, dy: pulled ? -PULL * Math.cos(mid) : 0 };
    start = end;
    return piece;
  });
  const active = hover && slices.find((slice) => slice.key === hover);

  return <div className={cn("grid items-center gap-5 rounded-xl border border-border bg-card p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-8 sm:p-5", className)}>
    <div className="relative mx-auto size-44" onMouseLeave={() => setHover(null)}>
      <svg viewBox="-10 -10 220 220" className="size-full overflow-visible" role="img" aria-label={label || `${total} ${unit[1]}: ${slices.map((slice) => `${slice.label} ${slice.count}`).join(", ")}.`}>
        {shown.map((slice) => <path
          key={slice.key}
          d={slice.path}
          transform={`translate(${slice.dx} ${slice.dy})`}
          className={cn(slice.fill, "stroke-card transition-opacity duration-150", hover && hover !== slice.key && "opacity-40")}
          strokeWidth="2"
          strokeLinejoin="round"
          onMouseEnter={() => setHover(slice.key)}
          onClick={() => setHover(hover === slice.key ? null : slice.key)}
        />)}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center" aria-hidden="true">
        <strong className="text-3xl leading-none tabular-nums">{active ? active.count : total}</strong>
        <span className="mt-1 text-xs text-muted-foreground">{active ? `${active.label.toLowerCase()} · ${percent(active.count, total)}%` : total === 1 ? unit[0] : unit[1]}</span>
      </div>
    </div>
    <div className="grid gap-3">
      {(title || note) && <div>
        {title && <h3 className="m-0 text-base font-semibold">{title}</h3>}
        {note && <p className="m-0 text-sm text-muted-foreground">{note}</p>}
      </div>}
      <ul className="m-0 grid max-w-sm list-none gap-1 p-0 text-sm">
        {slices.map(({ key, label: name, count, dot }) => <li key={key} className={cn("flex items-center gap-2 rounded-md px-2 py-1 transition-colors", hover === key && "bg-muted")} onMouseEnter={() => count && setHover(key)} onMouseLeave={() => setHover(null)}>
          <span className={cn("size-2.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
          <span className="flex-1">{name}</span>
          <span className="font-semibold tabular-nums">{count}</span>
          <span className="w-10 text-right text-muted-foreground tabular-nums">{percent(count, total)}%</span>
        </li>)}
      </ul>
    </div>
  </div>;
}
