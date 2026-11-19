import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, X } from "lucide-react";
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

// The always-visible Chat button on the right edge (floating on small screens). It opens the tutor for the page the student is on.
function SideButton({ round = false }) {
  const { open, setOpen } = useTutor();
  return <button type="button" aria-expanded={open} aria-label={open ? "Close tutor" : "Open tutor"} onClick={() => setOpen(!open)}
    className={cn("group flex flex-col items-center gap-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", round && "rounded-full bg-card p-1 shadow-lg ring-1 ring-border")}>
    <span className={cn("grid size-12 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105 group-active:scale-95", open && "ring-2 ring-foreground")}><MessageCircle size={24} aria-hidden="true" /></span>
    {!round && <span>Chat</span>}
  </button>;
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

  const body = <>
    <div className="flex items-center justify-between px-4 pt-3">
      <h2 className="font-display text-lg font-semibold">Tutor</h2>
      <button ref={closeRef} type="button" aria-label="Close tutor" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        <X size={20} aria-hidden="true" />
      </button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
      {target ? <Companion kind={target.kind} id={target.id} embedded /> : <p className="m-0 text-muted-foreground">Open a lesson or a study set, then ask me about it. I read only that lesson or set, and I give hints, not final answers.</p>}
    </div>
  </>;

  if (wide) {
    return <>
      <AnimatePresence initial={false}>
      {open && <motion.aside key="dock" aria-label="Tutor" className="flex h-full shrink-0 flex-col overflow-hidden border-l border-border bg-card"
        initial={{ width: 0, opacity: 0 }} animate={{ width: 380, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex h-full w-[380px] flex-col">{body}</div>
      </motion.aside>}
    </AnimatePresence>
      <div className="flex w-20 shrink-0 flex-col items-center justify-end border-l border-border bg-card pb-6">
        <SideButton />
      </div>
    </>;
  }

  return <>
    <div className="fixed right-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30"><SideButton round /></div>
    <AnimatePresence>
    {open && <>
      <motion.div key="scrim" className="fixed inset-0 z-40 bg-foreground/40" aria-hidden="true" onClick={() => setOpen(false)}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} />
      <motion.aside key="sheet" role="dialog" aria-label="Tutor"
        className={cn("fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] min-h-[50dvh] flex-col rounded-t-xl bg-card pb-[env(safe-area-inset-bottom)] shadow-lg")}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
        {body}
      </motion.aside>
    </>}
  </AnimatePresence>
  </>;
}
