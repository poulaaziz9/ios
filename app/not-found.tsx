import Link from "next/link";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="text-6xl font-bold text-muted-foreground">٤٠٤</div>
      <h1 className="text-2xl font-bold">{strings.errors.notFoundTitle}</h1>
      <p className="text-muted-foreground">{strings.errors.notFoundBody}</p>
      <Button asChild>
        <Link href="/?pick=1">{strings.errors.home}</Link>
      </Button>
    </main>
  );
}
