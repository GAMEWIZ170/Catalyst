import { Button, Dialog } from "../ui";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Delete", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }) {
  return <Dialog
    open={open}
    onClose={onCancel}
    title={title}
    actions={<>
      <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
      <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
    </>}
  >
    <p>{description}</p>
  </Dialog>;
}
