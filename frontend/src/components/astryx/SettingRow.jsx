import { useCallback, useEffect, useRef, useState } from "react";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

// One setting: the label and one line of help on the left, the control on the right (interaction rules 2, 3 and 8).
export default function SettingRow({ label, help, children }) {
  return <HStack gap={4} justify="between" align="center" wrap="wrap" paddingBlock={3}>
    <VStack gap={0} style={{ flex: "1 1 14rem", minWidth: 0 }}>
      <Text weight="semibold">{label}</Text>
      {help && <Text type="supporting" color="secondary">{help}</Text>}
    </VStack>
    <div style={{ flex: "0 1 auto" }}>{children}</div>
  </HStack>;
}

// Autosave state for a page: run(action) shows "Saving…", then "Saved" for a moment, or the error. There are no Save buttons.
export function useAutosave() {
  const [status, setStatus] = useState("");
  const timer = useRef(null);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const run = useCallback(async (action) => {
    window.clearTimeout(timer.current);
    setStatus("Saving…");
    try {
      await action();
      setStatus("Saved");
      timer.current = window.setTimeout(() => setStatus(""), 2500);
      return true;
    } catch (error) {
      setStatus(error.message || "Not saved");
      return false;
    }
  }, []);
  return { status, run };
}

// The small muted save state shown in a page header.
export function SaveState({ status }) {
  return <Text type="supporting" color="secondary" role="status" aria-live="polite">{status}</Text>;
}
