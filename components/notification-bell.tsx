import { Bell } from "lucide-react";
import Link from "next/link";

import { CountBadge } from "@/components/count-badge";
import { requireUserId } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";

/** 🔔 in the header, with the number of unread notifications. */
export async function NotificationBell() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return (
    <Link
      href="/notifications"
      aria-label={strings.notifications.open}
      className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
    >
      <Bell className="size-6" />
      {!!count && <CountBadge count={count} className="absolute -end-1 -top-1" />}
    </Link>
  );
}
