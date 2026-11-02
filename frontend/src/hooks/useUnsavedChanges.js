import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

export default function useUnsavedChanges(isDirty) {
  const blocker = useBlocker(isDirty);

  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  return blocker;
}
