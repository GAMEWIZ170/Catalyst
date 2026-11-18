import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import Companion from "../learn/Companion";
import { useTutor } from "../../context/TutorContext";
import { cn } from "@/lib/utils";

// Wide screens (1024 px and up): the tutor docks on the right and pushes the page. Smaller screens: it is a sheet
// that slides up from the bottom over a dimmed page. One Companion either way, so the chat is never lost on resize.
export function useWide() {
  const query = "(min-width: 1024px)";
  const get = () => (typeof window !== "undefined" && window.matchMedia(query).matches);
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const media = window.matchMedia(query);
    const change = (event) => setWide(event.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return wide;
}

export default function TutorPanel() {
  const { target, open, setOpen } = useTutor();
  const wide = useWide();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!target) return null;
  const body = <>
    <div className="flex items-center justify-between px-4 pt-3">
      <h2 className="font-display text-lg font-semibold">Tutor</h2>
      <button ref={closeRef} type="button" aria-label="Close tutor" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <X size={20} aria-hidden="true" />
      </button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      <Companion kind={target.kind} id={target.id} embedded />
    </div>
  </>;

  if (wide) {
    return <AnimatePresence initial={false}>
      {open && <motion.aside key="dock" aria-label="Tutor" className="flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-card"
        initial={{ width: 0, opacity: 0 }} animate={{ width: 380, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex h-full w-[380px] flex-col">{body}</div>
      </motion.aside>}
    </AnimatePresence>;
  }

  return <AnimatePresence>
    {open && <>
      <motion.div key="scrim" className="fixed inset-0 z-40 bg-foreground/40" aria-hidden="true" onClick={() => setOpen(false)}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
      <motion.aside key="sheet" role="dialog" aria-label="Tutor"
        className={cn("fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] min-h-[50dvh] flex-col rounded-t-xl bg-card pb-[env(safe-area-inset-bottom)] shadow-lg")}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        {body}
      </motion.aside>
    </>}
  </AnimatePresence>;
}
