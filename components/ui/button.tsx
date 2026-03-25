import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "danger" | "ghost";
  size?: "default" | "sm" | "lg";
};

const variantClassMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "border border-amber-700/10 bg-orange-600 text-amber-50 shadow-[0_10px_20px_-12px_rgba(154,52,18,0.9)] hover:-translate-y-0.5 hover:bg-orange-500",
  outline:
    "border border-stone-400/80 bg-stone-50 text-slate-800 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-white",
  danger:
    "border border-red-700/30 bg-red-600 text-red-50 shadow-[0_12px_24px_-14px_rgba(127,29,29,0.9)] hover:-translate-y-0.5 hover:bg-red-500",
  ghost: "text-slate-700 hover:bg-orange-100/60",
};

const sizeClassMap: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-sm",
  lg: "h-11 px-6",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 disabled:pointer-events-none disabled:opacity-60",
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
