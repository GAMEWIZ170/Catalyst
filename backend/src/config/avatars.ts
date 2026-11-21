export const AVATAR_KEYS = [
  "beaker",
  "flask",
  "atom",
  "test-tube",
  "microscope",
  "flame",
  "molecule",
  "magnet",
  "crystal",
  "dna",
  "leaf",
  "periodic-tile"
] as const;

export type AvatarKey = (typeof AVATAR_KEYS)[number];
