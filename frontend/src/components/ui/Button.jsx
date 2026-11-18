import { Children, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// One button for the whole app. Props are the ones the app already used: variant (primary, secondary, tertiary,
// danger), size (md, sm), `icon` (a lucide component), `loading`, `block`, and `as={Link}` with `to`.
// Gold (primary) marks the one main action on a screen, with dark text on it.
const button = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill border border-transparent px-5 font-sans text-sm font-semibold no-underline transition-[background-color,transform,opacity] duration-150 select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-input bg-card text-foreground hover:bg-muted",
        tertiary: "bg-transparent text-foreground hover:bg-muted",
        danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      },
      size: { md: "min-h-11", sm: "min-h-10 px-4" }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

const Button = forwardRef(function Button(
  { variant = "primary", size = "md", icon: Icon, loading = false, block = false, as: Tag, to, state, replace, onClick, children, disabled, type, className, label, isLoading, isDisabled, tooltip, href, ...rest },
  ref
) {
  const navigate = useNavigate();
  const busy = loading || isLoading;
  const off = disabled || isDisabled || busy;
  const hasText = Children.toArray(children).length > 0;
  const classes = cn(button({ variant, size: typeof size === "string" ? size : "md" }), block && "w-full", !hasText && "aspect-square px-0", className);
  const content = (
    <>
      {busy ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </>
  );
  const common = { ref, className: classes, "aria-label": label || rest["aria-label"], title: tooltip || rest.title, ...rest };

  // `as={Link}` with `to`, or a plain `href`. Navigation keeps the router's own state (where the student came from).
  // A click with a modifier key opens normally.
  if (to !== undefined || href !== undefined || Tag) {
    const Element = Tag || "a";
    const target = Tag ? { to } : { href: href !== undefined ? href : typeof to === "string" ? to : `${to.pathname || ""}${to.search || ""}` };
    return (
      <Element {...common} {...target} aria-disabled={off || undefined} onClick={(event) => {
        if (off) { event.preventDefault(); return; }
        onClick?.(event);
        if (Tag || to === undefined || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(to, { state, replace });
      }}>{content}</Element>
    );
  }
  return <button {...common} type={type || "button"} disabled={off} aria-busy={busy || undefined} onClick={onClick}>{content}</button>;
});

export default Button;
