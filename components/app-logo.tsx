import Image from "next/image";

import { cn } from "@/lib/utils";

/** The app icon (same artwork as the PWA icon), shown next to the app name. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt=""
      width={192}
      height={192}
      priority
      className={cn("size-7 shrink-0 rounded-[22%]", className)}
    />
  );
}
