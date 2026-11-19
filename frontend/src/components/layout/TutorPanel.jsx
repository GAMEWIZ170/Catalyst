import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, MessageCircle, Plus, Trash2, X } from "lucide-react";
import { DropdownMenu } from "../ui";
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

// Past chats are kept in this browser only (the server keeps no conversation). Up to 10 per lesson or set.
const MAX_CHATS = 10;
const storeKey = (key) => "catalyst-chats:" + key;
function readChats(key) {
  try { const list = JSON.parse(localStorage.getItem(storeKey(key)) || "[]"); return Array.isArray(list) ? list : []; } catch { return []; }
}
function writeChats(key, list) {
  try { localStorage.setItem(storeKey(key), JSON.stringify(list)); } catch { /* a full or blocked store only means chats are not remembered */ }
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
  const targetKey = target ? target.kind + ":" + target.id : "general";
  const [chats, setChats] = useState([]);
  // n changes whenever a different chat is opened, which gives the Companion a fresh start with these turns.
  const [shown, setShown] = useState({ n: 0, turns: [] });
  const chatsRef = useRef([]);
  const activeId = useRef(null);

  useEffect(() => {
    const list = readChats(targetKey);
    chatsRef.current = list;
    activeId.current = null;
    setChats(list);
    setShown((current) => ({ n: current.n + 1, turns: [] }));
  }, [targetKey]);

  const newChat = () => { activeId.current = null; setShown((current) => ({ n: current.n + 1, turns: [] })); };
  const openChat = (chat) => { activeId.current = chat.id; setShown((current) => ({ n: current.n + 1, turns: chat.turns })); };
  const clearChats = () => { chatsRef.current = []; writeChats(targetKey, []); setChats([]); newChat(); };
  const rememberTurns = (turns) => {
    if (!activeId.current) activeId.current = String(Date.now());
    const title = (turns.find((turn) => turn.role === "user")?.content || "Chat").slice(0, 40);
    const entry = { id: activeId.current, title, turns: turns.slice(-30), at: Date.now() };
    const list = [entry, ...chatsRef.current.filter((item) => item.id !== entry.id)].slice(0, MAX_CHATS);
    chatsRef.current = list;
    writeChats(targetKey, list);
    setChats(list);
  };
  const activeTitle = chats.find((item) => item.id === activeId.current)?.title;
  const menu = [
    { label: "New chat", icon: Plus, onSelect: newChat },
    ...(chats.length ? [{ separator: true }, ...chats.map((item) => ({ label: item.title, onSelect: () => openChat(item) })), { separator: true }, { label: "Delete saved chats", icon: Trash2, onSelect: clearChats }] : [])
  ];

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const body = <>
    <div className="flex items-center justify-between px-4 pt-3 pb-2">
      <h2 className="m-0 min-w-0 font-display text-lg font-semibold">
        <DropdownMenu align="start" items={menu} trigger={<button type="button" aria-label="Chats" className="inline-flex max-w-[16rem] items-center gap-1 rounded-md py-1 pr-1 font-display text-lg font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><span className="truncate">{activeTitle || "Tutor"}</span><ChevronDown size={16} className="shrink-0" aria-hidden="true" /></button>} />
      </h2>
      <div className="flex items-center">
        <button type="button" aria-label="New chat" onClick={newChat} className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><Plus size={20} aria-hidden="true" /></button>
        <button ref={closeRef} type="button" aria-label="Close tutor" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X size={20} aria-hidden="true" /></button>
      </div>
    </div>
    <div className="min-h-0 flex-1 px-4 pb-4">
      <Companion key={`${targetKey}-${shown.n}`} kind={target ? target.kind : "general"} id={target ? target.id : undefined} initialTurns={shown.turns} onTurns={rememberTurns} />
    </div>
  </>;

  if (wide) {
    return <>
      <AnimatePresence initial={false}>
      {open && <motion.aside key="dock" aria-label="Tutor" className="my-2 flex shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
        initial={{ width: 0, opacity: 0 }} animate={{ width: 400, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
        <div className="flex h-full w-[400px] flex-col">{body}</div>
      </motion.aside>}
    </AnimatePresence>
      <div className="m-2 flex w-20 shrink-0 flex-col items-center justify-end rounded-2xl border border-border bg-card pb-6">
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
