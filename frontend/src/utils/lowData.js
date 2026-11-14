// Low-data mode: a setting for slow or expensive connections. It is saved on this device (like text size),
// not on the account, because it depends on the phone and the network, not on the student.
// Effects: smaller images, no video preview picture (the Play button stays), and no loading ahead of links.
const KEY = "catalyst-lowdata";

export const isLowData = () => typeof document !== "undefined" && document.documentElement.dataset.lowdata === "1";

export function setLowData(on) {
  if (on) document.documentElement.dataset.lowdata = "1";
  else delete document.documentElement.dataset.lowdata;
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    // The setting still applies until the page is closed when storage is unavailable.
  }
}
