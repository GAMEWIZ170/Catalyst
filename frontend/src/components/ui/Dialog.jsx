import { useEffect, useId, useRef } from "react";

// Native <dialog>: focus is trapped, Esc closes, focus returns to the opener. A click on the backdrop closes it too.
export default function Dialog({ open, onClose, title, children, actions }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ui-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
    >
      <div className="ui-dialog-body">
        <h2 id={titleId}>{title}</h2>
        {children}
        {actions ? <div className="dialog-actions">{actions}</div> : null}
      </div>
    </dialog>
  );
}
