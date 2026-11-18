import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

// Floating panel anchored to its trigger. It scales and fades from the trigger (150 ms, ease-out).
// <Popover trigger={<button>..</button>}>content</Popover>
export function PopoverContent({ className, align = "end", sideOffset = 8, ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "z-[1100] w-72 max-w-[calc(100vw-1.5rem)] origin-(--radix-popover-content-transform-origin) rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg duration-150 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none dark:shadow-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export default function Popover({ trigger, children, className, align, open, onOpenChange }) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverContent className={className} align={align}>{children}</PopoverContent>
    </PopoverPrimitive.Root>
  );
}
