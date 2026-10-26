import Link from "next/link";

import { cn } from "@/lib/utils";

/** Small link-based toggle (state lives in the URL). */
export function Segmented({
  options,
  value,
}: {
  options: { value: string; label: string; href: string }[];
  value: string;
}) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-1 text-sm">
      {options.map((o) => (
        <Link
          key={o.value}
          href={o.href}
          scroll={false}
          aria-current={o.value === value ? "true" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 font-medium text-muted-foreground",
            o.value === value && "bg-background text-foreground shadow-sm",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
