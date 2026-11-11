// Paints the browser bar with the page colour. Reads --paper from the active palette, so no colour is repeated here.
export function syncThemeColor() {
  const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
  if (paper) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", paper);
}
