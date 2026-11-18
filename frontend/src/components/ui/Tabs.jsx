import { useId } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";

// Tabs (Radix: arrow keys, Home and End, roving focus). The active underline slides between tabs.
// tabs: [{ id, label, panel }]. Controlled: value + onChange. The row scrolls sideways instead of wrapping.
export default function Tabs({ tabs, value, onChange, label }) {
  const group = useId();
  return (
    <TabsPrimitive.Root value={value} onValueChange={onChange}>
      <TabsPrimitive.List aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.id}
            value={tab.id}
            className="relative min-h-11 shrink-0 cursor-pointer border-0 bg-transparent px-4 font-sans text-sm font-semibold whitespace-nowrap text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring data-[state=active]:text-foreground"
          >
            {tab.label}
            {value === tab.id ? (
              <motion.span layoutId={`${group}-underline`} className="absolute inset-x-3 -bottom-px h-0.5 rounded-pill bg-primary" transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} />
            ) : null}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content key={tab.id} value={tab.id} className="pt-4 focus-visible:outline-2 focus-visible:outline-ring">
          {tab.panel}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
