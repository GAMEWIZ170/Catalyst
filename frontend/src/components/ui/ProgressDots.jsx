import { cn } from "@/lib/utils";

// One dot per card or question. The current one is a gold pill, seen ones are filled, the rest are empty.
// Long sets show a window of `max` dots around the current one. Screen readers get "Card 3 of 40" only.
// Pass onSelect(index) to make the dots tappable (each target is padded to 24 px).
export default function ProgressDots({ total, current = 0, seen = [], max = 9, onSelect, noun = "Card", className }) {
  if (total <= 0) return null;
  const size = Math.min(max, total);
  const start = Math.min(Math.max(0, current - Math.floor(size / 2)), total - size);
  const seenSet = new Set(seen);
  const dots = Array.from({ length: size }, (_, offset) => start + offset);

  return (
    <div role="group" aria-label={`${noun} ${current + 1} of ${total}`} className={cn("inline-flex items-center", className)}>
      {dots.map((index) => {
        const here = index === current;
        const visual = cn(
          "block h-2 rounded-pill transition-[width,background-color] duration-200",
          here ? "w-6 bg-primary" : cn("w-2", seenSet.has(index) || index < current ? "bg-muted-foreground" : "bg-border")
        );
        return onSelect ? (
          <button key={index} type="button" aria-label={`${noun} ${index + 1}`} aria-current={here || undefined} onClick={() => onSelect(index)} className="inline-flex h-6 min-w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-ring">
            <span className={visual} />
          </button>
        ) : (
          <span key={index} aria-hidden="true" className="inline-flex h-6 min-w-4 items-center justify-center"><span className={visual} /></span>
        );
      })}
    </div>
  );
}
