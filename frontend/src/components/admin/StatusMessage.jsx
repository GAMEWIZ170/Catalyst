import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function StatusMessage({ message, error = false }) {
  if (!message) return null;
  const Icon = error ? AlertCircle : CheckCircle2;
  return <p className={`m-0 flex min-h-[1.4em] items-center gap-2 ${error ? "text-destructive" : "text-success"}`} aria-live="polite"><Icon size={16} aria-hidden="true" />{message}</p>;
}
