import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { iconButton } from "./topbarStyles";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, CornerDownLeft, FileText, Search, X } from "lucide-react";
import { api } from "../../api/client";

const RECENT_KEY = "catalyst-recent-searches";
const PAGES = [
  { title: "Home", to: "/home" },
  { title: "Courses", to: "/courses" },
  { title: "Review", to: "/review" },
  { title: "Study Lab", to: "/lab" },
  { title: "Community sets", to: "/community" },
  { title: "Topics", to: "/topics" },
  { title: "Progress", to: "/progress" },
  { title: "Exams", to: "/exams" },
  { title: "Friends", to: "/friends" },
  { title: "Saved", to: "/saved" },
  { title: "Settings", to: "/settings" },
  { title: "Me", to: "/me" }
];

const readRecent = () => {
  try { return JSON.parse(window.localStorage.getItem(RECENT_KEY) || "[]").filter((item) => typeof item === "string").slice(0, 5); } catch { return []; }
};
const writeRecent = (list) => {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* recents are a convenience only */ }
};
const isTyping = (target) => Boolean(target?.closest?.("input, textarea, select, [contenteditable='true'], [contenteditable='']"));

// The search field in the top bar (GitHub style). Lessons come from the existing search API; pages are matched on this device.
// Under 640 px it is an icon that opens a full-screen search. It follows the ARIA combobox pattern.
const FIELD = "flex items-center gap-2 rounded-[6px] border border-input bg-muted pr-2 pl-3 text-muted-foreground transition-colors hover:border-muted-foreground focus-within:border-primary focus-within:bg-card focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-primary motion-reduce:transition-none [&_svg]:shrink-0";
const FIELD_OPEN = "border-primary bg-card outline-2 -outline-offset-1 outline-primary";

