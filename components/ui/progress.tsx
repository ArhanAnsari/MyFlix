import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
};

export function Progress({ value, className }: ProgressProps) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-stone-300", className)}>
      <div
        className="h-full rounded-full bg-linear-to-r from-orange-600 to-amber-400 transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}
