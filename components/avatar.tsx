/* eslint-disable @next/next/no-img-element -- short-lived signed URLs; next/image would cache them */
import { cn } from "@/lib/utils";

/** Round avatar from a signed URL, or the name's first letter. */
export function Avatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-semibold text-secondary-foreground",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        (name.trim()[0] ?? "؟")
      )}
    </span>
  );
}
