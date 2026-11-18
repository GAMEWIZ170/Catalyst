import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// Keyboard hint pill: <Keycap>Space</Keycap>. Decorative, so screen readers skip it (the button it sits in has a name).
export function Keycap({ children, className }) {
  return (
    <kbd aria-hidden="true" className={cn("inline-flex min-w-6 items-center justify-center rounded-md border border-input bg-muted px-1.5 py-0.5 font-sans text-xs font-semibold text-muted-foreground", className)}>
      {children}
    </kbd>
  );
}

// A pill button that shows its key, like the flashcard row: Prev, Space Flip, Next.
// <KeycapButton keyLabel="Space" onClick={flip}>Flip</KeycapButton>
export const KeycapButton = forwardRef(function KeycapButton({ keyLabel, children, className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn("inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-pill border border-input bg-card px-4 font-sans text-sm font-semibold text-foreground transition-[background-color,transform] duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100", className)}
      {...rest}
    >
      {keyLabel ? <Keycap>{keyLabel}</Keycap> : null}
      {children}
    </button>
  );
});

export default Keycap;
