// Profile pictures. Each one is a white line drawing on its own bright colour, so they look the
// same in light and dark mode. These colours are artwork, not interface colours, which is why they
// are written here and not in tokens.css. The keys match the backend's allowed avatar list.
const LINE = "#FFFFFF";

const COLORS = {
  beaker: "#0891B2",
  flask: "#7C3AED",
  atom: "#2563EB",
  "test-tube": "#DB2777",
  microscope: "#475569",
  flame: "#EA580C",
  molecule: "#0D9488",
  magnet: "#DC2626",
  crystal: "#4F46E5",
  dna: "#D97706",
  leaf: "#16A34A",
  "periodic-tile": "#E11D48",
};

const SHAPES = {
  beaker: (
    <>
      <path d="M22 32 H42 V46 a6 6 0 0 1 -6 6 H28 a6 6 0 0 1 -6 -6 Z" fill="#FFFFFF" fillOpacity="0.32" stroke="none" />
      <path d="M22 16 V46 a6 6 0 0 0 6 6 H36 a6 6 0 0 0 6 -6 V16" />
      <path d="M19 16 H45" />
      <path d="M22 32 H42" />
      <path d="M22 24 H27" />
      <path d="M22 40 H27" />
      <circle cx="33" cy="44" r="1.8" fill="#FDE68A" stroke="none" />
      <circle cx="37.5" cy="38.5" r="1.4" fill="#FDE68A" stroke="none" />
    </>
  ),
  flask: (
    <>
      <path d="M19.4 42 H44.6 L48 47 a4 4 0 0 1 -3.5 6 H19.5 a4 4 0 0 1 -3.5 -6 Z" fill="#FFFFFF" fillOpacity="0.32" stroke="none" />
      <path d="M27 14 H37" />
      <path d="M28 14 V27 L16 47 a4 4 0 0 0 3.5 6 H44.5 a4 4 0 0 0 3.5 -6 L36 27 V14" />
      <path d="M21 42 H43" />
      <circle cx="31" cy="47.5" r="1.9" fill="#FDE68A" stroke="none" />
      <circle cx="37" cy="46" r="1.3" fill="#FDE68A" stroke="none" />
    </>
  ),
  atom: (
    <>
      <ellipse cx="32" cy="32" rx="19" ry="7.5" />
      <ellipse cx="32" cy="32" rx="19" ry="7.5" transform="rotate(60 32 32)" />
      <ellipse cx="32" cy="32" rx="19" ry="7.5" transform="rotate(120 32 32)" />
      <circle cx="32" cy="32" r="4" fill="#FDE68A" stroke="none" />
    </>
  ),
  "test-tube": (
    <>
      <g transform="rotate(35 32 32)">
      <path d="M26 31 H38 V41 a6 6 0 0 1 -12 0 Z" fill="#FFFFFF" fillOpacity="0.32" stroke="none" />
      <path d="M26 11 V41 a6 6 0 0 0 12 0 V11" />
      <path d="M23.5 11 H40.5" />
      <path d="M26 31 H38" />
      <circle cx="32" cy="40" r="1.8" fill="#FDE68A" stroke="none" />
      </g>
    </>
  ),
  microscope: (
    <>
      <rect x="24" y="11" width="10" height="23" rx="2.5" transform="rotate(-25 29 22)" />
      <path d="M37 28 C47 30 47 46 36 50" />
      <path d="M22 42 H34" />
      <path d="M18 52 H46" />
      <circle cx="28" cy="38" r="2" fill="#FDE68A" stroke="none" />
    </>
  ),
  flame: (
    <>
      <path d="M32 12 C34 22 46 27 46 39 A14 14 0 0 1 18 39 C18 31 24 29 27 22 C29 26 31 24 32 12 Z" />
      <path d="M32 52 A7 7 0 0 1 25 45 C25 40 32 38 32 31 C32 38 39 40 39 45 A7 7 0 0 1 32 52 Z" fill="#FDE68A" />
    </>
  ),
  molecule: (
    <>
      <path d="M29.1 23.3 L22.9 34.7" />
      <path d="M34.9 23.3 L41.1 34.7" />
      <path d="M26 40 H38" />
      <circle cx="32" cy="18" r="6" fill="#FDE68A" />
      <circle cx="20" cy="40" r="6" fill="#FFFFFF" fillOpacity="0.32" />
      <circle cx="44" cy="40" r="6" fill="#FFFFFF" fillOpacity="0.32" />
    </>
  ),
  magnet: (
    <>
      <path d="M16 14 V36 a16 16 0 0 0 32 0 V14 H38 V36 a6 6 0 0 1 -12 0 V14 Z" />
      <path d="M16 23 H26" stroke="#FDE68A" />
      <path d="M38 23 H48" stroke="#FDE68A" />
    </>
  ),
  crystal: (
    <>
      <path d="M18 24 L26 14 H38 L46 24 Z" fill="#FFFFFF" fillOpacity="0.32" stroke="none" />
      <path d="M18 24 L26 14 H38 L46 24 L32 50 Z" />
      <path d="M18 24 H46" />
      <path d="M26 14 L32 24 L38 14" />
      <path d="M32 24 V50" stroke="#FDE68A" />
    </>
  ),
  dna: (
    <>
      <path d="M24 12 C24 22 40 22 40 32 C40 42 24 42 24 52" />
      <path d="M40 12 C40 22 24 22 24 32 C24 42 40 42 40 52" />
      <path d="M29 18 H35" stroke="#FDE68A" />
      <path d="M25 32 H39" stroke="#FDE68A" />
      <path d="M29 46 H35" stroke="#FDE68A" />
    </>
  ),
  leaf: (
    <>
      <path d="M18 48 C16 28 28 15 48 16 C50 36 38 50 18 48 Z" fill="#FFFFFF" fillOpacity="0.26" />
      <path d="M18 48 C26 38 34 30 42 22" stroke="#FDE68A" />
    </>
  ),
  "periodic-tile": (
    <>
      <rect x="17" y="14" width="30" height="36" rx="4" fill="#FFFFFF" fillOpacity="0.26" />
      <path d="M22 21 H28" />
      <path d="M37.2 32.6 A6 6 0 1 0 37.2 40.4" stroke="#FDE68A" />
      <path d="M22 44 H42" />
    </>
  ),
};

export const AVATAR_LABELS = {
  beaker: "Beaker",
  flask: "Flask",
  atom: "Atom",
  "test-tube": "Test tube",
  microscope: "Microscope",
  flame: "Flame",
  molecule: "Molecule",
  magnet: "Magnet",
  crystal: "Crystal",
  dna: "DNA",
  leaf: "Leaf",
  "periodic-tile": "Periodic table tile",
};

export const AVATAR_KEYS = Object.keys(SHAPES);

const initialsOf = (name) =>
  (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

// avatar: one of AVATAR_KEYS, or null/undefined (a circle with the person's initials is shown).
export default function Avatar({ avatar, name, size = 40, className = "" }) {
  const shape = SHAPES[avatar];

  if (!shape) {
    return (
      <span
        className={`avatar avatar--initials ${className}`.trim()}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        role="img"
        aria-label={name ? `Profile picture of ${name}` : "Profile picture"}
      >
        {initialsOf(name) || "?"}
      </span>
    );
  }

  return (
    <svg
      className={`avatar ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={AVATAR_LABELS[avatar]}
    >
      <circle cx="32" cy="32" r="32" fill={COLORS[avatar]} />
      <g fill="none" stroke={LINE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {shape}
      </g>
    </svg>
  );
}
