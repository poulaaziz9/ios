import { Phone } from "lucide-react";

import { Avatar } from "@/components/avatar";
import { VisitForm } from "@/components/visit-form";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/auth/identifier";
import { cairoToday, formatRelative, isOlderThan } from "@/lib/format";
import { signedUrls } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { logVisit } from "../actions";

const t = strings.servant;
const OVERDUE_DAYS = 14;
const isOverdue = (lastVisit: string | null) => isOlderThan(lastVisit, OVERDUE_DAYS);

export default async function MyServedPage({ params }: PageProps<"/s/[serviceId]/servant/served">) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const { data: assigned } = await supabase.rpc("my_assigned", { p_service: serviceId });
  const avatars = await signedUrls("avatars", (assigned ?? []).map((a) => a.avatar_url));
  const today = cairoToday();

  if (!assigned?.length) {
    return <p className="text-sm text-muted-foreground">{t.noAssigned}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {assigned.map((a) => {
        const overdue = isOverdue(a.last_visit_at);
        return (
          <li key={a.served_id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar url={a.avatar_url ? avatars.get(a.avatar_url) : null} name={a.full_name} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{a.full_name}</div>
                <div className={cn("text-sm", overdue ? "text-destructive" : "text-muted-foreground")}>
                  {a.last_visit_at
                    ? `${t.lastVisit(formatRelative(a.last_visit_at))} · ${strings.manage.visitTypes[a.last_visit_type!]}`
                    : t.neverVisited}
                  {a.class_name && <span className="text-muted-foreground"> · {a.class_name}</span>}
                </div>
              </div>
              {a.phone && (
                <Button asChild variant="outline" size="icon" aria-label={`${t.call} ${formatPhone(a.phone)}`}>
                  <a href={`tel:${a.phone}`}>
                    <Phone />
                  </a>
                </Button>
              )}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-primary">{t.logVisit}</summary>
              <VisitForm action={logVisit.bind(null, serviceId, a.served_id)} today={today} />
            </details>
          </li>
        );
      })}
    </ul>
  );
}
