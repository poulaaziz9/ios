import { Bell } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PushToggle } from "@/components/push-toggle";
import { Badge } from "@/components/ui/badge";
import { requireUserId } from "@/lib/auth/session";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const t = strings.notifications;

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: pushKey } = await supabase.rpc("vapid_public_key");
  const { data: items } = await supabase
    .from("notifications")
    .select("id, title, body, url, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  // Opening the inbox marks everything read; this render still shows what was new.
  if (items?.some((n) => !n.read_at)) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-6">
      <PageHeader title={t.title} backHref="/" />
      <PushToggle publicKey={pushKey} />
      {!items?.length ? (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => {
            const card = (
              <div
                className={cn(
                  "flex gap-3 rounded-xl border bg-card p-4 shadow-sm",
                  !n.read_at && "border-primary/40 bg-primary/5",
                )}
              >
                <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold">{n.title}</span>
                    {!n.read_at && <Badge>{t.newBadge}</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-line">{n.body}</p>
                  <span className="text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {n.url ? (
                  <Link href={n.url} className="block hover:opacity-90">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
