export default function StatusMessage({ message, error = false }) {
  if (!message) return null;
  return <p className={`status-message ${error ? "status-message--error" : ""}`} aria-live="polite">{message}</p>;
}
