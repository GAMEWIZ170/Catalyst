import { Children, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button as AstryxButton } from "@astryxdesign/core/Button";

// One button for the whole app, drawn by Astryx. The props are the ones the app already used:
// variant (primary, secondary, tertiary, danger), `icon` (a lucide component), `loading`, `block`, and `as={Link}` with `to`.
// Put several in <div className="button-row">.
const VARIANT = { primary: "primary", secondary: "secondary", tertiary: "ghost", danger: "destructive" };

// Astryx wants the accessible name as a string. Text children give it. Other children (an icon next to a word) keep
// their text as the name and are drawn as the visible content.
function split(children) {
  const parts = Children.toArray(children);
  const text = parts.filter((part) => typeof part === "string" || typeof part === "number").join("").trim();
  const hasElements = parts.some((part) => typeof part !== "string" && typeof part !== "number");
  return { label: text, visible: hasElements ? children : undefined };
}

const Button = forwardRef(function Button(
  { variant = "primary", icon: Icon, loading = false, block = false, as: Tag, to, state, replace, onClick, children, disabled, type, className, ...rest },
  ref
) {
  const navigate = useNavigate();
  const { label, visible } = split(children);
  const props = {
    ref,
    label: label || rest["aria-label"] || "",
    variant: VARIANT[variant] || "primary",
    icon: Icon ? <Icon size={16} aria-hidden="true" /> : undefined,
    isLoading: loading,
    isDisabled: disabled,
    width: block ? "100%" : undefined,
    type: Tag ? undefined : type || "button",
    ...rest
  };
  // Navigation keeps the router's own state (where the student came from). A click with a modifier key opens normally.
  if (to !== undefined) {
    return <AstryxButton {...props} href={typeof to === "string" ? to : `${to.pathname || ""}${to.search || ""}`} onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(to, { state, replace });
    }}>{visible}</AstryxButton>;
  }
  return <AstryxButton {...props} onClick={onClick}>{visible}</AstryxButton>;
});

export default Button;
