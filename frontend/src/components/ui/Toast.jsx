import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from "lucide-react";

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, info: Info, warning: TriangleAlert, error: XCircle };

// useToast().toast({ tone: "success", message: "Saved" }). Messages leave after 6 s or when closed.
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setItems((list) => list.filter((item) => item.id !== id)), []);
  const toast = useCallback(({ tone = "info", message }) => {
    const id = nextId.current++;
    setItems((list) => [...list, { id, tone, message }]);
    window.setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toasts" role="status" aria-live="polite">
        {items.map((item) => {
          const Icon = ICONS[item.tone] || Info;
          return (
            <div key={item.id} className={`ui-toast ui-toast--${item.tone}`}>
              <Icon size={20} aria-hidden="true" />
              <p>{item.message}</p>
              <button type="button" className="ui-toast-close" aria-label="Dismiss message" onClick={() => dismiss(item.id)}><X size={16} aria-hidden="true" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
