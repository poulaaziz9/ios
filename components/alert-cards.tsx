import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { absentServed, idleServants } from "@/lib/alerts";
import { cairoNoon, formatDate, formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";

const t = strings.alerts;

function AlertCard({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="flex items-center gap-2 font-semibold text-destructive">
        <TriangleAlert className="size-5" />
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <ul className="flex flex-col divide-y rounded-lg border bg-card px-3">{children}</ul>
    </section>
  );
}

/** Kids absent from more than two meetings in a row (admins see all, a servant their own). */
export async function AbsentAlert({ serviceId, showServant }: { serviceId: string; showServant?: boolean }) {
  const kids = await absentServed(serviceId);
  if (!kids.length) return null;
  return (
    <AlertCard title={t.absentTitle} hint={t.absentHint}>
      {kids.map((k) => (
        <li key={k.served_id} className="flex flex-col gap-0.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{k.full_name}</span>
            <span className="text-sm font-semibold text-destructive">{t.missed(k.missed)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {k.last_present ? t.lastCame(formatDate(cairoNoon(k.last_present))) : t.neverCame}
            {showServant && <> · {k.servant_name ? t.servantFor(k.servant_name) : t.noServant}</>}
          </div>
        </li>
      ))}
    </AlertCard>
  );
}

/** Servants with kids to visit and no visit logged for more than 10 days. */
export async function IdleServantsAlert({ serviceId }: { serviceId: string }) {
  const servants = await idleServants(serviceId);
  if (!servants.length) return null;
  return (
    <AlertCard title={t.idleTitle} hint={t.idleHint}>
      {servants.map((s) => (
        <li key={s.servant_id} className="flex items-center justify-between gap-2 py-2">
          <span className="font-medium">{s.full_name}</span>
          <span className="text-end text-xs text-muted-foreground">
            {s.last_visit ? t.lastVisit(formatRelative(s.last_visit)) : t.neverVisited}
            <br />
            {t.assigned(s.assigned)}
          </span>
        </li>
      ))}
    </AlertCard>
  );
}
