import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type LogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  textClassName?: string;
  className?: string;
};

const sizeMap = {
  sm: 22,
  md: 30,
  lg: 38,
} as const;

export function Logo({
  href,
  size = "md",
  showText = true,
  textClassName,
  className,
}: LogoProps) {
  const iconSize = sizeMap[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt="MyFlix logo"
        width={iconSize}
        height={iconSize}
        className="rounded-md"
        priority
      />
      {showText ? (
        <span
          className={cn(
            "font-bold tracking-tight text-slate-900 dark:text-white",
            size === "sm" ? "text-base" : size === "md" ? "text-xl" : "text-2xl",
            textClassName,
          )}
        >
          MyFlix
        </span>
      ) : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
