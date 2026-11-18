import { cn } from "@/lib/utils";

// The three rating tiles: fixed positions, keys 1 to 3, solid colour with light text. They stay in place (dimmed) before
// the card is flipped so the layout never jumps. The values are the ones the API already takes.
export const RATINGS = [
  { value: "unknown", label: "Don't know", tile: "bg-rate-again" },
  { value: "unsure", label: "Unsure", tile: "bg-rate-hard" },
  { value: "confident", label: "Confident", tile: "bg-rate-good" }
];

export default function RatingTiles({ enabled, saving, onRate }) {
  return (
    <div role="group" aria-label="How well did you know it?" className="grid grid-cols-3 gap-2 sm:gap-3">
      {RATINGS.map((rating, index) => (
        <button
          key={rating.value}
          type="button"
          disabled={!enabled || saving}
          onClick={() => onRate(rating.value)}
          className={cn(
            "flex min-h-20 min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-0 px-2 font-sans text-sm font-semibold text-on-rate transition-[transform,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:cursor-default disabled:opacity-40 disabled:active:scale-100 motion-reduce:active:scale-100",
            rating.tile
          )}
        >
          <span aria-hidden="true" className="hidden min-w-6 rounded-md border border-on-rate/60 px-1.5 text-xs sm:inline-block">{index + 1}</span>
          {rating.label}
        </button>
      ))}
    </div>
  );
}
