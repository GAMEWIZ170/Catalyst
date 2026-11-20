// Placeholder shapes while content loads. Static on purpose: no shimmer. Wrap in <SkeletonGroup label="Loading lesson">.
const SHAPES = { line: "h-4", title: "h-7 w-2/3", block: "h-32", card: "h-24" };

export function Skeleton({ variant = "line", width, className = "" }) {
  return <span className={`block rounded-md bg-border ${SHAPES[variant] || SHAPES.line} ${className}`} style={width ? { width } : undefined} aria-hidden="true" />;
}

export function SkeletonGroup({ label = "Loading", children }) {
  return <div role="status" aria-label={label} className="grid gap-3">{children}</div>;
}
