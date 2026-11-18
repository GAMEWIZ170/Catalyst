import { useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Modal dialog (Radix): focus is trapped, Esc and a click outside close it, focus returns to the opener.
// It scales and fades in (200 ms, ease-out). Same props as before: open, onClose, title, children, actions.
export default function Dialog({ open, onClose, title, children, actions, className }) {
  // Controlled dialogs have no Radix Trigger, so remember the opener ourselves and give focus back on close.
  const opener = useRef(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-foreground/40 dark:bg-background/75 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => { opener.current = document.activeElement; }}
          onCloseAutoFocus={(event) => { event.preventDefault(); opener.current?.focus?.(); }}
          className={cn(
            "fixed top-1/2 left-1/2 z-[1001] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none dark:shadow-none",
            className
          )}
        >
          <DialogPrimitive.Title className="m-0 pr-10 text-xl font-semibold leading-snug">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close aria-label="Close" className="absolute top-3 right-3 inline-flex size-11 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <X size={18} aria-hidden="true" />
          </DialogPrimitive.Close>
          <div className="mt-3">{children}</div>
          {actions ? <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
