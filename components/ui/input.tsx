import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-stone-300 bg-white/85 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";
