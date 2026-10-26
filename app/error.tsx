"use client";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold">{strings.errors.errorTitle}</h1>
      <p className="text-muted-foreground">{strings.errors.errorBody}</p>
      <Button onClick={reset}>{strings.errors.retry}</Button>
    </main>
  );
}
