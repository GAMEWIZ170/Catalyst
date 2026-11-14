import { useEffect, useState } from "react";

// Offline support and "install to home screen". The worker itself is public/sw.js.
const LESSON_CACHE = "catalyst-lessons-v1";

// Only the built site registers the worker. In `npm run dev` a worker would serve old files and confuse the work.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// With no network the app cannot ask the server who is logged in, and would send the student to the login page.
// So the last profile the server gave (name, email, role, settings: no password and no token) is kept on the device
// and used ONLY when the request fails for lack of a network. A refusal from the server (401) still means logged out,
// and every request to the server is still checked by the server. The login itself stays in the httpOnly cookie.
const USER_KEY = "catalyst-offline-user";

export function rememberUser(user) {
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Without storage the app simply asks the server each time.
  }
}

export function recallUser() {
  try {
    return JSON.parse(window.localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

function forgetUser() {
  try {
    window.localStorage.removeItem(USER_KEY);
  } catch {
    // nothing to remove
  }
}

// The saved lessons hold the student's own notes and progress, so they are removed whenever someone logs in,
// registers, logs out or deletes the account, together with the remembered profile. The next person on the same
// phone sees nothing of the last one.
export function clearOfflineData() {
  forgetUser();
  if (typeof caches === "undefined") return Promise.resolve();
  return caches.delete(LESSON_CACHE).catch(() => {});
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

// The browser offers install once, early, so it is kept here until the student presses the button in Settings.
let installEvent = null;
const listeners = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event;
    listeners.forEach((run) => run());
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    listeners.forEach((run) => run());
  });
}

export function useInstall() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const run = () => refresh((n) => n + 1);
    listeners.add(run);
    return () => listeners.delete(run);
  }, []);
  const installed = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;
  return {
    installed,
    canInstall: Boolean(installEvent),
    async install() {
      if (!installEvent) return;
      installEvent.prompt();
      await installEvent.userChoice.catch(() => {});
      installEvent = null;
      listeners.forEach((run) => run());
    }
  };
}
