import { Button, Dialog } from "../ui";

// A small "are you sure?" dialog. It no longer needs Astryx (the file name stays until its callers are ported).
// `tone="danger"` makes the confirm button red.
export default function ConfirmAstryx({ open, title, description, confirmLabel = "Delete", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }) {
  return <Dialog open={Boolean(open)} onClose={onCancel} title={title || ""}
    actions={<><Button variant="tertiary" onClick={onCancel}>{cancelLabel}</Button><Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button></>}>
    <p className="m-0">{description}</p>
  </Dialog>;
}
