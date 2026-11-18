import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

// The "..." menu. Destructive actions live here (rule 5), each followed by an undo toast or a confirm dialog.
// <DropdownMenu trigger={<button aria-label="More">..</button>} items={[{ label, icon, onSelect, danger, disabled }]} />
// A `{ separator: true }` item draws a divider.
export default function DropdownMenu({ trigger, items, align = "end", className }) {
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger asChild>{trigger}</MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            "z-[1100] min-w-48 max-w-[calc(100vw-1.5rem)] origin-(--radix-dropdown-menu-content-transform-origin) rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none dark:shadow-none",
            className
          )}
        >
          {items.map((item, index) => item.separator ? (
            <MenuPrimitive.Separator key={`sep-${index}`} className="my-1 h-px bg-border" />
          ) : (
            <MenuPrimitive.Item
              key={item.label}
              disabled={item.disabled}
              onSelect={item.onSelect}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-semibold outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted",
                item.danger && "text-destructive"
              )}
            >
              {item.icon ? <item.icon size={16} aria-hidden="true" /> : null}
              {item.label}
            </MenuPrimitive.Item>
          ))}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}
