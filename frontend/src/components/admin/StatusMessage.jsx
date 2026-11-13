import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function StatusMessage({ message, error = false }) {
  if (!message) return null;
  const Icon = error ? AlertCircle : CheckCircle2;
  return <p className={`status-message ${error ? "status-message--error" : ""}`} aria-live="polite"><Icon size={16} aria-hidden="true" />{message}</p>;
}
