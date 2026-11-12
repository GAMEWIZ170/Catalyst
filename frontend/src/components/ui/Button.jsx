import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

// One button for the whole app. Variants: primary, secondary, tertiary, danger.
// Use `as={Link}` for navigation. Use `icon` for a 16 px leading icon. Put several in <div className="button-row">.
const Button = forwardRef(function Button(
  { variant = "primary", icon: Icon, loading = false, block = false, as: Tag = "button", className = "", children, disabled, ...rest },
  ref
) {
  const classes = ["button", `button-${variant}`, block ? "button-block" : "", className].filter(Boolean).join(" ");
  const buttonProps = Tag === "button" ? { type: rest.type || "button", disabled: disabled || loading } : {};
  return (
    <Tag ref={ref} className={classes} aria-busy={loading || undefined} {...rest} {...buttonProps}>
      {loading ? <Loader2 className="button-spinner" size={16} aria-hidden="true" /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
      <span>{children}</span>
    </Tag>
  );
});

export default Button;