export default function HeaderSearch() {
  const navigate = useNavigate();
  const uid = useId();
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [status, setStatus] = useState("idle");   // idle, loading, done, error
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState(readRecent);
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 639px)").matches);
  const text = query.trim();
  const ready = text.length >= 2;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // A slower answer for an older search must not replace a newer one.
  useEffect(() => {
    if (!ready) { setLessons([]); setStatus("idle"); return undefined; }
    let live = true;
    setStatus("loading");
    const timer = window.setTimeout(() => {
      api.search(text)
        .then(({ data }) => { if (live) { setLessons((data || []).slice(0, 6)); setStatus("done"); } })
        .catch(() => { if (live) { setLessons([]); setStatus("error"); } });
    }, 200);
    return () => { live = false; window.clearTimeout(timer); };
  }, [text, ready]);

  const pages = useMemo(() => (ready ? PAGES.filter((page) => page.title.toLowerCase().includes(text.toLowerCase())) : []), [text, ready]);

  // One flat list of options so the arrow keys and aria-activedescendant are simple.
  const options = useMemo(() => {
    const list = [];
    if (!ready) {
      recent.forEach((item) => list.push({ kind: "recent", group: "Recent searches", title: item, run: item }));
      if (!recent.length) PAGES.slice(0, 5).forEach((page) => list.push({ kind: "page", group: "Pages", title: page.title, to: page.to }));
      return list;
    }
    lessons.forEach((item) => list.push({ kind: "lesson", group: "Lessons", title: item.title, detail: `${item.course} · ${item.unit}`, to: `/lessons/${item.lessonId}`, state: { from: `/courses/${item.courseId}` } }));
    pages.forEach((page) => list.push({ kind: "page", group: "Pages", title: page.title, to: page.to }));
    list.push({ kind: "all", group: "", title: `See all results for “${text}”`, to: `/search?q=${encodeURIComponent(text)}` });
    return list;
  }, [ready, recent, lessons, pages, text]);

  useEffect(() => { setActive(-1); }, [options.length, text]);

  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);

  function remember(value) {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, 5);
    setRecent(next);
    writeRecent(next);
  }

  function choose(option) {
    if (option.kind === "recent") { setQuery(option.run); inputRef.current?.focus(); return; }
    if (ready) remember(text);
    close();
    inputRef.current?.blur();
    navigate(option.to, option.state ? { state: option.state } : undefined);
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (active >= 0 && options[active]) choose(options[active]);
      else if (ready) choose(options[options.length - 1]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (open) close(); else inputRef.current?.blur();
    }
  }

  // "/" and Ctrl+K focus the search, never while the student is typing somewhere else.
  useEffect(() => {
    function onKey(event) {
      const slash = event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !isTyping(event.target);
      const chord = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey);
      if (!slash && !chord) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open, narrow]);

  // Click or focus outside closes the desktop panel.
  useEffect(() => {
    if (!open || narrow) return undefined;
    const onPointer = (event) => { if (!rootRef.current?.contains(event.target)) close(); };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open, narrow, close]);

  const listId = `${uid}-list`;
  const optionId = (index) => `${uid}-opt-${index}`;

  const input = <input
    ref={inputRef}
    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-foreground outline-0 placeholder:text-muted-foreground focus:shadow-none focus:outline-0 focus-visible:shadow-none focus-visible:outline-0 [.hs-overlay_&]:text-base"
    type="text"
    role="combobox"
    aria-label="Search lessons and pages"
    aria-expanded={open}
    aria-controls={listId}
    aria-autocomplete="list"
    aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
    autoComplete="off"
    spellCheck="false"
    enterKeyHint="search"
    placeholder="Search lessons and pages"
    value={query}
    onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
    onFocus={() => setOpen(true)}
    onKeyDown={onKeyDown}
  />;

  const groups = [];
  options.forEach((option, index) => {
    const last = groups[groups.length - 1];
    if (last && last.name === option.group) last.items.push({ option, index });
    else groups.push({ name: option.group, items: [{ option, index }] });
  });

  const panel = <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-20 max-h-[min(70vh,480px)] origin-top overflow-y-auto rounded-md border border-border bg-card p-2 shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 [.hs-overlay_&]:static [.hs-overlay_&]:max-h-none [.hs-overlay_&]:animate-none [.hs-overlay_&]:overflow-visible [.hs-overlay_&]:rounded-none [.hs-overlay_&]:border-0 [.hs-overlay_&]:p-0 [.hs-overlay_&]:shadow-none" id={listId} role="listbox" aria-label="Search results">
    {groups.map((group) => <div key={group.name || "all"} role="group" aria-labelledby={group.name ? `${uid}-${group.name}` : undefined} aria-label={group.name ? undefined : "More"}>
      {group.name && <div className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground" id={`${uid}-${group.name}`} role="presentation">{group.name}</div>}
      {group.items.map(({ option, index }) => {
        const Icon = option.kind === "lesson" ? BookOpen : option.kind === "recent" ? Clock : option.kind === "all" ? CornerDownLeft : FileText;
        return <div
          key={`${option.kind}-${option.title}-${index}`}
          id={optionId(index)}
          role="option"
          aria-selected={active === index}
          className={`flex min-h-10 cursor-pointer items-center gap-2 px-2 py-1 [&_svg]:shrink-0 [&_svg]:text-muted-foreground ${option.kind === "all" ? "mt-1 rounded-b-[6px] border-t border-border" : "rounded-[6px]"} ${active === index ? "bg-primary/15" : ""}`}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => choose(option)}
          onMouseMove={() => { if (active !== index) setActive(index); }}
        >
          <Icon size={16} aria-hidden="true" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm">{option.title}</span>
            {option.detail && <span className="truncate text-xs text-muted-foreground">{option.detail}</span>}
          </span>
        </div>;
      })}
    </div>)}
    {ready && status === "loading" && <div className="p-2 text-sm text-muted-foreground" role="status">Searching lessons…</div>}
    {ready && status === "error" && <div className="p-2 text-sm text-muted-foreground" role="status">Lessons could not be searched. Try again.</div>}
    {ready && status === "done" && !lessons.length && <div className="p-2 text-sm text-muted-foreground" role="status">No lessons match “{text}”.</div>}
    {!ready && <div className="p-2 text-sm text-muted-foreground">Type at least 2 letters to search lessons.</div>}
  </div>;

  if (narrow) {
    return <>
      <button className={iconButton} type="button" aria-label="Search" title="Search" onClick={() => setOpen(true)}><Search size={20} aria-hidden="true" /></button>
      {open && createPortal(<div className="hs-overlay fixed inset-0 z-[200] flex flex-col bg-card" role="dialog" aria-modal="true" aria-label="Search">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className={cn(FIELD, "h-10 flex-1", FIELD_OPEN)}><Search size={16} aria-hidden="true" />{input}</div>
          <button className="min-h-11 border-0 bg-transparent px-1 font-semibold text-brand-ink" type="button" onClick={close}>Cancel</button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">{panel}</div>
      </div>, document.body)}
    </>;
  }

  return <div className="relative w-[320px] min-w-0 flex-[0_1_320px]" ref={rootRef}>
    <div className={cn(FIELD, "h-[34px]", open && FIELD_OPEN)}>
      <Search size={16} aria-hidden="true" />
      {input}
      {query
        ? <button className="inline-flex size-6 items-center justify-center rounded-[6px] border-0 bg-transparent p-0 text-muted-foreground hover:bg-muted hover:text-foreground" type="button" aria-label="Clear search" onPointerDown={(event) => event.preventDefault()} onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X size={14} aria-hidden="true" /></button>
        : <kbd className="inline-flex size-5 items-center justify-center rounded-[4px] border border-input text-xs text-muted-foreground" aria-hidden="true">/</kbd>}
    </div>
    {open && panel}
  </div>;
}
