import { strings } from "@/lib/strings";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-bold">{strings.offline.title}</h1>
      <p className="text-muted-foreground">{strings.offline.body}</p>
      {/* Full reload on purpose: client navigation would just hit the offline cache. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="font-medium text-primary">
        {strings.offline.retry}
      </a>
    </main>
  );
}
