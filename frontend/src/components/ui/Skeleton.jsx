// Placeholder shapes while content loads. Static on purpose: no shimmer. Wrap in <SkeletonGroup label="Loading lesson">.
export function Skeleton({ variant = "line", width, className = "" }) {
  return <span className={`skeleton skeleton--${variant} ${className}`} style={width ? { width } : undefined} aria-hidden="true" />;
}

export function SkeletonGroup({ label = "Loading", children }) {
  return <div role="status" aria-label={label} className="skeleton-group">{children}</div>;
}
