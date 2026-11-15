import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, CornerDownLeft, FileText, Search, X } from "lucide-react";
import { api } from "../api/client";
import "../styles/header-search.css";

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
    className="hs-input"
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

  const panel = <div className="hs-panel" id={listId} role="listbox" aria-label="Search results">
    {groups.map((group) => <div key={group.name || "all"} role="group" aria-labelledby={group.name ? `${uid}-${group.name}` : undefined} aria-label={group.name ? undefined : "More"}>
      {group.name && <div className="hs-heading" id={`${uid}-${group.name}`} role="presentation">{group.name}</div>}
      {group.items.map(({ option, index }) => {
        const Icon = option.kind === "lesson" ? BookOpen : option.kind === "recent" ? Clock : option.kind === "all" ? CornerDownLeft : FileText;
        return <div
          key={`${option.kind}-${option.title}-${index}`}
          id={optionId(index)}
          role="option"
          aria-selected={active === index}
          className={`hs-option${active === index ? " is-active" : ""}${option.kind === "all" ? " is-all" : ""}`}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => choose(option)}
          onMouseMove={() => { if (active !== index) setActive(index); }}
        >
          <Icon size={16} aria-hidden="true" />
          <span className="hs-option-text">
            <span className="hs-option-title">{option.title}</span>
            {option.detail && <span className="hs-option-detail">{option.detail}</span>}
          </span>
        </div>;
      })}
    </div>)}
    {ready && status === "loading" && <div className="hs-note" role="status">Searching lessons…</div>}
    {ready && status === "error" && <div className="hs-note" role="status">Lessons could not be searched. Try again.</div>}
    {ready && status === "done" && !lessons.length && <div className="hs-note" role="status">No lessons match “{text}”.</div>}
    {!ready && <div className="hs-note">Type at least 2 letters to search lessons.</div>}
  </div>;

  if (narrow) {
    return <>
      <button className="icon-button" type="button" aria-label="Search" title="Search" onClick={() => setOpen(true)}><Search size={20} aria-hidden="true" /></button>
      {open && createPortal(<div className="hs-overlay" role="dialog" aria-modal="true" aria-label="Search">
        <div className="hs-overlay-bar">
          <div className="hs-field is-open"><Search size={16} aria-hidden="true" />{input}</div>
          <button className="hs-cancel" type="button" onClick={close}>Cancel</button>
        </div>
        <div className="hs-overlay-body">{panel}</div>
      </div>, document.body)}
    </>;
  }

  return <div className="hs-root" ref={rootRef}>
    <div className={`hs-field${open ? " is-open" : ""}`}>
      <Search size={16} aria-hidden="true" />
      {input}
      {query
        ? <button className="hs-clear" type="button" aria-label="Clear search" onPointerDown={(event) => event.preventDefault()} onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X size={14} aria-hidden="true" /></button>
        : <kbd className="hs-key" aria-hidden="true">/</kbd>}
    </div>
    {open && panel}
  </div>;
}
