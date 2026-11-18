import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Toaster, toast as sonner } from "sonner";

const ToastContext = createContext(null);
const KIND = { success: sonner.success, info: sonner.info, warning: sonner.warning, error: sonner.error };

// Sonner knows nothing about our data-theme attribute, so follow it here.
function useAppTheme() {
  const [theme, setTheme] = useState(() => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
  useEffect(() => {
    const watcher = new MutationObserver(() => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light"));
    watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watcher.disconnect();
  }, []);
  return theme;
}

// useToast().toast({ tone: "success", message: "Saved" }). Messages leave after 6 s or when closed.
// Pass action: { label: "Undo", onClick } for an undo button (the destructive-action rule).
export function ToastProvider({ children }) {
  const theme = useAppTheme();
  const toast = useCallback(({ tone = "info", message, action }) => {
    (KIND[tone] || sonner)(message, { duration: 6000, action });
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        theme={theme}
        position="bottom-center"
        closeButton
        offset={{ bottom: 24 }}
        mobileOffset={{ bottom: 88 }}
        toastOptions={{
          classNames: {
            toast: "!rounded-lg !border !border-border !bg-popover !font-sans !text-sm !text-popover-foreground !shadow-lg",
            actionButton: "!rounded-pill !bg-primary !font-semibold !text-primary-foreground",
            closeButton: "!border-border !bg-popover !text-popover-foreground"
          }
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
