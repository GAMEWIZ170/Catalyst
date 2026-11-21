import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Day keys are "YYYY-MM-DD" strings in the student's time zone (the server sends them that way), so all date maths here
// works on UTC dates built from the key. That way daylight saving can never skip or repeat a day.
const toDate = (key) => new Date(`${key}T00:00:00Z`);
const toKey = (date) => date.toISOString().slice(0, 10);
const shift = (key, days) => { const date = toDate(key); date.setUTCDate(date.getUTCDate() + days); return toKey(date); };
const mondayOf = (key) => shift(key, -((toDate(key).getUTCDay() + 6) % 7));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const HEAT = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"];
// How many activities make each shade. Fixed, so a colour means the same thing every week.
const shade = (count) => (count >= 12 ? 4 : count >= 6 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0);
const longDate = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const activities = (n) => `${n} ${n === 1 ? "activity" : "activities"}`;

// One year of study activity, Monday to Sunday rows, like a contributions graph. Darker gold = more done that day.
// Laptops fit the whole year. On a phone the weeks keep a readable size and the graph swipes sideways, opening on the latest week.
export default function ActivityHeatmap({ year, firstYear, today, days, loading, onYear }) {
  const scroller = useRef(null);
  const box = useRef(null);
  const [tip, setTip] = useState(null);
  const thisYear = Number(today.slice(0, 4));

  const { weeks, months, total, busiest } = useMemo(() => {
    const first = `${year}-01-01`;
    const last = `${year}-12-31`;
    const list = [];
    for (let monday = mondayOf(first); monday <= last; monday = shift(monday, 7)) {
      list.push(Array.from({ length: 7 }, (_, i) => {
        const key = shift(monday, i);
        return { key, inYear: key >= first && key <= last, future: key > today, count: days[key] || 0 };
      }));
    }
    // A month's label sits over the week that holds its 1st, unless it would crowd the label before it.
    const labels = [];
    list.forEach((week, column) => {
      const firstOfMonth = week.find((day) => day.inYear && day.key.endsWith("-01"));
      if (!firstOfMonth) return;
      if (labels.length && column - labels[labels.length - 1].column < 3) labels.pop();
      labels.push({ column, name: MONTHS[Number(firstOfMonth.key.slice(5, 7)) - 1] });
    });
    const entries = Object.entries(days);
    const top = entries.reduce((best, entry) => (entry[1] > (best?.[1] || 0) ? entry : best), null);
    return { weeks: list, months: labels, total: entries.length, busiest: top };
  }, [year, today, days]);

  // Open on the latest week on a phone, where the graph is wider than the screen.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollLeft = year === thisYear ? node.scrollWidth : 0;
  }, [year, thisYear, weeks.length]);

  const showTip = (event) => {
    const cell = event.target.closest("[data-day]");
    if (!cell || !box.current) return setTip(null);
    const area = box.current.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    const count = Number(cell.dataset.count);
    setTip({
      text: `${count ? activities(count) : "No activity"} · ${longDate.format(toDate(cell.dataset.day))}`,
      left: rect.left - area.left + rect.width / 2,
      top: rect.top - area.top
    });
  };

  const summary = total
    ? `${total} active ${total === 1 ? "day" : "days"} in ${year}${busiest ? `. Busiest: ${shortDate.format(toDate(busiest[0]))}, with ${activities(busiest[1])}.` : "."}`
    : year === thisYear ? "Study a lesson, a quiz or some flashcards and today lights up." : `No activity in ${year}.`;
  const arrow = "grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-ring";

  return <section className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="activity-title">
    <div className="flex items-center justify-between gap-3">
      <h2 id="activity-title" className="m-0 text-lg font-semibold">Activity</h2>
      <div className="flex items-center gap-1">
        <button type="button" className={arrow} aria-label="Previous year" disabled={year <= firstYear || loading} onClick={() => onYear(year - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
        <span className="min-w-12 text-center font-semibold tabular-nums" aria-live="polite">{year}</span>
        <button type="button" className={arrow} aria-label="Next year" disabled={year >= thisYear || loading} onClick={() => onYear(year + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
    </div>
    <p className="m-0 text-sm text-muted-foreground">{summary}</p>

    <div ref={box} className={cn("relative transition-opacity", loading && "opacity-50")} onMouseOver={showTip} onClick={showTip} onMouseLeave={() => setTip(null)} aria-hidden="true">
      <div className="flex gap-2">
        {/* Weekday labels: Mon, Wed and Fri, like the reference. */}
        <div className="grid shrink-0 grid-rows-[1rem_repeat(7,minmax(0,1fr))] gap-[3px] text-[0.625rem] leading-none text-muted-foreground">
          <span />
          {["Mon", "", "Wed", "", "Fri", "", ""].map((label, i) => <span key={i} className="flex items-center">{label}</span>)}
        </div>
        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Cells: at least 12 px on phones (easy to tap, the year swipes), 9 px from 768 px up so a whole year fits a laptop. */}
          <div className="grid gap-[3px] [--cell:12px] md:[--cell:9px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(var(--cell), 1fr))`, gridTemplateRows: "1rem repeat(7, auto)" }}>
            {months.map((month) => <span key={month.name} className="text-[0.625rem] leading-none whitespace-nowrap text-muted-foreground" style={{ gridColumn: `${month.column + 1} / span 3`, gridRow: 1 }}>{month.name}</span>)}
            {weeks.map((week, column) => week.map((day, row) => <span
              key={day.key}
              data-day={day.inYear && !day.future ? day.key : undefined}
              data-count={day.count}
              className={cn("aspect-square rounded-[3px]", day.inYear && !day.future ? HEAT[shade(day.count)] : "invisible", day.key === today && "ring-1 ring-foreground/70")}
              style={{ gridColumn: column + 1, gridRow: row + 2 }}
            />))}
          </div>
        </div>
      </div>
      {tip && <span className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow-md" style={{ left: tip.left, top: tip.top - 6 }}>{tip.text}</span>}
    </div>

    <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground" aria-hidden="true">
      <span className="mr-0.5">Less</span>
      {HEAT.map((color) => <span key={color} className={cn("size-[11px] rounded-[3px]", color)} />)}
      <span className="ml-0.5">More</span>
    </div>
  </section>;
}
