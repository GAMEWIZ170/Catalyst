import { useId, useRef, useState } from "react";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

// One-file drop zone. Click, press Enter or Space, or drop a file. The file input is the real control (keyboard and
// screen readers use it); the box is its label. `accept` and `maxSize` (bytes) are checked here, and a problem is
// reported through onError so the caller shows it where it shows other errors.
export default function FileDrop({ value, onChange, accept, maxSize, label, hint, onError, className }) {
  const id = useId();
  const input = useRef(null);
  const [over, setOver] = useState(false);

  function take(file) {
    if (!file) return;
    // `accept` is a list like "application/pdf" or ".csv,text/csv": a token with a dot is a file extension, others are media types.
    const allowed = accept ? accept.split(",").map((token) => token.trim().toLowerCase()) : [];
    const fits = !allowed.length || allowed.some((token) => (token.startsWith(".") ? file.name.toLowerCase().endsWith(token) : file.type.toLowerCase().match(new RegExp(`^${token.replace("*", ".*")}$`))));
    if (!fits) { onError?.("That file type is not supported."); return; }
    if (maxSize && file.size > maxSize) { onError?.(`That file is too big. The limit is ${Math.round(maxSize / 1024 / 1024)} MB.`); return; }
    onError?.("");
    onChange(file);
  }

  if (value) {
    return (
      <div className={cn("flex min-h-14 items-center gap-3 rounded-lg border border-input bg-card px-4", className)}>
        <FileText size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-semibold">{value.name}</span>
        <button type="button" aria-label={`Remove ${value.name}`} onClick={() => { onChange(null); if (input.current) input.current.value = ""; }} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-pill border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"><X size={18} aria-hidden="true" /></button>
      </div>
    );
  }
  return (
    <div className={className}>
      <label
        htmlFor={id}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); take(event.dataTransfer.files?.[0]); }}
        className={cn("grid min-h-32 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-input bg-card p-6 text-center text-muted-foreground transition-colors duration-150 hover:bg-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring", over && "border-foreground bg-muted")}
      >
        <span className="font-semibold text-foreground">{label}</span>
        {hint ? <span className="text-sm">{hint}</span> : null}
        <input ref={input} id={id} type="file" accept={accept} className="sr-only" onChange={(event) => take(event.target.files?.[0])} />
      </label>
    </div>
  );
}
