import Button from "./Button";
import Dialog from "./Dialog";

// A small "are you sure?" dialog. `tone="danger"` makes the confirm button red.
export default function Confirm({ open, title, description, confirmLabel = "Delete", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }) {
  return <Dialog open={Boolean(open)} onClose={onCancel} title={title || ""}
    actions={<><Button variant="tertiary" onClick={onCancel}>{cancelLabel}</Button><Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button></>}>
    <p className="m-0">{description}</p>
  </Dialog>;
}
