import { useEffect, useRef } from "react";

export default function ConfirmDialog({ open, title, description, confirmLabel = "Delete", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function close() {
    onCancel();
  }

  return <dialog ref={dialogRef} className="confirm-dialog" onCancel={(event) => { event.preventDefault(); close(); }}>
    <form method="dialog" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="dialog-actions">
        <button className="button button-secondary" type="button" onClick={close}>{cancelLabel}</button>
        <button className={`button ${tone === "danger" ? "button-danger" : "button-primary"}`} type="submit">{confirmLabel}</button>
      </div>
    </form>
  </dialog>;
}
