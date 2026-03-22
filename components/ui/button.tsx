import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "danger" | "ghost";
  size?: "default" | "sm" | "lg";
};

const variantClassMap: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-cyan-500 text-zinc-900 hover:bg-cyan-400",
  outline: "border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
  danger: "bg-red-500 text-white hover:bg-red-400",
  ghost: "text-zinc-100 hover:bg-zinc-800",
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
        "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:pointer-events-none disabled:opacity-60",
        variantClassMap[variant],
        sizeClassMap[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
