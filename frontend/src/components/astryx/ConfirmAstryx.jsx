import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

// A small "are you sure?" dialog. Must be rendered inside AstryxTheme. `tone="danger"` makes the confirm button red.
export default function ConfirmAstryx({ open, title, description, confirmLabel = "Delete", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }) {
  const close = (isOpen) => { if (!isOpen) onCancel(); };
  return <Dialog isOpen={Boolean(open)} onOpenChange={close} width={420}>
    <DialogHeader title={title || ""} onOpenChange={close} />
    <VStack gap={4} padding={4}>
      <Text>{description}</Text>
      <HStack gap={2} justify="end">
        <Button label={cancelLabel} variant="ghost" onClick={onCancel} />
        <Button label={confirmLabel} variant={tone === "danger" ? "destructive" : "primary"} onClick={onConfirm} />
      </HStack>
    </VStack>
  </Dialog>;
}
