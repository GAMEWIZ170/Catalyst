import { Check, ChevronDown } from "lucide-react";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

// Choose one from a list without a native select (rule 3). A pill button shows the choice and opens a menu.
// options: [{ value, label }]. An empty `value` shows the placeholder. `clearLabel` adds a first item that sets value "".
export default function Picker({ value, onChange, options, label, placeholder = "Choose", clearLabel, className, disabled }) {
  const current = options.find((option) => option.value === value);
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        disabled={disabled}
        aria-label={`${label}: ${current ? current.label : placeholder}`}
        className={cn("inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-pill border border-input bg-card px-4 font-sans text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50", !current && "text-muted-foreground", className)}
      >
        <span className="min-w-0 truncate">{current ? current.label : placeholder}</span>
        <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[1100] max-h-72 min-w-56 max-w-[calc(100vw-1.5rem)] origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none dark:shadow-none"
        >
          {[...(clearLabel ? [{ value: "", label: clearLabel }] : []), ...options].map((option) => (
            <MenuPrimitive.Item
              key={option.value || "none"}
              onSelect={() => onChange(option.value)}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-semibold outline-none select-none data-[highlighted]:bg-muted"
            >
              <span className="min-w-0 flex-1">{option.label}</span>
              {option.value === value ? <Check size={16} aria-hidden="true" /> : null}
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
