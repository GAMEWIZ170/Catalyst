import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Drawer } from "@astryxdesign/core/Drawer";
import { IconButton } from "@astryxdesign/core/IconButton";
import Companion from "../learn/Companion";

// The study companion as a floating chat button that opens a side panel. It sits above the phone tab bar.
export default function CompanionDrawer({ kind, id }) {
  const [open, setOpen] = useState(false);
  return <>
    <div className="companion-fab">
      <IconButton label="Ask the study companion" tooltip="Ask the study companion" variant="primary" size="lg" elevation="med" icon={<MessageCircle size={22} aria-hidden="true" />} onClick={() => setOpen(true)} />
    </div>
    <Drawer isOpen={open} onOpenChange={setOpen} label="Study companion" width={420} padding={4}>
      <Companion kind={kind} id={id} embedded />
    </Drawer>
  </>;
}
