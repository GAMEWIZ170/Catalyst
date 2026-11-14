// Turns pasted lines like "mole - amount of substance" into cards. Each line is split at the first separator found:
// a tab, then " - ", " – ", " — " (a dash with spaces round it), then a colon. Lines with no separator are counted and skipped.
const SEPARATORS = [/\t/, /\s[-–—]\s/, /:/];

export function parsePastedCards(text) {
  const cards = [];
  let skipped = 0;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let found = null;
    for (const separator of SEPARATORS) {
      const match = separator.exec(line);
      if (match) {
        const front = line.slice(0, match.index).trim();
        const back = line.slice(match.index + match[0].length).trim();
        if (front && back) { found = { front: front.slice(0, 500), back: back.slice(0, 500) }; break; }
      }
    }
    if (found) cards.push(found);
    else skipped += 1;
  }
  return { cards, skipped };
}
