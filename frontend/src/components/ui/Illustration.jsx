// Three small line drawings in ink plus accent, drawn once here so every screen shares one style.
// Colour comes from tokens only. Decorative, so hidden from screen readers.
const SCENES = {
  // Open book with a flask: login and register.
  study: <>
    <ellipse cx="100" cy="150" rx="70" ry="8" fill="var(--sunken)" />
    <path d="M30 70c24-8 46-6 70 8v66c-24-14-46-16-70-8z" fill="var(--surface)" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M170 70c-24-8-46-6-70 8v66c24-14 46-16 70-8z" fill="var(--surface)" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M44 90c14-3 28-2 42 4M44 106c14-3 28-2 42 4M44 122c14-3 28-2 42 4" stroke="var(--control-line)" strokeWidth="3" strokeLinecap="round" fill="none" />
    <path d="M92 18h16v28l24 42a8 8 0 0 1-7 12H75a8 8 0 0 1-7-12l24-42z" fill="var(--accent-soft)" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M80 76h40l10 18H70z" fill="var(--accent)" />
    <path d="M88 18h24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </>,
  // Empty tray: lists with nothing in them yet.
  empty: <>
    <ellipse cx="100" cy="148" rx="64" ry="7" fill="var(--sunken)" />
    <path d="M36 92l16-36h96l16 36v44a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6z" fill="var(--surface)" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <path d="M36 92h44a20 20 0 0 0 40 0h44" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    <circle cx="100" cy="36" r="10" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="3" />
    <path d="M70 26l-6-8M130 26l6-8" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
  </>,
  // Sheet with a tick: the end of a test.
  done: <>
    <ellipse cx="100" cy="150" rx="56" ry="7" fill="var(--sunken)" />
    <rect x="56" y="22" width="88" height="116" rx="10" fill="var(--surface)" stroke="currentColor" strokeWidth="3" />
    <path d="M72 50h56M72 66h56M72 82h34" stroke="var(--control-line)" strokeWidth="3" strokeLinecap="round" />
    <circle cx="132" cy="112" r="22" fill="var(--accent)" />
    <path d="M122 112l7 7 13-14" fill="none" stroke="var(--on-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </>
};

export default function Illustration({ name = "study", className = "" }) {
  return <svg className={`illustration ${className}`} viewBox="0 0 200 160" aria-hidden="true" focusable="false">{SCENES[name]}</svg>;
}
