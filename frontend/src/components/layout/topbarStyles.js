// Class strings shared by the top bar buttons and their popover panels (timer, notifications, settings, profile).
export const iconButton = "relative inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[6px] border border-input bg-card p-0 text-foreground no-underline transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:active:scale-[0.97] [&_svg]:size-5";

// A popover host sits under its button. Under 641 px the panel spans the top bar instead, so the host stops being the anchor.
export const popoverHost = "relative max-[640px]:static";

// The floating panel itself. It opens with a short fade and scale (skipped for reduced motion).
export const popoverPanel = "absolute top-[calc(100%+0.5rem)] right-0 z-[4] rounded-[6px] border border-border bg-card shadow-md origin-top-right motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 max-[640px]:fixed max-[640px]:inset-x-4 max-[640px]:top-[68px] max-[640px]:right-4 max-[640px]:w-auto max-[640px]:origin-top";

export const quickPanel = `${popoverPanel} grid max-h-[min(80dvh,34rem)] w-[min(320px,calc(100vw-2rem))] gap-3 overflow-y-auto p-4`;

// One row in the profile menu.
export const menuItem = "block min-h-11 w-full cursor-pointer rounded-[6px] border-0 bg-transparent p-3 text-left text-inherit no-underline hover:bg-background";
