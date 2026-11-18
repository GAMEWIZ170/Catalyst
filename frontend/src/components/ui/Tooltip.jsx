import * as TooltipPrimitive from "@radix-ui/react-tooltip";

// Short hint on hover and keyboard focus (rule 8: hints go in tooltips). Never the only place a fact lives:
// touch screens do not show it. <Tooltip label="Shuffle"><button aria-label="Shuffle">..</button></Tooltip>
export default function Tooltip({ label, children, side = "top" }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className="z-[1200] max-w-64 origin-(--radix-tooltip-content-transform-origin) rounded-md bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 motion-reduce:animate-none"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
