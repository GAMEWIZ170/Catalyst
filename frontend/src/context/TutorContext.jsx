import { createContext, useContext, useEffect, useMemo, useState } from "react";

// The tutor panel in the shell belongs to whatever the student is studying. A page says what that is
// (a study set or a lesson) with useTutorTarget; the shell shows the panel only when a page has done so.
const TutorContext = createContext({ target: null, setTarget: () => {}, open: false, setOpen: () => {} });

export function TutorProvider({ children }) {
  const [target, setTarget] = useState(null);
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ target, setTarget, open, setOpen }), [target, open]);
  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export const useTutor = () => useContext(TutorContext);

// Call from a page: useTutorTarget("set", id). The panel closes and the target clears when the page goes away.
export function useTutorTarget(kind, id) {
  const { setTarget, setOpen } = useTutor();
  useEffect(() => {
    if (!kind || !id) return undefined;
    setTarget({ kind, id });
    return () => { setTarget(null); setOpen(false); };
  }, [kind, id, setTarget, setOpen]);
}
