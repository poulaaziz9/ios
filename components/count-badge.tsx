import { cn } from "@/lib/utils";

/** Red notification pill with a count (e.g. pending gift requests). */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] leading-none font-bold text-white",
        className,
      )}
    >
      {count > 99 ? "+٩٩" : count.toLocaleString("ar-EG")}
    </span>
  );
}
