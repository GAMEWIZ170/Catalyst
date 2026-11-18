import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// shadcn/ui helper: join class names and let the last Tailwind utility win.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
