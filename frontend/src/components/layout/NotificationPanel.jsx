import { useCallback, useEffect, useState } from "react";
import { popoverPanel } from "./topbarStyles";
import { Link } from "react-router-dom";
import { api } from "../../api/client";

// Loads the bell's data: once when the student is signed in, again when the tab comes back into view,
// and (through refresh) every time the panel opens. A failed load leaves the old numbers in place.
export function useNotifications(enabled) {
  const [state, setState] = useState({ unread: 0, items: [], loaded: false });

  const refresh = useCallback(() => {
    if (!enabled) return Promise.resolve();
    return api.getNotifications()
      .then(({ data }) => setState({ unread: data.unread, items: data.items, loaded: true }))
      .catch(() => {});
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, refresh]);

  // Local state changes first, so the count drops at once; the request follows.
  const markRead = useCallback((id) => {
    setState((s) => {
      const target = s.items.find((n) => n.id === id);
      if (!target || target.read) return s;
      return { ...s, unread: Math.max(0, s.unread - 1), items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) };
    });
    api.markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setState((s) => ({ ...s, unread: 0, items: s.items.map((n) => ({ ...n, read: true })) }));
    api.markAllNotificationsRead().catch(() => {});
  }, []);

  return { ...state, refresh, markRead, markAllRead };
}

const timeAgo = (iso) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

export default function NotificationPanel({ notifications, onNavigate }) {
  const { unread, items, loaded, markRead, markAllRead } = notifications;
  return <section className={`${popoverPanel} grid max-h-[min(70dvh,28rem)] w-[min(340px,calc(100vw-2rem))] gap-2 overflow-y-auto p-3 [&_span]:text-sm [&_span]:text-muted-foreground`} id="notification-panel" aria-label="Notifications">
    <div className="flex items-center justify-between gap-3">
      <strong>Notifications</strong>
      <button className="min-h-11 cursor-pointer border-0 bg-transparent px-2 text-sm font-semibold text-brand-ink disabled:cursor-default disabled:text-muted-foreground" type="button" onClick={markAllRead} disabled={unread === 0}>Mark all as read</button>
    </div>
    {!loaded && <p className="m-0 grid gap-1" role="status">Loading...</p>}
    {loaded && items.length === 0 && <p className="m-0 grid gap-1" role="status">
      <strong>No notifications yet</strong>
      <span>New lessons and review reminders will appear here.</span>
    </p>}
    {items.length > 0 && <ul className="m-0 grid list-none gap-1 p-0">
      {items.map((n) => <li key={n.id}>
        <Link className={`grid min-h-11 gap-0.5 rounded-[6px] px-3 py-2 text-inherit no-underline hover:bg-muted focus-visible:bg-muted ${n.read ? "" : "bg-primary/15"}`} to={n.link || "/home"}
          onClick={() => { markRead(n.id); onNavigate(); }}>
          <span className="!text-base font-semibold !text-foreground">{!n.read && <span className="sr-only">Unread: </span>}{n.title}</span>
          {n.body && <span>{n.body}</span>}
          <span>{timeAgo(n.createdAt)}</span>
        </Link>
      </li>)}
    </ul>}
  </section>;
}
