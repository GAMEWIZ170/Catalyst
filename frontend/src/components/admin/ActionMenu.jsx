import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export default function ActionMenu({ actions }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!event.target.closest("[data-action-menu]")) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector("[role='menuitem']")?.focus();
  }, [open]);

  function moveFocus(event) {
    const items = [...menuRef.current.querySelectorAll("[role='menuitem']")];
    const current = items.indexOf(document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(current + direction + items.length) % items.length]?.focus();
    }
  }

  return <div className="relative" data-action-menu>
    <button ref={buttonRef} className="min-h-11 cursor-pointer border-0 bg-transparent p-2 text-brand-ink" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <MoreHorizontal size={20} aria-hidden="true" /><span className="sr-only">More actions</span>
    </button>
    {open && <div ref={menuRef} className="absolute top-full right-0 z-[3] grid min-w-40 rounded-[6px] border border-border bg-card p-1 shadow-md" role="menu" onKeyDown={moveFocus}>
      {actions.map((action) => <button className="min-h-11 cursor-pointer border-0 bg-transparent px-3 py-2 text-left hover:bg-background focus-visible:bg-background" key={action.label} role="menuitem" tabIndex="-1" type="button" onClick={() => { setOpen(false); action.onSelect(); }}>{action.label}</button>)}
    </div>}
  </div>;
}
